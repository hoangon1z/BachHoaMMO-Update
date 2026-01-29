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
  ) {}

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
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || '';

    // 1. Check if IP is already blocked
    if (this.rateLimitService.isIpBlocked(ip)) {
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
      const suspiciousCount = this.rateLimitService.trackSuspiciousActivity(ip);

      // Progressive blocking for repeat offenders
      if (suspiciousCount >= 3) {
        const blockDuration = Math.min(600 * suspiciousCount, 86400); // Max 24 hours
        this.rateLimitService.blockIp(
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
