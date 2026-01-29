import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PublicController } from './public.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, WalletModule, OrdersModule],
  controllers: [AdminController, PublicController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
