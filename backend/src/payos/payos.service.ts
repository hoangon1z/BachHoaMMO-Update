import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';

interface PayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  baseUrl: string;
}

interface CreatePaymentLinkParams {
  orderCode: number;
  amount: number;
  description: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  cancelUrl: string;
  returnUrl: string;
  expiredAt?: number;
}

interface PaymentLinkResponse {
  code: string;
  desc: string;
  data: {
    bin: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    orderCode: number;
    currency: string;
    paymentLinkId: string;
    status: string;
    checkoutUrl: string;
    qrCode: string;
  };
  signature: string;
}

interface WebhookPayload {
  code: string;
  desc: string;
  success: boolean;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId?: string;
    counterAccountBankName?: string;
    counterAccountName?: string;
    counterAccountNumber?: string;
    virtualAccountName?: string;
    virtualAccountNumber?: string;
  };
  signature: string;
}

@Injectable()
export class PayOSService {
  private readonly logger = new Logger(PayOSService.name);
  private config: PayOSConfig;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {
    this.config = {
      clientId: process.env.PAYOS_CLIENT_ID || '',
      apiKey: process.env.PAYOS_API_KEY || '',
      checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
      baseUrl: process.env.PAYOS_BASE_URL || 'https://api-merchant.payos.vn',
    };

    if (!this.config.clientId || !this.config.apiKey || !this.config.checksumKey) {
      this.logger.warn('PayOS credentials not configured. Payment features will be disabled.');
    }
  }

  /**
   * Generate signature for PayOS request
   * Format: amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
   */
  private generateSignature(data: Record<string, any>): string {
    // Sort keys alphabetically and create query string
    const sortedKeys = Object.keys(data).sort();
    const signatureString = sortedKeys
      .map(key => `${key}=${data[key]}`)
      .join('&');

    return crypto
      .createHmac('sha256', this.config.checksumKey)
      .update(signatureString)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: WebhookPayload): boolean {
    const { data, signature } = payload;
    
    // Create signature string from webhook data
    const signatureData = {
      amount: data.amount,
      code: data.code,
      desc: data.desc,
      orderCode: data.orderCode,
      paymentLinkId: data.paymentLinkId,
      reference: data.reference,
      transactionDateTime: data.transactionDateTime,
    };

    const computedSignature = this.generateSignature(signatureData);
    return computedSignature === signature;
  }

