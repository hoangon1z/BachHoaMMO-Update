import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter to catch all unhandled errors
 * Prevents application crashes by returning proper error responses
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let error = 'Internal Server Error';

        // Handle HTTP exceptions
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object') {
                message = (exceptionResponse as any).message || message;
                error = (exceptionResponse as any).error || error;
            } else {
                message = exceptionResponse as string;
            }
        }
        // Handle other errors
        else if (exception instanceof Error) {
            message = exception.message;
            error = exception.name;

            // Log full stack trace for non-HTTP errors
            this.logger.error(
                `Unhandled exception: ${exception.message}`,
                exception.stack,
            );
        }
        // Unknown error type
        else {
            this.logger.error('Unknown exception type', exception);
        }

        // Security: Don't expose internal errors in production
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction && status === 500) {
            message = 'An unexpected error occurred';
        }

        // Log request details for debugging
        this.logger.error(
            `${request.method} ${request.url} - Status: ${status} - ${message}`,
        );

        // Send error response (doesn't crash the app!)
        response.status(status).json({
            statusCode: status,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
