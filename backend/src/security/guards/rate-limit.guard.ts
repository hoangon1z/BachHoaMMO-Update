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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || '';
    const endpoint = request.path;
    const userId = request.user?.sub;

    // 1. Check if IP is blocked
    if (this.rateLimitService.isIpBlocked(ip)) {
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
      const suspiciousCount = this.rateLimitService.trackSuspiciousActivity(ip);

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
        this.rateLimitService.blockIp(ip, blockDuration, 'Repeated rate limit violations');
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
   * Get client IP address
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}
