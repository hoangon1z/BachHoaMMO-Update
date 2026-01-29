import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { PublicSellerController } from './public-seller.controller';
import { SellerService } from './seller.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SellerController, PublicSellerController],
  providers: [SellerService],
  exports: [SellerService],
})
export class SellerModule {}
