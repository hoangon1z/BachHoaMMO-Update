import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramService } from '../telegram/telegram.service';
import { PaymentGateway } from './payos.gateway';
import * as crypto from 'crypto';

interface PayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  baseUrl: string;
}

// Supported bank keys
export type BankKey = 'bidv' | 'mbbank';

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
  private configs: Record<BankKey, PayOSConfig>;

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private telegramService: TelegramService,
    private paymentGateway: PaymentGateway,
  ) {
    const baseUrl = process.env.PAYOS_BASE_URL || 'https://api-merchant.payos.vn';

    this.configs = {
      bidv: {
        clientId: process.env.PAYOS_CLIENT_ID || '',
        apiKey: process.env.PAYOS_API_KEY || '',
        checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
        baseUrl,
      },
      mbbank: {
        clientId: process.env.PAYOS_MB_CLIENT_ID || '',
        apiKey: process.env.PAYOS_MB_API_KEY || '',
        checksumKey: process.env.PAYOS_MB_CHECKSUM_KEY || '',
        baseUrl,
      },
    };

    // Log config status for each bank
    for (const [bank, cfg] of Object.entries(this.configs)) {
      if (!cfg.clientId || !cfg.apiKey || !cfg.checksumKey) {
        this.logger.warn(`PayOS [${bank.toUpperCase()}] credentials not configured.`);
      } else {
        this.logger.log(`PayOS [${bank.toUpperCase()}] configured ✓`);
      }
    }
  }

  /**
   * Get config for a specific bank. Falls back to BIDV if not specified.
   */
  private getConfig(bank?: BankKey): PayOSConfig {
    const key = bank || 'bidv';
    return this.configs[key] || this.configs.bidv;
  }

  /**
   * Check if a specific bank is configured
   */
  isBankConfigured(bank: BankKey): boolean {
    const cfg = this.configs[bank];
    return !!(cfg && cfg.clientId && cfg.apiKey && cfg.checksumKey);
  }

  /**
   * Get list of available (configured) banks
   */
  getAvailableBanks(): { key: BankKey; name: string; configured: boolean }[] {
    return [
      { key: 'bidv', name: 'BIDV', configured: this.isBankConfigured('bidv') },
      { key: 'mbbank', name: 'MB Bank', configured: this.isBankConfigured('mbbank') },
    ];
  }

  /**
   * Generate signature for PayOS request
   */
  private generateSignature(data: Record<string, any>, checksumKey: string): string {
    const sortedKeys = Object.keys(data).sort();
    const signatureString = sortedKeys
      .map(key => `${key}=${data[key]}`)
      .join('&');

    return crypto
      .createHmac('sha256', checksumKey)
      .update(signatureString)
      .digest('hex');
  }

  /**
   * Verify webhook signature for a specific bank
   */
  verifyWebhookSignature(payload: WebhookPayload, bank?: BankKey): boolean {
    const config = this.getConfig(bank);
    const { data, signature } = payload;

    const signatureData: Record<string, any> = {};
    if (data.amount !== undefined) signatureData.amount = data.amount;
    if (data.code !== undefined) signatureData.code = data.code;
    if (data.desc !== undefined) signatureData.desc = data.desc;
    if (data.orderCode !== undefined) signatureData.orderCode = data.orderCode;
    if (data.paymentLinkId !== undefined) signatureData.paymentLinkId = data.paymentLinkId;
    if (data.reference !== undefined) signatureData.reference = data.reference;
    if (data.transactionDateTime !== undefined) signatureData.transactionDateTime = data.transactionDateTime;

    const computedSignature = this.generateSignature(signatureData, config.checksumKey);

    if (computedSignature !== signature) {
      const sortedKeys = Object.keys(signatureData).sort();
      const signString = sortedKeys.map(k => `${k}=${signatureData[k]}`).join('&');
      this.logger.warn(`[${(bank || 'bidv').toUpperCase()}] Signature mismatch — computed: ${computedSignature.substring(0, 16)}... vs received: ${signature?.substring(0, 16)}...`);
      this.logger.warn(`Signature input: ${signString}`);
      return false;
    }

    return true;
  }

  /**
   * Verify payment via PayOS API (fallback when signature verification fails)
   */
  async verifyPaymentViaAPI(orderCode: number | string, amount: number, bank?: BankKey): Promise<boolean> {
    try {
      const status = await this.getPaymentStatus(orderCode, bank);
      if (status.code === '00' && status.data?.status === 'PAID' && status.data?.amount === amount) {
        this.logger.log(`Payment verified via PayOS API [${(bank || 'bidv').toUpperCase()}]: orderCode ${orderCode}, amount ${amount}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`PayOS API verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate unique order code (integer)
   */
  private generateOrderCode(): number {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp}${random}`.slice(-9));
  }

  /**
   * Create payment link for recharge
   */
  async createPaymentLink(
    userId: string,
    amount: number,
    returnUrl: string,
    cancelUrl: string,
    bank?: BankKey,
  ): Promise<{ paymentLink: PaymentLinkResponse['data']; transaction: any }> {
    const config = this.getConfig(bank);
    const bankLabel = (bank || 'bidv').toUpperCase();

    if (!config.clientId || !config.apiKey) {
      throw new BadRequestException(`PayOS [${bankLabel}] not configured`);
    }

    if (amount < 10000) {
      throw new BadRequestException('Minimum recharge amount is 10,000 VND');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const orderCode = this.generateOrderCode();

    // Create transaction record (PENDING status) — store bank info in metadata
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'PENDING',
        description: `Nạp tiền qua ${bankLabel} - Mã: ${orderCode}`,
        metadata: JSON.stringify({
          paymentMethod: 'payos',
          bank: bank || 'bidv',
          orderCode,
          requestedAt: new Date().toISOString(),
        }),
      },
    });

    const description = `NAP${orderCode}`;

    const requestData: CreatePaymentLinkParams = {
      orderCode,
      amount,
      description,
      buyerName: user.name || undefined,
      buyerEmail: user.email || undefined,
      cancelUrl,
      returnUrl,
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
    };

    const signatureData = {
      amount: requestData.amount,
      cancelUrl: requestData.cancelUrl,
      description: requestData.description,
      orderCode: requestData.orderCode,
      returnUrl: requestData.returnUrl,
    };
    const signature = this.generateSignature(signatureData, config.checksumKey);

    // Retry mechanism
    const maxRetries = 3;
    let lastError: any = null;
    let result: PaymentLinkResponse | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`[${bankLabel}] Creating payment link attempt ${attempt}/${maxRetries}`);

        const response = await fetch(`${config.baseUrl}/v2/payment-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': config.clientId,
            'x-api-key': config.apiKey,
          },
          body: JSON.stringify({
            ...requestData,
            signature,
          }),
        });

        result = await response.json() as PaymentLinkResponse;

        if (result.code === '00') {
          break;
        }

        this.logger.warn(`[${bankLabel}] PayOS attempt ${attempt} failed: ${result.desc}`);
        lastError = new Error(result.desc);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      } catch (err) {
        this.logger.error(`[${bankLabel}] PayOS attempt ${attempt} error: ${err.message}`);
        lastError = err;

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    }

    if (!result || result.code !== '00') {
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
   * IMPORTANT: This method must be idempotent
   */
  async handleWebhook(payload: WebhookPayload, bank?: BankKey): Promise<{ success: boolean; message: string }> {
    const bankLabel = (bank || 'bidv').toUpperCase();

    if (!payload.success || payload.code !== '00') {
      return { success: false, message: payload.desc };
    }

    const { orderCode, amount } = payload.data;

    this.logger.log(`[${bankLabel}] Processing payment webhook for orderCode: ${orderCode}, amount: ${amount}`);

    const orderCodeStr = String(orderCode);
    const candidates = await this.prisma.transaction.findMany({
      where: {
        type: 'DEPOSIT',
        status: { in: ['PENDING', 'COMPLETED'] },
        metadata: { contains: orderCodeStr },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const transaction = candidates.find(t => {
      try {
        const metadata = JSON.parse(t.metadata || '{}');
        return Number(metadata.orderCode) === Number(orderCode);
      } catch {
        return false;
      }
    });

    if (!transaction) {
      this.logger.warn(`[${bankLabel}] Transaction not found for orderCode: ${orderCode}`);
      return { success: false, message: 'Transaction not found' };
    }

    // IDEMPOTENCY CHECK
    if (transaction.status === 'COMPLETED') {
      this.logger.warn(`[${bankLabel}] Transaction ${transaction.id} already completed for orderCode: ${orderCode}. Skipping duplicate processing.`);
      return { success: true, message: 'Payment already processed' };
    }

    if (transaction.status !== 'PENDING') {
      this.logger.warn(`[${bankLabel}] Transaction ${transaction.id} has status ${transaction.status}, expected PENDING. Skipping.`);
      return { success: false, message: `Transaction status is ${transaction.status}, not PENDING` };
    }

    if (transaction.amount !== amount) {
      this.logger.warn(`[${bankLabel}] Amount mismatch for orderCode ${orderCode}: expected ${transaction.amount}, got ${amount}`);
      return { success: false, message: 'Amount mismatch' };
    }

    // ATOMIC CLAIM
    try {
      const updateResult = await this.prisma.transaction.updateMany({
        where: {
          id: transaction.id,
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
          metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || '{}'),
            completedAt: new Date().toISOString(),
            payosReference: payload.data.reference,
            transactionDateTime: payload.data.transactionDateTime,
          }),
        },
      });

      if (updateResult.count === 0) {
        this.logger.warn(`[${bankLabel}] Transaction ${transaction.id} was already claimed by another request. Skipping duplicate for orderCode: ${orderCode}`);
        return { success: true, message: 'Payment already processed' };
      }

      this.logger.log(`[${bankLabel}] Transaction ${transaction.id} claimed successfully. Adding balance ${amount} to user ${transaction.userId}`);

      await this.prisma.user.update({
        where: { id: transaction.userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Send deposit notification to user
      try {
        await this.notificationsService.sendDepositNotification(transaction.userId, amount, bank);
      } catch (notifError) {
        this.logger.warn(`Failed to send deposit notification: ${notifError.message}`);
      }

      // Send Telegram notification
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: transaction.userId },
          select: { email: true, name: true },
        });

        await this.telegramService.notifyDeposit({
          userEmail: user?.email || 'Unknown',
          userName: user?.name || undefined,
          amount,
          orderCode,
          transactionId: transaction.id,
          bank: bank || 'bidv',
        });
      } catch (tgError) {
        this.logger.warn(`Failed to send Telegram deposit notification: ${tgError.message}`);
      }

      // Push real-time WebSocket notification
      try {
        this.paymentGateway.notifyPaymentConfirmed(transaction.userId, {
          orderCode: Number(orderCode),
          amount,
          message: 'Thanh toán thành công!',
        });
      } catch (wsError) {
        this.logger.warn(`Failed to send WebSocket payment notification: ${wsError.message}`);
      }

      this.logger.log(`[${bankLabel}] Payment processed successfully for orderCode: ${orderCode}, transactionId: ${transaction.id}`);
      return { success: true, message: 'Payment processed successfully' };
    } catch (error) {
      this.logger.error(`Failed to process payment for orderCode ${orderCode}: ${error.message}`);
      return { success: false, message: 'Failed to process payment' };
    }
  }

  /**
   * Find a transaction by orderCode (for ownership verification)
   */
  async findTransactionByOrderCode(orderCode: string): Promise<{ id: string; userId: string; status: string; bank?: string } | null> {
    const candidates = await this.prisma.transaction.findMany({
      where: {
        type: 'DEPOSIT',
        metadata: { contains: orderCode },
      },
      select: { id: true, userId: true, status: true, metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const match = candidates.find(t => {
      try {
        const metadata = JSON.parse(t.metadata || '{}');
        return Number(metadata.orderCode) === Number(orderCode);
      } catch {
        return false;
      }
    });

    if (!match) return null;

    let bank: string | undefined;
    try {
      const metadata = JSON.parse(match.metadata || '{}');
      bank = metadata.bank;
    } catch { }

    return { id: match.id, userId: match.userId, status: match.status, bank };
  }

  /**
   * Get payment status by orderCode
   */
  async getPaymentStatus(orderCode: number | string, bank?: BankKey): Promise<any> {
    const config = this.getConfig(bank);

    if (!config.clientId || !config.apiKey) {
      throw new BadRequestException(`PayOS [${(bank || 'bidv').toUpperCase()}] not configured`);
    }

    try {
      const response = await fetch(`${config.baseUrl}/v2/payment-requests/${orderCode}`, {
        method: 'GET',
        headers: {
          'x-client-id': config.clientId,
          'x-api-key': config.apiKey,
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
  async cancelPaymentLink(orderCode: number | string, reason?: string, bank?: BankKey): Promise<any> {
    const config = this.getConfig(bank);

    if (!config.clientId || !config.apiKey) {
      throw new BadRequestException(`PayOS [${(bank || 'bidv').toUpperCase()}] not configured`);
    }

    try {
      const response = await fetch(`${config.baseUrl}/v2/payment-requests/${orderCode}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': config.clientId,
          'x-api-key': config.apiKey,
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
