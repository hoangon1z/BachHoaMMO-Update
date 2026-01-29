import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SECURITY_CONSTANTS } from '../constants/security.constants';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();

    // Generate unique request ID for tracing
    const requestId = request.headers['x-request-id'] || this.generateRequestId();
    request.requestId = requestId;

    // Set security headers
    this.setSecurityHeaders(response, requestId);

    return next.handle().pipe(
      tap(() => {
        // Add timing header
        if (request.startTime) {
          const duration = Date.now() - request.startTime;
          response.setHeader('X-Response-Time', `${duration}ms`);
        }
      }),
    );
  }

  private setSecurityHeaders(response: any, requestId: string): void {
    const { HEADERS } = SECURITY_CONSTANTS;

    // 1. Strict Transport Security (HSTS)
    response.setHeader(
      'Strict-Transport-Security',
      `max-age=${HEADERS.HSTS_MAX_AGE}; includeSubDomains; preload`,
    );

    // 2. Content Security Policy (CSP)
    const cspDirectives = Object.entries(HEADERS.CSP_DIRECTIVES)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');
    response.setHeader('Content-Security-Policy', cspDirectives);

    // 3. X-Content-Type-Options - Prevent MIME type sniffing
    response.setHeader('X-Content-Type-Options', 'nosniff');

    // 4. X-Frame-Options - Prevent clickjacking
    response.setHeader('X-Frame-Options', 'DENY');

    // 5. X-XSS-Protection - Enable XSS filter
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // 6. Referrer-Policy - Control referrer information
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 7. Permissions-Policy - Control browser features
    response.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    );

    // 8. Cache-Control - Prevent caching of sensitive data
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');

    // 9. X-Request-ID - For request tracing
    response.setHeader('X-Request-ID', requestId);

    // 10. X-DNS-Prefetch-Control - Control DNS prefetching
    response.setHeader('X-DNS-Prefetch-Control', 'off');

    // 11. X-Download-Options - Prevent IE from executing downloads
    response.setHeader('X-Download-Options', 'noopen');

    // 12. X-Permitted-Cross-Domain-Policies - Restrict Adobe Flash/PDF
    response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // 13. Cross-Origin headers
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  }

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `req_${timestamp}_${random}`;
  }
}
