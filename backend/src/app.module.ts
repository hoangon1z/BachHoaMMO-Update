import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { WalletModule } from './wallet/wallet.module';
import { OrdersModule } from './orders/orders.module';
import { AdminModule } from './admin/admin.module';
import { SellerModule } from './seller/seller.module';
import { SecurityModule } from './security/security.module';
import { PayOSModule } from './payos/payos.module';
import { ChatModule } from './chat/chat.module';
import { SettingsModule } from './settings/settings.module';
import { AuctionModule } from './auction/auction.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { TelegramModule } from './telegram/telegram.module';
import { PublicApiModule } from './public-api/public-api.module';
import { WebhookModule } from './webhook/webhook.module';
import { BlogModule } from './blog/blog.module';
import { HealthModule } from './health/health.module';
import { SeoModule } from './seo/seo.module';
import { PagesModule } from './pages/pages.module';
import { CheckUidModule } from './checkuid/checkuid.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { DiscountCodesModule } from './discount-codes/discount-codes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Global JWT Module for security guards
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || '',
      signOptions: { expiresIn: '15m' },
    }),
    // MongoDB for Chat
    MongooseModule.forRoot(process.env.MONGODB_URL || 'mongodb://localhost:27017/fullstack_db'),
    // Serve static files (uploads) with security headers
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false, // Don't look for index.html
        fallthrough: true, // Pass to next handler if file not found
        setHeaders: (res: any, filePath: string) => {
          // Prevent MIME type sniffing
          res.setHeader('X-Content-Type-Options', 'nosniff');
          // Prevent files from being rendered in iframes (clickjacking)
          res.setHeader('X-Frame-Options', 'DENY');
          // Force download for non-image files (prevents XSS via uploaded HTML/SVG)
          const ext = filePath.toLowerCase();
          if (!ext.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            res.setHeader('Content-Disposition', 'attachment');
          }
          // Block script execution in uploaded content
          res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
        },
      },
    }),
    PrismaModule,
    EmailModule, // Email service (global)
    SecurityModule, // Security module should be loaded early
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    WalletModule,
    OrdersModule,
    AdminModule,
    SellerModule,
    PayOSModule, // PayOS payment gateway
    ChatModule, // Real-time chat
    SettingsModule, // System settings
    AuctionModule, // Auction system
    NotificationsModule, // Notification system
    TelegramModule, // Telegram notifications
    WebhookModule, // Webhook system for seller integration
    PublicApiModule, // Public Seller API (tách biệt, không qua WAF/ZeroTrust)
    BlogModule, // Blog system for verified sellers
    HealthModule, // Health check endpoints
    SeoModule, // SEO & Google Indexing API
    PagesModule, // CMS Pages
    CheckUidModule, // CheckUID - FB/TikTok monitoring tool
    ServiceOrdersModule, // Service orders (buff like/sub MXH)
    DiscountCodesModule, // Discount code system for sellers
  ],
})
export class AppModule { }
