import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PayOSController } from './payos.controller';
import { PayOSService } from './payos.service';
import { PaymentGateway } from './payos.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    PrismaModule,
    TelegramModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PayOSController],
  providers: [PayOSService, PaymentGateway],
  exports: [PayOSService, PaymentGateway],
})
export class PayOSModule { }
