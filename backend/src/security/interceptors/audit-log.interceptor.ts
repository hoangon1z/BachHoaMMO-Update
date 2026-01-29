import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SECURITY_METADATA } from '../constants/security.constants';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private reflector: Reflector,
    private auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if audit logging is skipped
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SECURITY_METADATA.SKIP_AUDIT,
      [context.getHandler(), context.getClass()],
    );

    if (skipAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    request.startTime = startTime;

    const requestId = request.requestId || this.generateRequestId();
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || '';
    const method = request.method;
    const endpoint = request.path;
    const userId = request.user?.sub;

    return next.handle().pipe(
      tap((responseData) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - startTime;

        // Log successful request
        this.auditLogService.logRequest(
          requestId,
          userId,
          ip,
          userAgent,
          method,
          endpoint,
          statusCode,
          duration,
          {
            query: this.sanitizeData(request.query),
            bodyKeys: request.body ? Object.keys(request.body) : [],
          },
        ).catch(err => this.logger.error('Failed to log request', err));
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log failed request
        this.auditLogService.logRequest(
          requestId,
          userId,
          ip,
          userAgent,
          method,
          endpoint,
          statusCode,
          duration,
          {
            error: error.message,
            errorName: error.name,
            query: this.sanitizeData(request.query),
          },
        ).catch(err => this.logger.error('Failed to log error request', err));

        throw error;
      }),
    );
  }

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

  private generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized: any = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credit'];

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
