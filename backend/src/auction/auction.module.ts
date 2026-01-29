import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionService } from './auction.service';
import { AuctionController, AdminAuctionController } from './auction.controller';
import { AuctionGateway } from './auction.gateway';
import { AuctionCronService } from './auction.cron';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AuctionController, AdminAuctionController],
  providers: [
    AuctionGateway, // Gateway first
    AuctionService,
    AuctionCronService,
  ],
  exports: [AuctionService, AuctionGateway],
})
export class AuctionModule {}
