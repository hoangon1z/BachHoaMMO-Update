import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PublicAPI');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, headers } = request;
    const apiKey = headers['x-api-key'];
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        // Log API call (mask API key)
        const maskedKey = apiKey ? `${apiKey.substring(0, 12)}...` : 'none';
        this.logger.log(
          `${method} ${originalUrl} - Key: ${maskedKey} - ${duration}ms`,
        );
      }),
      map((data) => {
        // If response is already in our format, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        // Wrap in success response
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
