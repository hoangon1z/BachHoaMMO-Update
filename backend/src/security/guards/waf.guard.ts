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
import { WafService } from '../services/waf.service';
import { RateLimitService } from '../services/rate-limit.service';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class WafGuard implements CanActivate {
  private readonly logger = new Logger(WafGuard.name);

  constructor(
    private reflector: Reflector,
    private wafService: WafService,
    private rateLimitService: RateLimitService,
    private auditLogService: AuditLogService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if WAF is skipped for this endpoint
    const skipWaf = this.reflector.getAllAndOverride<boolean>(
      SECURITY_METADATA.SKIP_WAF,
      [context.getHandler(), context.getClass()],
    );

    if (skipWaf) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Skip WAF for Public Seller API routes (they have their own security)
    const path = request.path || request.url?.split('?')[0] || '';
    if (path.startsWith('/api/v1/')) {
      return true;
    }

    // Skip WAF for inventory upload endpoints (account data may contain special chars)
    // These endpoints contain sensitive account data like cookies, tokens, passwords
    // which would trigger false positives in WAF pattern matching
    if (path.includes('/inventory') && request.method === 'POST') {
      this.logger.debug(`WAF skipped for inventory upload: ${path}`);
      return true;
    }

    // Skip WAF for blog endpoints (blog content contains HTML/rich text that triggers false positives)
    if (path.startsWith('/blog')) {
      this.logger.debug(`WAF skipped for blog: ${path}`);
      return true;
    }

    const ip = this.getClientIp(request);

    // Skip WAF for localhost/internal requests (SSR from Next.js)
    // These are trusted server-side requests
    if (this.isLocalhostIp(ip)) {
      return true;
    }

    const userAgent = request.headers['user-agent'] || '';

    // 1. Check if IP is already blocked
    if (await this.rateLimitService.isIpBlocked(ip)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Access denied',
          error: 'Forbidden',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // 2. Analyze request through WAF
    const wafResult = await this.wafService.analyzeRequest(
      request.method,
      request.originalUrl || request.url,
      this.normalizeHeaders(request.headers),
      request.body,
      ip,
    );

    // 3. Handle blocked request
    if (wafResult.blocked) {
      // Log security incident
      await this.auditLogService.logSecurityIncident(
        SecurityEventType.WAF_BLOCKED,
        ip,
        userAgent,
        request.path,
        wafResult.riskLevel,
        {
          reason: wafResult.reason,
          threats: wafResult.threats,
          method: request.method,
          url: request.originalUrl?.substring(0, 200),
        },
      );

      // Track suspicious activity
      const suspiciousCount = await this.rateLimitService.trackSuspiciousActivity(ip);

      // Progressive blocking for repeat offenders
      if (suspiciousCount >= 3) {
        const blockDuration = Math.min(600 * suspiciousCount, 86400); // Max 24 hours
        await this.rateLimitService.blockIp(
          ip,
          blockDuration,
          `WAF violations: ${wafResult.threats.join(', ')}`,
        );
      }

      this.logger.warn(`WAF blocked request from ${ip}: ${wafResult.reason}`);

      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Request blocked by security policy',
          error: 'Forbidden',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // 4. Log high-risk requests (but don't block)
    if (wafResult.riskLevel === RiskLevel.HIGH) {
      await this.auditLogService.logSecurityIncident(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        ip,
        userAgent,
        request.path,
        RiskLevel.MEDIUM,
        {
          threats: wafResult.threats,
          note: 'High risk but not blocked',
        },
      );
    }

    // 5. Sanitize request body if present
    if (request.body && typeof request.body === 'object') {
      request.body = this.sanitizeBody(request.body);
    }

    // 6. Add security context to request
    request.wafContext = {
      riskLevel: wafResult.riskLevel,
      threats: wafResult.threats,
      scanned: true,
    };

    return true;
  }


  /**
   * List of trusted proxy IP ranges
   */
  private readonly trustedProxies = [
    '127.0.0.1', '::1', '::ffff:127.0.0.1',
    '10.', '172.16.', '172.17.', '172.18.', '192.168.',
  ];

  /**
   * Check if the IP is localhost (internal request from SSR)
   */
  private isLocalhostIp(ip: string): boolean {
    if (!ip) return false;
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('127.');
  }

  /**
   * Cloudflare IP ranges
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
    for (const proxy of [...this.trustedProxies, ...this.cloudflareIpPrefixes]) {
      if (ip.startsWith(proxy) || ip === proxy) return true;
    }
    return false;
  }

  /**
   * Get client IP address with trusted proxy validation
   */
  private getClientIp(request: any): string {
    const socketIp =
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip || 'unknown';
    const cleanSocketIp = socketIp.replace('::ffff:', '');

    if (this.isTrustedProxy(cleanSocketIp) || this.isTrustedProxy(socketIp)) {
      const cfIp = request.headers['cf-connecting-ip'];
      if (cfIp) return cfIp;
      const realIp = request.headers['x-real-ip'];
      if (realIp) return realIp;
      const forwardedFor = request.headers['x-forwarded-for'];
      if (forwardedFor) return forwardedFor.split(',')[0].trim();
    }

    return cleanSocketIp || 'unknown';
  }


  /**
   * Normalize headers to string record
   */
  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        normalized[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        normalized[key.toLowerCase()] = value.join(', ');
      }
    }

    return normalized;
  }

  /**
   * Sanitize request body
   */
  private sanitizeBody(body: any): any {
    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sanitized: any = Array.isArray(body) ? [] : {};

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        sanitized[key] = this.wafService.sanitize(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
