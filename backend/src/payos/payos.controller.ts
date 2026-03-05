import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Req,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { PayOSService, BankKey } from './payos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../security/decorators/security.decorators';

// In-memory rate limiter for webhook endpoint
const webhookRateLimit = new Map<string, { count: number; resetAt: number }>();
const WEBHOOK_RATE_LIMIT = 30; // max calls per window
const WEBHOOK_RATE_WINDOW = 60 * 1000; // 1 minute window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = webhookRateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    webhookRateLimit.set(ip, { count: 1, resetAt: now + WEBHOOK_RATE_WINDOW });
    return true;
  }

  if (entry.count >= WEBHOOK_RATE_LIMIT) {
    return false; // Rate limited
  }

  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of webhookRateLimit.entries()) {
    if (now > entry.resetAt) webhookRateLimit.delete(ip);
  }
}, 5 * 60 * 1000);

@Controller('payos')
export class PayOSController {
  private readonly logger = new Logger(PayOSController.name);

  constructor(private payosService: PayOSService) { }

  /**
   * Create payment link for wallet recharge
   * POST /payos/create-payment
   * Body: { amount: number, returnUrl?: string, cancelUrl?: string, bank?: 'bidv' | 'mbbank' }
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-payment')
  async createPaymentLink(
    @Body() body: { amount: number; returnUrl?: string; cancelUrl?: string; bank?: BankKey },
    @Request() req,
  ) {
    const userId = req.user.id;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const bank = body.bank || 'bidv';

    const returnUrl = body.returnUrl || `${baseUrl}/wallet/recharge/success`;
    const cancelUrl = body.cancelUrl || `${baseUrl}/wallet/recharge/cancel`;

    const result = await this.payosService.createPaymentLink(
      userId,
      body.amount,
      returnUrl,
      cancelUrl,
      bank,
    );

    return {
      success: true,
      data: {
        checkoutUrl: result.paymentLink.checkoutUrl,
        qrCode: result.paymentLink.qrCode,
        accountNumber: result.paymentLink.accountNumber,
        accountName: result.paymentLink.accountName,
        amount: result.paymentLink.amount,
        description: result.paymentLink.description,
        orderCode: result.paymentLink.orderCode,
        transactionId: result.transaction.id,
        bin: result.paymentLink.bin,
        bank, // Include selected bank in response
      },
    };
  }

  /**
   * Process webhook payload (shared logic for all bank routes)
   */
  private async processWebhook(payload: any, clientIp: string, bank?: BankKey) {
    const bankLabel = (bank || 'bidv').toUpperCase();
    this.logger.log(`[${bankLabel}] Webhook received from ${clientIp} — orderCode: ${payload?.data?.orderCode}`);

    if (!payload?.data || !payload?.signature) {
      this.logger.warn(`[${bankLabel}] Webhook rejected: missing data or signature`);
      return { success: false, message: 'Missing required fields' };
    }

    // Verify HMAC-SHA256 signature with the correct bank's checksum key
    const isValid = this.payosService.verifyWebhookSignature(payload, bank);

    if (!isValid) {
      this.logger.warn(`[${bankLabel}] Signature mismatch for orderCode ${payload.data.orderCode} — falling back to API verification`);

      const apiVerified = await this.payosService.verifyPaymentViaAPI(
        payload.data.orderCode,
        payload.data.amount,
        bank,
      );

      if (!apiVerified) {
        this.logger.warn(`[${bankLabel}] Webhook rejected: both signature AND API verification failed for orderCode: ${payload.data.orderCode}`);
        return { success: false, message: 'Verification failed' };
      }

      this.logger.log(`[${bankLabel}] Payment verified via PayOS API fallback for orderCode: ${payload.data.orderCode}`);
    }

    const result = await this.payosService.handleWebhook(payload, bank);
    return { success: result.success, message: result.message };
  }

  // ============================================================
  // BIDV WEBHOOK ENDPOINTS (existing — backward compatible)
  // ============================================================

