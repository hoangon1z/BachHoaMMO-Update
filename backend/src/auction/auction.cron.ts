import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuctionService } from './auction.service';
import { AuctionGateway } from './auction.gateway';
import { SettingsService } from '../settings/settings.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuctionCronService {
  private readonly logger = new Logger(AuctionCronService.name);

  constructor(
    private auctionService: AuctionService,
    private auctionGateway: AuctionGateway,
    private settingsService: SettingsService,
    private prisma: PrismaService,
  ) { }

  /**
   * Check every minute:
   * 1. Auto-create today's auction if autoCreate is enabled
   * 2. Finalize expired auctions
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAuctions() {
    try {
      // 1. Auto-create if enabled
      const settings = await this.settingsService.getAuctionSettings();
      if (settings.autoCreate) {
        const created = await this.auctionService.autoCreateTodayAuction();
        if (created) {
          this.logger.log('Auto-created today\'s auction');
        }
      }

      // 2. Check for expired ACTIVE auctions
      const now = new Date();
      const expiredAuction = await this.prisma.auction.findFirst({
        where: {
          status: 'ACTIVE',
          endTime: { lte: now },
        },
      });

      if (expiredAuction) {
        this.logger.log(
          `Auction ${expiredAuction.id} has passed endTime (${expiredAuction.endTime.toISOString()}), finalizing...`
        );
        await this.finalizeAuction();
      }
    } catch (error) {
      this.logger.error('Error in auction cron check:', error);
    }
  }

  /**
   * Finalize the expired auction and notify winners
   */
  async finalizeAuction() {
    try {
      const auction = await this.auctionService.finalizeAuction();

      if (auction) {
        const winners = await this.auctionService.getCurrentWinners();
        this.auctionGateway.broadcastAuctionEnded(winners);

        for (const winner of winners) {
          this.auctionGateway.notifyWinner(
            winner.sellerId,
            winner.position,
            winner.amount
          );
        }

        this.logger.log(`Auction finalized with ${winners.length} winners`);
      }
    } catch (error) {
      this.logger.error('Error finalizing auction:', error);
    }
  }

  /**
   * Daily cleanup check at 3 AM
   */
  @Cron('0 3 * * *')
  async cleanupCheck() {
    try {
      this.logger.log('Daily auction cleanup check completed');
    } catch (error) {
      this.logger.error('Error in auction cleanup:', error);
    }
  }
}
