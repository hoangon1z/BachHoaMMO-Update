import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { PayOSService } from './payos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../security/decorators/security.decorators';

@Controller('payos')
export class PayOSController {
  private readonly logger = new Logger(PayOSController.name);

  constructor(private payosService: PayOSService) {}

  /**
   * Create payment link for wallet recharge
   * POST /payos/create-payment
   * Body: { amount: number, returnUrl?: string, cancelUrl?: string }
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-payment')
  async createPaymentLink(
    @Body() body: { amount: number; returnUrl?: string; cancelUrl?: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const returnUrl = body.returnUrl || `${baseUrl}/wallet/recharge/success`;
    const cancelUrl = body.cancelUrl || `${baseUrl}/wallet/recharge/cancel`;

    const result = await this.payosService.createPaymentLink(
      userId,
      body.amount,
      returnUrl,
      cancelUrl,
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
        bin: result.paymentLink.bin, // Bank identification number
      },
    };
  }

  /**
   * Webhook endpoint to receive payment notifications from PayOS
   * POST /payos/webhook
   * This endpoint is PUBLIC - called by PayOS server
   */
  @Public()
  @Post('webhook')
  @HttpCode(200) // Always return 200 to PayOS
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-payos-signature') signature: string,
  ) {

    try {
      const result = await this.payosService.handleWebhook(payload);
      
      // Always return 200 to acknowledge receipt
      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`);
      // Still return 200 to prevent PayOS from retrying indefinitely
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get payment status
   * GET /payos/status/:orderCode
   */
  @UseGuards(JwtAuthGuard)
  @Get('status/:orderCode')
  async getPaymentStatus(@Param('orderCode') orderCode: string) {
    const result = await this.payosService.getPaymentStatus(orderCode);
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
    const result = await this.payosService.cancelPaymentLink(orderCode, body.reason);
    return result;
  }

  /**
   * Check if PayOS is configured
   * GET /payos/config-status
   */
  @Public()
  @Get('config-status')
  getConfigStatus() {
    const isConfigured = !!(
      process.env.PAYOS_CLIENT_ID && 
      process.env.PAYOS_API_KEY && 
      process.env.PAYOS_CHECKSUM_KEY
    );

    return {
      configured: isConfigured,
      message: isConfigured 
        ? 'PayOS is configured' 
        : 'PayOS credentials not set. Please configure PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY',
    };
  }

  /**
   * Check payment status from PayOS and auto-approve if paid
   * POST /payos/check-and-approve/:orderCode
   * Use this for local testing when webhook is not available
   */
  @UseGuards(JwtAuthGuard)
  @Post('check-and-approve/:orderCode')
  async checkAndApprove(@Param('orderCode') orderCode: string) {
    
    try {
      // Get payment status from PayOS
      const payosStatus = await this.payosService.getPaymentStatus(orderCode);
      
      if (payosStatus.code !== '00') {
        return {
          success: false,
          message: `PayOS error: ${payosStatus.desc}`,
          data: payosStatus,
        };
      }

      const paymentData = payosStatus.data;
      
      // Check if payment is completed (PAID status)
      if (paymentData.status === 'PAID') {
        // Simulate webhook payload
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

        // Process as webhook
        const result = await this.payosService.handleWebhook(webhookPayload as any);
        
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
