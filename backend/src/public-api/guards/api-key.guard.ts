import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { createHmac } from 'crypto';
import { SKIP_API_KEY, ApiSellerInfo } from '../decorators/api-key.decorator';
import { createErrorResponse, API_ERROR_CODES } from '../dto/api-response.dto';

// Rate limit store (in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint should skip API key check
    const skipApiKey = this.reflector.getAllAndOverride<boolean>(SKIP_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipApiKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    try {
      // 1. Extract headers
      const apiKey = request.headers['x-api-key'];
      const timestamp = request.headers['x-timestamp'];
      const signature = request.headers['x-signature'];

      if (!apiKey || !timestamp || !signature) {
        throw this.createError(
          API_ERROR_CODES.INVALID_API_KEY,
          'Missing required headers: X-API-Key, X-Timestamp, X-Signature',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 2. Validate timestamp (within ±5 minutes)
      const requestTime = parseInt(timestamp, 10) * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeDiff = Math.abs(now - requestTime);
      const maxTimeDiff = 5 * 60 * 1000; // 5 minutes

      if (isNaN(requestTime) || timeDiff > maxTimeDiff) {
        throw this.createError(
          API_ERROR_CODES.EXPIRED_TIMESTAMP,
          'Timestamp is invalid or expired (must be within ±5 minutes)',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 3. Find API key in database
      const sellerApiKey = await this.prisma.sellerApiKey.findUnique({
        where: { apiKey },
        include: {
          seller: {
            include: {
              sellerProfile: true,
            },
          },
        },
      });

      if (!sellerApiKey) {
        throw this.createError(
          API_ERROR_CODES.INVALID_API_KEY,
          'Invalid API key',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 4. Check if API key is active
      if (!sellerApiKey.isActive) {
        throw this.createError(
          API_ERROR_CODES.API_KEY_INACTIVE,
          'API key is inactive',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 5. Check if API key is expired
      if (sellerApiKey.expiresAt && new Date(sellerApiKey.expiresAt) < new Date()) {
        throw this.createError(
          API_ERROR_CODES.API_KEY_EXPIRED,
          'API key has expired',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 6. Check if seller is valid
      if (!sellerApiKey.seller.isSeller || sellerApiKey.seller.isBanned) {
        throw this.createError(
          API_ERROR_CODES.FORBIDDEN,
          'Seller account is not active',
          HttpStatus.FORBIDDEN,
        );
      }

      // 7. Verify signature
      const method = request.method.toUpperCase();
      const path = request.originalUrl || request.url;
      
      // Handle body - empty object {} should be treated as empty string
      let body = '';
      if (request.body && typeof request.body === 'object' && Object.keys(request.body).length > 0) {
        body = JSON.stringify(request.body);
      }
      
      // Signature = HMAC-SHA256(secret, timestamp + method + path + body)
      // Client and server both use the same secret key stored in secretHash field
      const signaturePayload = `${timestamp}${method}${path}${body}`;
      const expectedSignature = createHmac('sha256', sellerApiKey.secretHash)
        .update(signaturePayload)
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn(`Invalid signature for API key ${apiKey.substring(0, 12)}... Path: ${path}`);
        throw this.createError(
          API_ERROR_CODES.INVALID_SIGNATURE,
          'Invalid signature',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 8. Rate limiting
      const rateLimitKey = `api:${sellerApiKey.id}`;
      const rateLimit = sellerApiKey.rateLimit || 100;
      const rateLimitWindow = 60 * 1000; // 1 minute

      let rateLimitEntry = rateLimitStore.get(rateLimitKey);
      if (!rateLimitEntry || now > rateLimitEntry.resetAt) {
        rateLimitEntry = { count: 0, resetAt: now + rateLimitWindow };
        rateLimitStore.set(rateLimitKey, rateLimitEntry);
      }

      rateLimitEntry.count++;

      // Add rate limit headers
      const remaining = Math.max(0, rateLimit - rateLimitEntry.count);
      response.setHeader('X-RateLimit-Limit', rateLimit.toString());
      response.setHeader('X-RateLimit-Remaining', remaining.toString());
      response.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitEntry.resetAt / 1000).toString());

      if (rateLimitEntry.count > rateLimit) {
        throw this.createError(
          API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded. Limit: ${rateLimit} requests per minute`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 9. Update API key usage (async, don't wait)
      const clientIp = this.getClientIp(request);
      this.prisma.sellerApiKey.update({
        where: { id: sellerApiKey.id },
        data: {
          lastUsedAt: new Date(),
          lastUsedIp: clientIp,
          totalCalls: { increment: 1 },
        },
      }).catch((err) => {
        this.logger.error('Failed to update API key usage:', err);
      });

      // 10. Attach seller info to request
      const apiSellerInfo: ApiSellerInfo = {
        id: sellerApiKey.seller.id,
        email: sellerApiKey.seller.email,
        name: sellerApiKey.seller.name || '',
        isSeller: sellerApiKey.seller.isSeller,
        sellerProfile: sellerApiKey.seller.sellerProfile
          ? {
              id: sellerApiKey.seller.sellerProfile.id,
              shopName: sellerApiKey.seller.sellerProfile.shopName,
              shopDescription: sellerApiKey.seller.sellerProfile.shopDescription || undefined,
              shopLogo: sellerApiKey.seller.sellerProfile.shopLogo || undefined,
              rating: sellerApiKey.seller.sellerProfile.rating,
              totalSales: sellerApiKey.seller.sellerProfile.totalSales,
              isVerified: sellerApiKey.seller.sellerProfile.isVerified,
            }
          : undefined,
        apiKey: {
          id: sellerApiKey.id,
          name: sellerApiKey.name,
          rateLimit: sellerApiKey.rateLimit,
        },
      };

      request.apiSeller = apiSellerInfo;

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('API Key Guard error:', error);
      throw this.createError(
        API_ERROR_CODES.INTERNAL_ERROR,
        'Authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private createError(code: string, message: string, status: HttpStatus): HttpException {
    return new HttpException(createErrorResponse(code, message), status);
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
}
