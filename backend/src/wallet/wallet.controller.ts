import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  /**
   * Get user wallet balance
   * GET /wallet/balance/:userId
   */
  @UseGuards(JwtAuthGuard)
  @Get('balance/:userId')
  async getBalance(@Param('userId') userId: string, @Request() req) {
    // Only allow users to access their own wallet
    if (req.user.id !== userId) {
      return { error: 'Unauthorized' };
    }

    return this.walletService.getBalance(userId);
  }

  /**
   * Get transaction history
   * GET /wallet/transactions/:userId
   */
  @UseGuards(JwtAuthGuard)
  @Get('transactions/:userId')
  async getTransactions(
    @Param('userId') userId: string,
    @Request() req,
  ) {
    // Only allow users to access their own transactions
    if (req.user.id !== userId) {
      return { error: 'Unauthorized' };
    }

    return this.walletService.getTransactions(userId);
  }

  /**
   * Create recharge request
   * POST /wallet/recharge
   * Body: { amount: number, paymentMethod?: string }
   */
  @UseGuards(JwtAuthGuard)
  @Post('recharge')
  async createRecharge(
    @Body() body: { amount: number; paymentMethod?: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    const metadata = {
      paymentMethod: body.paymentMethod || 'bank',
      requestedAt: new Date().toISOString(),
    };

    return this.walletService.createRechargeRequest(userId, body.amount, metadata);
  }
}