  /**
   * Webhook endpoint — BIDV base URL
   * POST /payos/webhook
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  async handleWebhookBase(
    @Body() payload: any,
    @Req() req: any,
  ) {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection?.remoteAddress
      || 'unknown';

    if (!checkRateLimit(clientIp)) {
      this.logger.warn(`Webhook rate limited: IP ${clientIp}`);
      return { success: false, message: 'Rate limited' };
    }

    try {
      return await this.processWebhook(payload, clientIp, 'bidv');
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Webhook endpoint — BIDV with secret token
   * POST /payos/webhook/:secret
   */
  @Public()
  @Post('webhook/:secret')
  @HttpCode(200)
  async handleWebhookSecret(
    @Param('secret') secret: string,
    @Body() payload: any,
    @Req() req: any,
  ) {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection?.remoteAddress
      || 'unknown';

    if (!checkRateLimit(clientIp)) {
      this.logger.warn(`Webhook rate limited: IP ${clientIp}`);
      return { success: false, message: 'Rate limited' };
    }

    const webhookSecret = process.env.PAYOS_WEBHOOK_SECRET;
    if (!webhookSecret || secret !== webhookSecret) {
      this.logger.warn(`Webhook rejected: invalid URL secret from IP ${clientIp}`);
      return { success: false, message: 'Forbidden' };
    }

    try {
      return await this.processWebhook(payload, clientIp, 'bidv');
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  // ============================================================
  // MBBANK WEBHOOK ENDPOINTS
  // ============================================================

  /**
   * Webhook endpoint — MBBank base
   * POST /payos/webhook-mb
   */
  @Public()
  @Post('webhook-mb')
  @HttpCode(200)
  async handleWebhookMB(
    @Body() payload: any,
    @Req() req: any,
  ) {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection?.remoteAddress
      || 'unknown';

    if (!checkRateLimit(clientIp)) {
      this.logger.warn(`[MBBANK] Webhook rate limited: IP ${clientIp}`);
      return { success: false, message: 'Rate limited' };
    }

    try {
      return await this.processWebhook(payload, clientIp, 'mbbank');
    } catch (error) {
      this.logger.error(`[MBBANK] Webhook processing error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Webhook endpoint — MBBank with secret token
   * POST /payos/webhook-mb/:secret
   */
  @Public()
  @Post('webhook-mb/:secret')
  @HttpCode(200)
  async handleWebhookMBSecret(
    @Param('secret') secret: string,
    @Body() payload: any,
    @Req() req: any,
  ) {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.connection?.remoteAddress
      || 'unknown';

    if (!checkRateLimit(clientIp)) {
      this.logger.warn(`[MBBANK] Webhook rate limited: IP ${clientIp}`);
      return { success: false, message: 'Rate limited' };
    }

    const webhookSecret = process.env.PAYOS_WEBHOOK_SECRET;
    if (!webhookSecret || secret !== webhookSecret) {
      this.logger.warn(`[MBBANK] Webhook rejected: invalid URL secret from IP ${clientIp}`);
      return { success: false, message: 'Forbidden' };
    }

    try {
      return await this.processWebhook(payload, clientIp, 'mbbank');
    } catch (error) {
      this.logger.error(`[MBBANK] Webhook processing error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  // ============================================================
  // COMMON ENDPOINTS
  // ============================================================

  /**
   * Get payment status
   * GET /payos/status/:orderCode
   */
  @UseGuards(JwtAuthGuard)
  @Get('status/:orderCode')
  async getPaymentStatus(@Param('orderCode') orderCode: string) {
    // Try to detect bank from transaction metadata
    const txInfo = await this.payosService.findTransactionByOrderCode(orderCode);
    const bank = (txInfo?.bank as BankKey) || 'bidv';
    const result = await this.payosService.getPaymentStatus(orderCode, bank);
    return result;
  }

  /**
   * Cancel payment link
   * POST /payos/cancel/:orderCode
   */
  @UseGuards(JwtAuthGuard)
  @Post('cancel/:orderCode')
  async cancelPayment(
    @Param('orderCode') orderCode: string,
    @Body() body: { reason?: string },
  ) {
    const txInfo = await this.payosService.findTransactionByOrderCode(orderCode);
    const bank = (txInfo?.bank as BankKey) || 'bidv';
    const result = await this.payosService.cancelPaymentLink(orderCode, body.reason, bank);
    return result;
  }

  /**
   * Check if PayOS is configured
   * GET /payos/config-status
   * Returns available banks and their configuration status
   */
  @Public()
  @Get('config-status')
  getConfigStatus() {
    const banks = this.payosService.getAvailableBanks();
    const anyConfigured = banks.some(b => b.configured);

    return {
      configured: anyConfigured,
      banks,
      message: anyConfigured
        ? 'PayOS is configured'
        : 'PayOS credentials not set. Please configure PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY',
    };
  }

  /**
   * Check payment status from PayOS and auto-approve if paid
   * POST /payos/check-and-approve/:orderCode
   * SECURITY: Only allows the transaction owner to check & approve
   */
  @UseGuards(JwtAuthGuard)
  @Post('check-and-approve/:orderCode')
  async checkAndApprove(
    @Param('orderCode') orderCode: string,
    @Request() req,
  ) {
    const userId = req.user.id;

    try {
      const orderCodeStr = String(orderCode);
      const userTransactions = await this.payosService.findTransactionByOrderCode(orderCodeStr);

      if (!userTransactions || userTransactions.userId !== userId) {
        this.logger.warn(`User ${userId} tried to check-and-approve orderCode ${orderCode} that doesn't belong to them`);
        return { success: false, message: 'Transaction not found or unauthorized' };
      }

      // Auto-detect bank from stored transaction metadata
      const bank = (userTransactions.bank as BankKey) || 'bidv';

      const payosStatus = await this.payosService.getPaymentStatus(orderCode, bank);

      if (payosStatus.code !== '00') {
        return {
          success: false,
          message: `PayOS error: ${payosStatus.desc}`,
          data: payosStatus,
        };
      }

      const paymentData = payosStatus.data;

      if (paymentData.status === 'PAID') {
        const webhookPayload = {
          code: '00',
          desc: 'success',
          success: true,
          data: {
            orderCode: paymentData.orderCode,
            amount: paymentData.amount,
            description: paymentData.description || '',
            accountNumber: paymentData.accountNumber || '',
            reference: paymentData.transactions?.[0]?.reference || 'MANUAL_CHECK',
            transactionDateTime: paymentData.transactions?.[0]?.transactionDateTime || new Date().toISOString(),
            currency: paymentData.currency || 'VND',
            paymentLinkId: paymentData.id,
            code: '00',
            desc: 'success',
          },
          signature: 'manual_check',
        };

        const result = await this.payosService.handleWebhook(webhookPayload as any, bank);

        return {
          success: result.success,
          message: result.message,
          paymentStatus: paymentData.status,
          amount: paymentData.amount,
        };
      } else {
        return {
          success: false,
          message: `Payment not completed yet. Current status: ${paymentData.status}`,
          paymentStatus: paymentData.status,
          amount: paymentData.amount,
        };
      }
    } catch (error) {
      this.logger.error(`Check and approve error: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
