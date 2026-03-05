import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const logger = new Logger('Bootstrap');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/avatars', 'uploads/banners', 'uploads/products'];
uploadDirs.forEach(dir => {
  const path = join(process.cwd(), dir);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Increase body parser limits for file uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // ==========================================
  // SECURITY MIDDLEWARE
  // ==========================================

  // 1. Helmet - Security headers (basic, our interceptor adds more)
  app.use(helmet({
    contentSecurityPolicy: false, // We handle CSP in our interceptor
    crossOriginEmbedderPolicy: false, // For development
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resource loading (for avatars, images)
  }));

  // 2. Compression
  app.use(compression());

  // 3. CORS Configuration
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID',
      'X-Device-Fingerprint',
      'ngrok-skip-browser-warning',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
      'Retry-After',
    ],
  });

  // 4. Global validation pipe with strict settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true,           // Auto-transform payloads
      transformOptions: {
        enableImplicitConversion: false, // Explicit conversion only
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
      validationError: {
        target: false,           // Don't expose target object
        value: false,            // Don't expose value
      },
    }),
  );

  // 5. Global exception filter - CRITICAL: Prevents crashes on unhandled errors!
  app.useGlobalFilters(new AllExceptionsFilter());

  // 6. Trust proxy (important for getting real IP behind reverse proxy)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // 7. Disable X-Powered-By header
  expressApp.disable('x-powered-by');

  // ==========================================
  // START SERVER
  // ==========================================
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🔐 SECURE MARKETPLACE API SERVER                           ║
║                                                              ║
║   Server running on: http://localhost:${port}                   ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                              ║
║   Security Features Active:                                  ║
║   ✅ Zero-Trust Architecture                                 ║
║   ✅ WAF (Web Application Firewall)                          ║
║   ✅ Rate Limiting (Sliding Window)                          ║
║   ✅ AI Anomaly Detection                                    ║
║   ✅ Security Headers (HSTS, CSP, etc.)                      ║
║   ✅ Audit Logging                                           ║
║   ✅ Device Fingerprinting                                   ║
║   ✅ Global Exception Handler                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

// ==========================================
// PROCESS ERROR HANDLERS - Prevent crashes
// ==========================================

// Handle unhandled promise rejections (don't crash!)
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection:');
  logger.error(reason);
  // DON'T exit - just log the error
});

// Handle uncaught exceptions (log but try to continue)
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:');
  logger.error(error.stack || error);
  // For critical errors that might corrupt state, exit gracefully
  // But for most errors, we'll try to continue
  if (error.message?.includes('FATAL') || error.message?.includes('out of memory')) {
    process.exit(1);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

bootstrap().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
