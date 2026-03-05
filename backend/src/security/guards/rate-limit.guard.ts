import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SECURITY_METADATA, SecurityEventType, RiskLevel } from '../constants/security.constants';
import { RateLimitService } from '../services/rate-limit.service';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private rateLimitService: RateLimitService,
    private auditLogService: AuditLogService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip for Public Seller API routes (they have their own rate limiting)
    const path = request.path || request.url?.split('?')[0] || '';
    if (path.startsWith('/api/v1/')) {
      return true;
    }

    const ip = this.getClientIp(request);

    // Skip rate limiting for localhost/internal requests (SSR from Next.js)
    // These are server-side requests that should not be rate limited
    if (this.isLocalhostIp(ip)) {
      return true;
    }

    const userAgent = request.headers['user-agent'] || '';
    const endpoint = request.path;
    const userId = request.user?.sub;

    // 1. Check if IP is blocked
    if (await this.rateLimitService.isIpBlocked(ip)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Your IP has been temporarily blocked',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Get rate limit config (custom or default)
    const customRateLimit = this.reflector.getAllAndOverride<{ limit: number; window: number }>(
      SECURITY_METADATA.RATE_LIMIT,
      [context.getHandler(), context.getClass()],
    );

    const config = customRateLimit || this.rateLimitService.getRateLimitConfig(endpoint);

    // 3. Generate rate limit key
    const key = this.rateLimitService.getRateLimitKey(ip, userId, endpoint);

    // 4. Check rate limit
    const result = await this.rateLimitService.checkRateLimit(
      key,
      config.limit,
      config.window,
    );

    // 5. Set rate limit headers
    const headers = this.rateLimitService.getRateLimitHeaders(
      config.limit,
      result.remaining,
      result.resetAt,
    );

    for (const [header, value] of Object.entries(headers)) {
      response.setHeader(header, value);
    }

    // 6. Handle rate limit exceeded
    if (!result.allowed) {
      // Track suspicious activity
      const suspiciousCount = await this.rateLimitService.trackSuspiciousActivity(ip);

      // Log the event
      await this.auditLogService.logSecurityIncident(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        ip,
        userAgent,
        endpoint,
        suspiciousCount >= 5 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
        {
          userId,
          limit: config.limit,
          window: config.window,
          suspiciousCount,
        },
      );

      // Progressive blocking
      if (suspiciousCount >= 5) {
        const blockDuration = Math.min(300 * suspiciousCount, 3600); // Max 1 hour
        await this.rateLimitService.blockIp(ip, blockDuration, 'Repeated rate limit violations');
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          error: 'Too Many Requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * List of trusted proxy IP ranges
   * Only these IPs are trusted to forward the real client IP
   */
  private readonly trustedProxies = [
    '127.0.0.1',      // localhost IPv4
    '::1',            // localhost IPv6
    '::ffff:127.0.0.1', // localhost mapped IPv6
    '10.',            // Private network (prefix)
    '172.16.',        // Private network (prefix)
    '172.17.',        // Docker default (prefix)
    '172.18.',        // Docker network (prefix)
    '192.168.',       // Private network (prefix)
  ];

  /**
   * List of localhost IPs that should bypass rate limiting
   * These are internal requests from SSR (Next.js server-side rendering)
   */
  private readonly localhostIps = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'localhost',
  ];

  /**
   * Check if the IP is localhost (internal request)
   */
  private isLocalhostIp(ip: string): boolean {
    if (!ip) return false;
    return this.localhostIps.includes(ip) || ip.startsWith('127.') || ip === '::1';
  }

  /**
   * Cloudflare IP ranges (update periodically from https://www.cloudflare.com/ips/)
   */
  private readonly cloudflareIpPrefixes = [
    '103.21.244.', '103.22.200.', '103.31.4.', '104.16.', '104.17.',
    '104.18.', '104.19.', '104.20.', '104.21.', '104.22.', '104.23.',
    '104.24.', '104.25.', '104.26.', '104.27.', '108.162.', '131.0.72.',
    '141.101.', '162.158.', '172.64.', '172.65.', '172.66.', '172.67.',
    '173.245.', '188.114.', '190.93.', '197.234.', '198.41.',
  ];

  /**
   * Check if IP is from a trusted proxy
   */
  private isTrustedProxy(ip: string): boolean {
    if (!ip) return false;

    // Check trusted internal proxies
    for (const proxy of this.trustedProxies) {
      if (ip.startsWith(proxy) || ip === proxy) {
        return true;
      }
    }

    // Check Cloudflare IPs
    for (const prefix of this.cloudflareIpPrefixes) {
      if (ip.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get client IP address with trusted proxy validation
   * Only trusts X-Forwarded-For if request comes from known proxy
   */
  private getClientIp(request: any): string {
    const socketIp =
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown';

    // Clean up IPv6-mapped IPv4 addresses
    const cleanSocketIp = socketIp.replace('::ffff:', '');

    // Only trust forwarded headers if from trusted proxy
    if (this.isTrustedProxy(cleanSocketIp) || this.isTrustedProxy(socketIp)) {
      // Priority: Cloudflare > X-Real-IP > X-Forwarded-For
      const cfIp = request.headers['cf-connecting-ip'];
      if (cfIp) return cfIp;

      const realIp = request.headers['x-real-ip'];
      if (realIp) return realIp;

      const forwardedFor = request.headers['x-forwarded-for'];
      if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
      }
    }

    // Not from trusted proxy, use socket IP (prevents spoofing)
    return cleanSocketIp || 'unknown';
  }
}
