import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

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

  // 5. Trust proxy (important for getting real IP behind reverse proxy)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // 6. Disable X-Powered-By header
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
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
