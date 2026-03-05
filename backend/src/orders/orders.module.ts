import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { EscrowCronService } from './escrow-cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { DiscountCodesModule } from '../discount-codes/discount-codes.module';

@Module({
  imports: [PrismaModule, WalletModule, DiscountCodesModule, ScheduleModule.forRoot()],
  controllers: [OrdersController],
  providers: [OrdersService, EscrowCronService],
  exports: [OrdersService],
})
export class OrdersModule { }
