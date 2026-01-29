import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuctionService } from './auction.service';
import { AuctionGateway } from './auction.gateway';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AuctionCronService {
  private readonly logger = new Logger(AuctionCronService.name);

  constructor(
    private auctionService: AuctionService,
    private auctionGateway: AuctionGateway,
    private settingsService: SettingsService,
  ) {}

  /**
   * Check every minute if auction should be finalized
   * This runs every minute and checks if current time matches the configured end time
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAuctionEnd() {
    try {
      const settings = await this.settingsService.getAuctionSettings();
      const now = new Date();
      
      // Check if current day and hour match the configured end time
      const isEndDay = now.getDay() === settings.endDay;
      const isEndHour = now.getHours() === settings.endHour;
      const isFirstMinute = now.getMinutes() === 0;

      if (isEndDay && isEndHour && isFirstMinute) {
        this.logger.log('Auction end time reached, finalizing...');
        await this.finalizeCurrentAuction();
      }
    } catch (error) {
      this.logger.error('Error checking auction end:', error);
    }
  }

  /**
   * Finalize the current auction and notify winners
   */
  async finalizeCurrentAuction() {
    try {
      const auction = await this.auctionService.finalizeAuction();
      
      if (auction) {
        // Get winners
        const winners = await this.auctionService.getCurrentWinners();
        
        // Broadcast auction ended to all connected clients
        this.auctionGateway.broadcastAuctionEnded(winners);
        
        // Notify each winner
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
   * Cleanup old auctions (optional - runs daily at 3 AM)
   * Keeps auctions for 3 months for history
   */
  @Cron('0 3 * * *')
  async cleanupOldAuctions() {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      // We don't delete, just log for now
      // In production, you might want to archive old auctions
      this.logger.log('Auction cleanup check completed');
    } catch (error) {
      this.logger.error('Error in auction cleanup:', error);
    }
  }
}
