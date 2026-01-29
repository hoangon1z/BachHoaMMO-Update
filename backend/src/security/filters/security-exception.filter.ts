import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RiskLevel, SecurityEventType } from '../constants/security.constants';
import { AuditLogService } from '../services/audit-log.service';

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityExceptionFilter.name);

  constructor(private auditLogService: AuditLogService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || '';
    const requestId = (request as any).requestId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Determine risk level based on status code
    let riskLevel = RiskLevel.LOW;
    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      riskLevel = RiskLevel.MEDIUM;
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      riskLevel = RiskLevel.HIGH;
    }

    // Log security-relevant exceptions
    if (status === HttpStatus.UNAUTHORIZED || 
        status === HttpStatus.FORBIDDEN || 
        status === HttpStatus.TOO_MANY_REQUESTS ||
        status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      
      await this.auditLogService.logSecurityIncident(
        status === HttpStatus.TOO_MANY_REQUESTS 
          ? SecurityEventType.RATE_LIMIT_EXCEEDED 
          : SecurityEventType.SUSPICIOUS_ACTIVITY,
        ip,
        userAgent,
        request.path,
        riskLevel,
        {
          statusCode: status,
          error,
          message: this.sanitizeMessage(message),
          method: request.method,
          requestId,
        },
        (request as any).user?.sub,
      ).catch(err => this.logger.error('Failed to log exception', err));
    }

    // Log internal errors for debugging
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Internal error: ${message}`, {
        exception: exception instanceof Error ? exception.stack : exception,
        path: request.path,
        method: request.method,
        requestId,
      });
    }

    // Build response - don't leak internal details in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    const responseBody: any = {
      statusCode: status,
      message: isProduction && status >= 500 ? 'Internal server error' : message,
      error,
      timestamp: new Date().toISOString(),
      path: request.path,
      requestId,
    };

    // Add retry-after for rate limiting
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      const exceptionResponse = (exception as HttpException).getResponse() as any;
      if (exceptionResponse.retryAfter) {
        response.setHeader('Retry-After', exceptionResponse.retryAfter);
        responseBody.retryAfter = exceptionResponse.retryAfter;
      }
    }

    response.status(status).json(responseBody);
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  private sanitizeMessage(message: any): string {
    if (typeof message === 'string') {
      return message.substring(0, 500);
    }
    if (Array.isArray(message)) {
      return message.slice(0, 5).join(', ');
    }
    return String(message).substring(0, 500);
  }
}
