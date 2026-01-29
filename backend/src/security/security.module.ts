import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

// Guards
import { ZeroTrustGuard } from './guards/zero-trust.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { WafGuard } from './guards/waf.guard';

// Services
import { SecurityService } from './services/security.service';
import { RateLimitService } from './services/rate-limit.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { AuditLogService } from './services/audit-log.service';
import { DeviceFingerprintService } from './services/device-fingerprint.service';
import { TokenService } from './services/token.service';
import { WafService } from './services/waf.service';

// Interceptors
import { SecurityHeadersInterceptor } from './interceptors/security-headers.interceptor';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

// Filters
import { SecurityExceptionFilter } from './filters/security-exception.filter';

// Controllers
import { SecurityController } from './security.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [SecurityController],
  providers: [
    // Services
    SecurityService,
    RateLimitService,
    AnomalyDetectionService,
    AuditLogService,
    DeviceFingerprintService,
    TokenService,
    WafService,

    // Global Guards (order matters - WAF first, then Zero Trust, then Rate Limit)
    {
      provide: APP_GUARD,
      useClass: WafGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ZeroTrustGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },

    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: SecurityExceptionFilter,
    },
  ],
  exports: [
    SecurityService,
    RateLimitService,
    AnomalyDetectionService,
    AuditLogService,
    DeviceFingerprintService,
    TokenService,
    WafService,
  ],
})
export class SecurityModule {}
