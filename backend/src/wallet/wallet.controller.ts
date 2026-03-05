import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../security/decorators/security.decorators';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from '../telegram/telegram.service';

@Controller('wallet')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private settingsService: SettingsService,
    private telegramService: TelegramService,
  ) { }

  /**
   * Get USDT deposit config (public - no auth needed)
   * GET /wallet/usdt-config
   */
  @Public()
  @Get('usdt-config')
  async getUsdtConfig() {
    const config = await this.settingsService.getUsdtSettings();
    return {
      enabled: config.enabled && config.networks.length > 0,
      exchangeRate: config.exchangeRate,
      networks: config.enabled ? config.networks : [],
    };
  }

  /**
   * Get user wallet balance
   * GET /wallet/balance/:userId
   */
  @UseGuards(JwtAuthGuard)
  @Get('balance/:userId')
  async getBalance(@Param('userId') userId: string, @Request() req) {
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
    if (req.user.id !== userId) {
      return { error: 'Unauthorized' };
    }
    return this.walletService.getTransactions(userId);
  }

  /**
   * Create recharge request (bank transfer)
   * POST /wallet/recharge
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

  /**
   * Create USDT deposit request
   * POST /wallet/usdt-deposit
   * Body: { usdtAmount: number, txHash: string, vndAmount: number }
   */
  @UseGuards(JwtAuthGuard)
  @Post('usdt-deposit')
  async createUsdtDeposit(
    @Body() body: { usdtAmount: number; txHash: string; network: string },
    @Request() req,
  ) {
    const config = await this.settingsService.getUsdtSettings();
    if (!config.enabled || config.networks.length === 0) {
      return { error: 'USDT deposit is not enabled' };
    }

    // Find the selected network
    const selectedNetwork = config.networks.find(n => n.network === body.network);
    if (!selectedNetwork) {
      return { error: 'Invalid network selected' };
    }

    if (!body.txHash || body.txHash.trim().length < 10) {
      return { error: 'Invalid transaction hash' };
    }

    if (!body.usdtAmount || body.usdtAmount <= 0) {
      return { error: 'Invalid USDT amount' };
    }

    const vndAmount = Math.round(body.usdtAmount * config.exchangeRate);

    const metadata = {
      paymentMethod: 'USDT',
      network: selectedNetwork.network,
      txHash: body.txHash.trim(),
      usdtAmount: body.usdtAmount,
      exchangeRate: config.exchangeRate,
      walletAddress: selectedNetwork.address,
      requestedAt: new Date().toISOString(),
    };

    const transaction = await this.walletService.createRechargeRequest(
      req.user.id,
      vndAmount,
      metadata,
    );

    // Send Telegram notification to admin
    this.telegramService.notifyUsdtDeposit({
      userEmail: req.user.email || 'Unknown',
      userName: req.user.name || undefined,
      usdtAmount: body.usdtAmount,
      vndAmount,
      network: selectedNetwork.network,
      txHash: body.txHash.trim(),
      walletAddress: selectedNetwork.address,
      transactionId: transaction.id || '',
    });

    return { success: true, transaction };
  }
}