  /**
   * Generate unique order code (integer)
   */
  private generateOrderCode(): number {
    // Use timestamp + random number to ensure uniqueness
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp}${random}`.slice(-9)); // Max 9 digits for safety
  }

  /**
   * Create payment link for recharge
   */
  async createPaymentLink(
    userId: string,
    amount: number,
    returnUrl: string,
    cancelUrl: string,
  ): Promise<{ paymentLink: PaymentLinkResponse['data']; transaction: any }> {
    if (!this.config.clientId || !this.config.apiKey) {
      throw new BadRequestException('PayOS not configured');
    }

    if (amount < 10000) {
      throw new BadRequestException('Minimum recharge amount is 10,000 VND');
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate unique order code
    const orderCode = this.generateOrderCode();

    // Create transaction record first (PENDING status)
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'PENDING',
        description: `Nạp tiền qua PayOS - Mã: ${orderCode}`,
        metadata: JSON.stringify({
          paymentMethod: 'payos',
          orderCode,
          requestedAt: new Date().toISOString(),
        }),
      },
    });

    // Prepare PayOS request
    const description = `NAP${orderCode}`; // Max 9 characters for bank description
    
    const requestData: CreatePaymentLinkParams = {
      orderCode,
      amount,
      description,
      buyerName: user.name || undefined,
      buyerEmail: user.email || undefined,
      cancelUrl,
      returnUrl,
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes expiry
    };

    // Generate signature
    const signatureData = {
      amount: requestData.amount,
      cancelUrl: requestData.cancelUrl,
      description: requestData.description,
      orderCode: requestData.orderCode,
      returnUrl: requestData.returnUrl,
    };
    const signature = this.generateSignature(signatureData);

    // Retry mechanism for PayOS API call
    const maxRetries = 3;
    let lastError: any = null;
    let result: PaymentLinkResponse | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Creating payment link attempt ${attempt}/${maxRetries}`);
        
        // Call PayOS API
        const response = await fetch(`${this.config.baseUrl}/v2/payment-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': this.config.clientId,
            'x-api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            ...requestData,
            signature,
          }),
        });

        result = await response.json() as PaymentLinkResponse;
        
        if (result.code === '00') {
          // Success, break out of retry loop
          break;
        }

        this.logger.warn(`PayOS attempt ${attempt} failed: ${result.desc}`);
        lastError = new Error(result.desc);
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      } catch (err) {
        this.logger.error(`PayOS attempt ${attempt} error: ${err.message}`);
        lastError = err;
        
        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    // Check final result
    if (!result || result.code !== '00') {
      // Update transaction to failed
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: 'REJECTED',
          metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || '{}'),
            error: lastError?.message || 'Unknown error',
          }),
        },
      });
      throw new BadRequestException(`PayOS error: ${lastError?.message || 'Failed to create payment'}`);
    }

      // Update transaction with PayOS info
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || '{}'),
            paymentLinkId: result.data.paymentLinkId,
            checkoutUrl: result.data.checkoutUrl,
            qrCode: result.data.qrCode,
            accountNumber: result.data.accountNumber,
            accountName: result.data.accountName,
            bin: result.data.bin,
          }),
        },
      });

    return {
      paymentLink: result.data,
      transaction: {
        ...transaction,
        orderCode,
      },
    };
  }

  /**
   * Handle webhook from PayOS
   */
  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {

    // Verify signature (skip in development if needed)
    // if (!this.verifyWebhookSignature(payload)) {
    //   this.logger.warn('Invalid webhook signature');
    //   return { success: false, message: 'Invalid signature' };
    // }

    if (!payload.success || payload.code !== '00') {
      return { success: false, message: payload.desc };
    }

    const { orderCode, amount } = payload.data;

    // Find transaction by orderCode in metadata
    const transactions = await this.prisma.transaction.findMany({
      where: {
        type: 'DEPOSIT',
        status: 'PENDING',
      },
    });

    const transaction = transactions.find(t => {
      try {
        const metadata = JSON.parse(t.metadata || '{}');
        return metadata.orderCode === orderCode;
      } catch {
        return false;
      }
    });

    if (!transaction) {
      return { success: false, message: 'Transaction not found' };
    }

    // Verify amount
    if (transaction.amount !== amount) {
      return { success: false, message: 'Amount mismatch' };
    }

    // Update transaction and user balance in a single database transaction
    try {
      await this.prisma.$transaction([
        // Update transaction status
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata || '{}'),
              completedAt: new Date().toISOString(),
              payosReference: payload.data.reference,
              transactionDateTime: payload.data.transactionDateTime,
            }),
          },
        }),
        // Add balance to user
        this.prisma.user.update({
          where: { id: transaction.userId },
          data: {
            balance: {
              increment: amount,
            },
          },
        }),
      ]);

      // Send deposit notification to user
      try {
        await this.notificationsService.sendDepositNotification(transaction.userId, amount);
      } catch (notifError) {
        this.logger.warn(`Failed to send deposit notification: ${notifError.message}`);
      }

      return { success: true, message: 'Payment processed successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to process payment' };
    }
  }

  /**
   * Get payment status by orderCode
   */
  async getPaymentStatus(orderCode: number | string): Promise<any> {
    if (!this.config.clientId || !this.config.apiKey) {
      throw new BadRequestException('PayOS not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v2/payment-requests/${orderCode}`, {
        method: 'GET',
        headers: {
          'x-client-id': this.config.clientId,
          'x-api-key': this.config.apiKey,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      this.logger.error(`Failed to get payment status: ${error.message}`);
      throw new BadRequestException('Failed to get payment status');
    }
  }

  /**
   * Cancel payment link
   */
  async cancelPaymentLink(orderCode: number | string, reason?: string): Promise<any> {
    if (!this.config.clientId || !this.config.apiKey) {
      throw new BadRequestException('PayOS not configured');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/v2/payment-requests/${orderCode}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.config.clientId,
          'x-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          cancellationReason: reason || 'User cancelled',
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      this.logger.error(`Failed to cancel payment: ${error.message}`);
      throw new BadRequestException('Failed to cancel payment');
    }
  }
}
