import { Module } from '@nestjs/common';
import { DiscountCodesController } from './discount-codes.controller';
import { DiscountCodesService } from './discount-codes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountCodesController],
  providers: [DiscountCodesService],
  exports: [DiscountCodesService],
})
export class DiscountCodesModule {}
