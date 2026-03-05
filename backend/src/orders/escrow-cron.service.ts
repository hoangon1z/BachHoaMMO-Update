import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class EscrowCronService {
    private readonly logger = new Logger(EscrowCronService.name);

    constructor(private readonly ordersService: OrdersService) { }

    /**
     * Auto-release expired escrows every 10 minutes
     * Escrows are held for 3 days after order creation
     * After holdUntil passes → money is released to seller
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleEscrowRelease() {
        try {
            const releasableEscrows = await this.ordersService.getReleasableEscrows();

            if (releasableEscrows.length === 0) return;

            this.logger.log(`🔓 Found ${releasableEscrows.length} escrows ready to release`);

            let released = 0;
            let failed = 0;

            for (const escrow of releasableEscrows) {
                try {
                    await this.ordersService.releaseEscrow(escrow.id);
                    released++;
                    this.logger.log(
                        `✅ Released escrow ${escrow.id} | Order: ${escrow.order?.orderNumber} | Amount: ${escrow.amount.toLocaleString('vi-VN')}đ → Seller: ${escrow.seller?.name || escrow.sellerId}`,
                    );
                } catch (error) {
                    failed++;
                    this.logger.error(
                        `❌ Failed to release escrow ${escrow.id}: ${error.message}`,
                    );
                }
            }

            this.logger.log(
                `🔓 Escrow release complete: ${released} released, ${failed} failed out of ${releasableEscrows.length} total`,
            );
        } catch (error) {
            this.logger.error(`❌ Escrow cron error: ${error.message}`);
        }
    }
}
