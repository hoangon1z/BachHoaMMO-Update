import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac, randomBytes } from 'crypto';
import axios from 'axios';

// Webhook event types
export enum WebhookEvent {
  ORDER_CREATED = 'order.created',
  ORDER_PAID = 'order.paid',
  ORDER_COMPLETED = 'order.completed',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_DISPUTED = 'order.disputed',
  ORDER_REFUNDED = 'order.refunded',
  INVENTORY_LOW = 'inventory.low',
  INVENTORY_EMPTY = 'inventory.empty',
}

// Webhook payload interface
export interface WebhookPayload {
  event: string;
  timestamp: number;
  data: any;
}

// DTOs
export interface CreateWebhookDto {
  url: string;
  name?: string;
  events: string[];
}

export interface UpdateWebhookDto {
  url?: string;
  name?: string;
  events?: string[];
  isActive?: boolean;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  
  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [5000, 30000, 120000]; // 5s, 30s, 2min
  private readonly TIMEOUT = 10000; // 10s timeout
  
  constructor(private prisma: PrismaService) {}

  // ==================== WEBHOOK MANAGEMENT ====================

  /**
   * Get all webhooks for a seller
   */
  async getWebhooks(sellerId: string) {
    const webhooks = await this.prisma.sellerWebhook.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      name: w.name,
      events: JSON.parse(w.events),
      isActive: w.isActive,
      lastTriggeredAt: w.lastTriggeredAt,
      lastStatus: w.lastStatus,
      failureCount: w.failureCount,
      totalCalls: w.totalCalls,
      createdAt: w.createdAt,
    }));
  }

  /**
   * Create a new webhook
   */
  async createWebhook(sellerId: string, dto: CreateWebhookDto) {
    // Validate URL
    if (!this.isValidUrl(dto.url)) {
      throw new BadRequestException('Invalid webhook URL. Must be HTTPS.');
    }

    // Validate events
    const validEvents = Object.values(WebhookEvent);
    for (const event of dto.events) {
      if (!validEvents.includes(event as WebhookEvent)) {
        throw new BadRequestException(`Invalid event: ${event}`);
      }
    }

    // Check max webhooks limit (3 per seller)
    const count = await this.prisma.sellerWebhook.count({ where: { sellerId } });
    if (count >= 3) {
      throw new BadRequestException('Maximum 3 webhooks per seller');
    }

    // Generate secret
    const secret = randomBytes(32).toString('hex');

    const webhook = await this.prisma.sellerWebhook.create({
      data: {
        sellerId,
        url: dto.url,
        name: dto.name || 'Default Webhook',
        events: JSON.stringify(dto.events),
        secret,
        isActive: true,
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      name: webhook.name,
      events: dto.events,
      secret, // Only returned once!
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    };
  }

  /**
   * Update a webhook
   */
  async updateWebhook(sellerId: string, webhookId: string, dto: UpdateWebhookDto) {
    // Verify ownership
    const webhook = await this.prisma.sellerWebhook.findFirst({
      where: { id: webhookId, sellerId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Validate URL if provided
    if (dto.url && !this.isValidUrl(dto.url)) {
      throw new BadRequestException('Invalid webhook URL. Must be HTTPS.');
    }

    // Validate events if provided
    if (dto.events) {
      const validEvents = Object.values(WebhookEvent);
      for (const event of dto.events) {
        if (!validEvents.includes(event as WebhookEvent)) {
          throw new BadRequestException(`Invalid event: ${event}`);
        }
      }
    }

    const updated = await this.prisma.sellerWebhook.update({
      where: { id: webhookId },
      data: {
        url: dto.url,
        name: dto.name,
        events: dto.events ? JSON.stringify(dto.events) : undefined,
        isActive: dto.isActive,
        // Reset failure count when re-enabled
        failureCount: dto.isActive === true ? 0 : undefined,
      },
    });

    return {
      id: updated.id,
      url: updated.url,
      name: updated.name,
      events: JSON.parse(updated.events),
      isActive: updated.isActive,
    };
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(sellerId: string, webhookId: string) {
    // Verify ownership
    const webhook = await this.prisma.sellerWebhook.findFirst({
      where: { id: webhookId, sellerId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.prisma.sellerWebhook.delete({ where: { id: webhookId } });

    return { deleted: true };
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(sellerId: string, webhookId: string) {
    // Verify ownership
    const webhook = await this.prisma.sellerWebhook.findFirst({
      where: { id: webhookId, sellerId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const secret = randomBytes(32).toString('hex');

    await this.prisma.sellerWebhook.update({
      where: { id: webhookId },
      data: { secret },
    });

    return { secret };
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(sellerId: string, webhookId: string, limit = 50, offset = 0) {
    // Verify ownership
    const webhook = await this.prisma.sellerWebhook.findFirst({
      where: { id: webhookId, sellerId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    const [logs, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookLog.count({ where: { webhookId } }),
    ]);

    return {
      items: logs.map((l) => ({
        id: l.id,
        event: l.event,
        statusCode: l.statusCode,
        status: l.status,
        error: l.error,
        duration: l.duration,
        attempts: l.attempts,
        createdAt: l.createdAt,
        deliveredAt: l.deliveredAt,
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + logs.length < total,
      },
    };
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(sellerId: string, webhookId: string) {
    // Verify ownership
    const webhook = await this.prisma.sellerWebhook.findFirst({
      where: { id: webhookId, sellerId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Send test event
    const payload: WebhookPayload = {
      event: 'test',
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        message: 'This is a test webhook from BachHoaMMO',
        webhookId,
      },
    };

    const result = await this.deliverWebhook(webhook, payload);

    return {
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
      duration: result.duration,
    };
  }

  // ==================== WEBHOOK TRIGGERING ====================

  /**
   * Trigger webhooks for a specific event
   */
  async triggerEvent(sellerId: string, event: WebhookEvent, data: any) {
    // Find active webhooks subscribed to this event
    const webhooks = await this.prisma.sellerWebhook.findMany({
      where: {
        sellerId,
        isActive: true,
      },
    });

    // Filter webhooks that subscribe to this event
    const subscribedWebhooks = webhooks.filter((w) => {
      const events = JSON.parse(w.events) as string[];
      return events.includes(event);
    });

    if (subscribedWebhooks.length === 0) {
      this.logger.debug(`No webhooks subscribed to ${event} for seller ${sellerId}`);
      return;
    }

    // Create payload
    const payload: WebhookPayload = {
      event,
      timestamp: Math.floor(Date.now() / 1000),
      data,
    };

    // Trigger all webhooks (async, don't block)
    for (const webhook of subscribedWebhooks) {
      this.processWebhook(webhook, payload).catch((err) => {
        this.logger.error(`Failed to process webhook ${webhook.id}:`, err.message);
      });
    }
  }

  /**
   * Process a single webhook delivery with retries
   */
  private async processWebhook(webhook: any, payload: WebhookPayload) {
    // Create log entry
    const log = await this.prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        payload: JSON.stringify(payload),
        status: 'PENDING',
      },
    });

    let attempt = 0;
    let result: { success: boolean; statusCode?: number; error?: string; duration?: number };

    while (attempt < this.MAX_RETRIES) {
      attempt++;

      // Update log attempt count
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: { attempts: attempt, status: 'RETRYING' },
      });

      result = await this.deliverWebhook(webhook, payload);

      if (result.success) {
        // Success - update log and webhook
        await this.prisma.$transaction([
          this.prisma.webhookLog.update({
            where: { id: log.id },
            data: {
              status: 'SUCCESS',
              statusCode: result.statusCode,
              duration: result.duration,
              deliveredAt: new Date(),
            },
          }),
          this.prisma.sellerWebhook.update({
            where: { id: webhook.id },
            data: {
              lastTriggeredAt: new Date(),
              lastStatus: result.statusCode,
              failureCount: 0, // Reset on success
              totalCalls: { increment: 1 },
            },
          }),
        ]);

        this.logger.log(`Webhook ${webhook.id} delivered successfully for ${payload.event}`);
        return;
      }

      // Failed - wait before retry
      if (attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[attempt - 1];
        this.logger.warn(`Webhook ${webhook.id} failed (attempt ${attempt}), retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    await this.prisma.$transaction([
      this.prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          statusCode: result!.statusCode,
          error: result!.error,
          duration: result!.duration,
        },
      }),
      this.prisma.sellerWebhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          lastStatus: result!.statusCode,
          failureCount: { increment: 1 },
          totalCalls: { increment: 1 },
          // Auto-disable after 10 consecutive failures
          isActive: webhook.failureCount >= 9 ? false : undefined,
        },
      }),
    ]);

    this.logger.error(`Webhook ${webhook.id} failed after ${this.MAX_RETRIES} attempts for ${payload.event}`);
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(
    webhook: { url: string; secret: string },
    payload: WebhookPayload,
  ): Promise<{ success: boolean; statusCode?: number; error?: string; duration?: number }> {
    const startTime = Date.now();
    const payloadStr = JSON.stringify(payload);

    // Generate signature
    const signature = createHmac('sha256', webhook.secret)
      .update(payloadStr)
      .digest('hex');

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': payload.timestamp.toString(),
          'User-Agent': 'BachHoaMMO-Webhook/1.0',
        },
        timeout: this.TIMEOUT,
        validateStatus: () => true, // Accept all status codes
      });

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      return {
        success,
        statusCode: response.status,
        error: success ? undefined : `HTTP ${response.status}`,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error.code || error.message,
        duration,
      };
    }
  }

  // ==================== HELPERS ====================

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow HTTPS (except localhost for testing)
      return parsed.protocol === 'https:' || parsed.hostname === 'localhost';
    } catch {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get available webhook events
   */
  getAvailableEvents() {
    return Object.values(WebhookEvent).map((event) => ({
      event,
      description: this.getEventDescription(event),
    }));
  }

  private getEventDescription(event: WebhookEvent): string {
    const descriptions: Record<WebhookEvent, string> = {
      [WebhookEvent.ORDER_CREATED]: 'Đơn hàng mới được tạo',
      [WebhookEvent.ORDER_PAID]: 'Đơn hàng đã thanh toán (trigger giao hàng)',
      [WebhookEvent.ORDER_COMPLETED]: 'Đơn hàng hoàn thành',
      [WebhookEvent.ORDER_CANCELLED]: 'Đơn hàng bị hủy',
      [WebhookEvent.ORDER_DISPUTED]: 'Đơn hàng bị khiếu nại',
      [WebhookEvent.ORDER_REFUNDED]: 'Đơn hàng được hoàn tiền',
      [WebhookEvent.INVENTORY_LOW]: 'Kho hàng sắp hết (< 10 items)',
      [WebhookEvent.INVENTORY_EMPTY]: 'Kho hàng đã hết',
    };
    return descriptions[event];
  }
}
