import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TelegramService } from '../telegram/telegram.service';
import { WebhookService, WebhookEvent } from '../webhook/webhook.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DiscountCodesService } from '../discount-codes/discount-codes.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private telegramService: TelegramService,
    private webhookService: WebhookService,
    private notificationsService: NotificationsService,
    private discountCodesService: DiscountCodesService,
  ) { }

  /**
   * Create order with escrow and auto-delivery for digital products
   * 1. Validate stock/inventory
   * 2. Reserve inventory items
   * 3. Deduct money from buyer's wallet
   * 4. Create order
   * 5. Create escrow (hold money)
   * 6. Create deliveries (assign inventory to buyer)
   */
  async createOrder(
    buyerId: string,
    items: Array<{ productId: string; quantity: number; price: number; variantId?: string; variantName?: string; buyerProvidedData?: string; serviceLink?: string; serviceQuantity?: number }>,
    total: number,
    discountCodeStr?: string,
  ) {
    // Validate buyer has sufficient balance
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    // Get all products and validate
    const productIds = items.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        seller: true,
        accountTemplate: true,
        variants: true,
      },
    });

    if (products.length !== items.length) {
      throw new BadRequestException('Some products not found');
    }

    // Validate quantity and price for each item
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException('Số lượng sản phẩm phải lớn hơn 0');
      }
      if (!item.price || item.price <= 0) {
        throw new BadRequestException('Giá sản phẩm không hợp lệ');
      }
    }

    // Validate total > 0
    if (!total || total <= 0) {
      throw new BadRequestException('Tổng đơn hàng phải lớn hơn 0');
    }

    // For simplicity, assume single seller (in real app, split orders by seller)
    const sellerId = products[0].sellerId;

    // Check if all products are from same seller
    const allSameSeller = products.every(p => p.sellerId === sellerId);
    if (!allSameSeller) {
      throw new BadRequestException('All products must be from the same seller for this order');
    }

    // Check inventory availability for digital products (skip SERVICE products)
    // - autoDelivery = true: BẮT BUỘC phải có đủ hàng trong kho (throw lỗi nếu thiếu)
    // - autoDelivery = false: Nếu có hàng trong kho sẽ tự động giao, nếu không đủ seller giao thủ công phần còn lại
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      // SERVICE products don't need inventory
      if (product?.productType === 'SERVICE') continue;
      if (product?.isDigital && product.autoDelivery) {
        // Sản phẩm bật auto-delivery: BẮT BUỘC phải có đủ hàng
        const inventoryWhere: any = { productId: item.productId, status: 'AVAILABLE' };
        if (item.variantId) {
          inventoryWhere.variantId = item.variantId;
        }
        const availableCount = await this.prisma.productInventory.count({
          where: inventoryWhere,
        });
        const variantLabel = item.variantName ? ` (${item.variantName})` : '';
        if (availableCount < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm "${product.title}"${variantLabel} chỉ còn ${availableCount} trong kho`
          );
        }
      }
      // Nếu autoDelivery = false: không throw lỗi, hệ thống sẽ giao từ kho những gì có sẵn
    }

    // Validate and enrich SERVICE items
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product?.productType === 'SERVICE') {
        const requiredFields: string[] = product.requiredBuyerFields
          ? (typeof product.requiredBuyerFields === 'string' ? JSON.parse(product.requiredBuyerFields) : product.requiredBuyerFields)
          : [];

        // Try to extract serviceLink/serviceQuantity from buyerProvidedData if not provided directly
        if (!item.serviceLink && item.buyerProvidedData) {
          try {
            const bpd = typeof item.buyerProvidedData === 'string' ? JSON.parse(item.buyerProvidedData) : item.buyerProvidedData;
            if (bpd.link) item.serviceLink = bpd.link;
            if (bpd.quantity) item.serviceQuantity = parseInt(bpd.quantity);
          } catch { }
        }

        // Only validate serviceLink if 'link' is in requiredBuyerFields
        if (requiredFields.includes('link') && !item.serviceLink) {
          throw new BadRequestException(`Vui lòng nhập link/URL cho dịch vụ "${product.title}"`);
        }

        // Only validate serviceQuantity if 'quantity' is in requiredBuyerFields
        if (requiredFields.includes('quantity')) {
          if (!item.serviceQuantity || item.serviceQuantity <= 0) {
            throw new BadRequestException(`Số lượng dịch vụ không hợp lệ cho "${product.title}"`);
          }
          if (product.minQuantity && item.serviceQuantity < product.minQuantity) {
            throw new BadRequestException(`Số lượng tối thiểu cho "${product.title}" là ${product.minQuantity}`);
          }
          if (product.maxQuantity && item.serviceQuantity > product.maxQuantity) {
            throw new BadRequestException(`Số lượng tối đa cho "${product.title}" là ${product.maxQuantity}`);
          }
        }

        // Fallback: if no serviceQuantity, use item.quantity
        if (!item.serviceQuantity) {
          item.serviceQuantity = item.quantity;
        }
        // Fallback: if no serviceLink, use empty string for DB
        if (!item.serviceLink) {
          item.serviceLink = '';
        }
      }
    }

    // Validate và tính discount code (nếu có)
    let discountCodeObj: any = null;
    let discountAmount = 0;
    if (discountCodeStr && discountCodeStr.trim()) {
      const result = await this.discountCodesService.validateAndCalculate(
        discountCodeStr,
        total,
        sellerId,
        buyerId,
      );
      discountCodeObj = result.discountCode;
      discountAmount = result.discountAmount;
    }

    // Tổng tiền thực trả sau khi áp dụng mã giảm giá
    const finalTotal = Math.max(0, total - discountAmount);

    // Kiểm tra số dư đủ để thanh toán finalTotal
    if (buyer.balance < finalTotal) {
      throw new BadRequestException('Insufficient balance');
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate commission based on each product's commission rate
    let commission = 0;
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        // Use item.price which is the actual price being charged
        const itemTotal = item.price * item.quantity;
        // Fixed 5% platform commission for all products
        const PLATFORM_COMMISSION = 5;
        commission += itemTotal * (PLATFORM_COMMISSION / 100);
      }
    }
    // Commission tính trên finalTotal (sau giảm giá)
    const commissionRatio = total > 0 ? commission / total : 0;
    const finalCommission = Math.floor(finalTotal * commissionRatio);
    const sellerAmount = finalTotal - finalCommission;

    // Calculate dispute deadline based on product type
    const disputeDeadline = new Date();
    const maxDisputeHours = Math.max(
      ...products.map(p => p.accountTemplate?.disputeWindow || 24)
    );
    disputeDeadline.setHours(disputeDeadline.getHours() + maxDisputeHours);

    // Create order, deduct balance, and create escrow in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Deduct money from buyer (finalTotal = total - discountAmount)
      await tx.user.update({
        where: { id: buyerId },
        data: { balance: { decrement: finalTotal } },
      });

      // 2. Create purchase transaction
      await tx.transaction.create({
        data: {
          userId: buyerId,
          type: 'PURCHASE',
          amount: finalTotal,
          status: 'COMPLETED',
          description: `Thanh toán đơn hàng ${orderNumber}${discountAmount > 0 ? ` (giảm ${discountAmount.toLocaleString('vi-VN')}đ)` : ''}`,
        },
      });

      // 3. Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId,
          sellerId,
          status: 'PROCESSING',
          subtotal: total,
          commission: finalCommission,
          total: finalTotal,
          discountCodeId: discountCodeObj?.id ?? null,
          discountAmount: discountAmount > 0 ? discountAmount : 0,
          disputeDeadline,
        },
      });

      // 3b. Ghi nhận sử dụng mã giảm giá (nếu có)
      if (discountCodeObj) {
        await this.discountCodesService.recordUsage(
          tx,
          discountCodeObj.id,
          buyerId,
          order.id,
          discountAmount,
        );
      }

      // 4. Create order items and handle inventory
      const orderItems = [];
      const deliveries = [];

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);

        // Create order item với buyerProvidedData (cho sản phẩm UPGRADE)
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            deliveredQuantity: 0,
            // Lưu variant info (để seller biết khách mua loại nào)
            variantId: item.variantId || null,
            variantName: item.variantName || null,
            // Lưu thông tin buyer cung cấp (email để upgrade) nếu có
            buyerProvidedData: item.buyerProvidedData || null,
            // Lưu loại sản phẩm tại thời điểm mua
            productType: product?.productType || 'STANDARD',
            // SERVICE fields
            serviceLink: item.serviceLink || null,
            serviceQuantity: item.serviceQuantity || null,
          },
        });
        orderItems.push(orderItem);

        // Handle digital product delivery - tự động giao từ kho nếu có hàng
        // SERVICE products skip inventory delivery entirely
        if (product?.productType === 'SERVICE') {
          // Create ServiceOrder for SERVICE products
          await tx.serviceOrder.create({
            data: {
              orderItemId: orderItem.id,
              productId: item.productId,
              buyerId,
              sellerId,
              serviceLink: item.serviceLink!,
              platform: product.servicePlatform || 'OTHER',
              serviceType: product.serviceType || 'OTHER',
              quantity: item.serviceQuantity!,
              status: 'PENDING',
              warrantyDays: product.warrantyDays || 0,
            },
          });
        } else if (product?.isDigital) {
          // STANDARD/UPGRADE: giao từ kho nếu có hàng
          const inventoryWhere: any = { productId: item.productId, status: 'AVAILABLE' };
          if (item.variantId) {
            inventoryWhere.variantId = item.variantId;
          }
          const inventoryItems = await tx.productInventory.findMany({
            where: inventoryWhere,
            take: item.quantity,
            orderBy: { createdAt: 'asc' }, // FIFO - First In First Out
          });

          if (inventoryItems.length > 0) {
            // Mark inventory as SOLD and create deliveries
            for (const inv of inventoryItems) {
              await tx.productInventory.update({
                where: { id: inv.id },
                data: {
                  status: 'SOLD',
                  soldAt: new Date(),
                  soldToId: buyerId,
                  orderId: order.id,
                  orderItemId: orderItem.id,
                },
              });

              const delivery = await tx.orderDelivery.create({
                data: {
                  orderId: order.id,
                  orderItemId: orderItem.id,
                  inventoryId: inv.id,
                  accountData: inv.accountData,
                },
              });
              deliveries.push(delivery);
            }

            // Update delivered quantity in DB AND in-memory object
            await tx.orderItem.update({
              where: { id: orderItem.id },
              data: { deliveredQuantity: inventoryItems.length },
            });
            orderItem.deliveredQuantity = inventoryItems.length;
          }
        }

        // Update product sales count (stock already managed via inventory)
        await tx.product.update({
          where: { id: item.productId },
          data: {
            sales: { increment: item.quantity },
          },
        });

        // Update product stock based on available inventory
        const newStock = await tx.productInventory.count({
          where: { productId: item.productId, status: 'AVAILABLE' },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock },
        });

        // Nếu có variant, cập nhật stock của variant đó
        if (item.variantId) {
          const variantStock = await tx.productInventory.count({
            where: { productId: item.productId, variantId: item.variantId, status: 'AVAILABLE' },
          });
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: variantStock },
          });
        }
      }

      // Update seller's totalSales in SellerProfile
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      await tx.sellerProfile.updateMany({
        where: { userId: sellerId },
        data: {
          totalSales: { increment: totalQuantity },
        },
      });

      // 5. Update order status and delivery time
      const allDelivered = orderItems.every((oi, idx) => {
        const item = items[idx];
        const product = products.find(p => p.id === item.productId);
        // SERVICE products: order stays PENDING until seller processes
        if (product?.productType === 'SERVICE') return false;
        return oi.deliveredQuantity >= item.quantity;
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: allDelivered ? 'COMPLETED' : 'PENDING',
          deliveredAt: allDelivered ? new Date() : null,
        },
      });

      // 6. Create escrow (hold money for 3 days)
      const holdUntil = new Date();
      holdUntil.setDate(holdUntil.getDate() + 3); // 3 days from now

      const escrow = await tx.escrow.create({
        data: {
          orderId: order.id,
          buyerId,
          sellerId,
          amount: sellerAmount, // Amount minus commission
          status: 'HOLDING',
          holdUntil,
        },
      });

      return {
        order,
        orderItems,
        escrow,
        deliveries,
        deliveredCount: deliveries.length,
        sellerId,
        buyerName: buyer.name || buyer.email,
        products,
      };
    });

    // Send Telegram notification to seller (async, don't block response)
    this.sendNewOrderNotification(result).catch(err => {
      console.error('Failed to send Telegram notification:', err.message);
    });

    // Trigger webhook events (async, don't block response)
    this.triggerOrderWebhooks(result).catch(err => {
      console.error('Failed to trigger webhooks:', err.message);
    });

    return result;
  }

  /**
   * Trigger webhook events for order
   */
  private async triggerOrderWebhooks(result: {
    order: any;
    orderItems: any[];
    deliveries: any[];
    sellerId: string;
    buyerName: string;
    products: any[];
  }) {
    try {
      // Build webhook payload
      const orderData = {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
        total: result.order.total,
        buyerName: result.buyerName,
        items: result.orderItems.map((oi, idx) => {
          const product = result.products.find(p => p.id === oi.productId);
          return {
            orderItemId: oi.id,
            productId: oi.productId,
            productTitle: product?.title || 'Unknown',
            variantId: oi.variantId,
            quantity: oi.quantity,
            price: oi.price,
            total: oi.total,
            deliveredQuantity: oi.deliveredQuantity,
            productType: product?.productType || 'STANDARD',
            autoDelivery: product?.autoDelivery ?? true,
            // Include buyer provided data for UPGRADE products
            buyerProvidedData: oi.buyerProvidedData ? JSON.parse(oi.buyerProvidedData) : undefined,
          };
        }),
        deliveredCount: result.deliveries.length,
        createdAt: result.order.createdAt,
      };

      // Trigger order.created event
      await this.webhookService.triggerEvent(
        result.sellerId,
        WebhookEvent.ORDER_CREATED,
        orderData,
      );

      // If order is already paid (which it is in our system), trigger order.paid
      // This is the main event for automated delivery systems
      await this.webhookService.triggerEvent(
        result.sellerId,
        WebhookEvent.ORDER_PAID,
        orderData,
      );

      // Check inventory levels and trigger inventory events
      for (const item of result.orderItems) {
        const product = result.products.find(p => p.id === item.productId);
        if (product?.isDigital) {
          const availableCount = await this.prisma.productInventory.count({
            where: { productId: item.productId, status: 'AVAILABLE' },
          });

          if (availableCount === 0) {
            await this.webhookService.triggerEvent(
              result.sellerId,
              WebhookEvent.INVENTORY_EMPTY,
              {
                productId: item.productId,
                productTitle: product.title,
                availableCount: 0,
              },
            );
          } else if (availableCount < 10) {
            await this.webhookService.triggerEvent(
              result.sellerId,
              WebhookEvent.INVENTORY_LOW,
              {
                productId: item.productId,
                productTitle: product.title,
                availableCount,
              },
            );
          }
        }
      }
    } catch (error) {
      console.error('Webhook trigger error:', error);
    }
  }

  /**
   * Send Telegram notification for new order
   */
  private async sendNewOrderNotification(result: {
    order: any;
    orderItems: any[];
    sellerId: string;
    buyerName: string;
    products: any[];
  }) {
    try {
      const items = result.orderItems.map(oi => {
        const product = result.products.find(p => p.id === oi.productId);
        return {
          title: product?.title || 'Sản phẩm',
          quantity: oi.quantity,
        };
      });

      // Send Telegram notification
      await this.telegramService.notifyNewOrder(result.sellerId, {
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        buyerName: result.buyerName,
        items,
      });
    } catch (error) {
      console.error('Telegram notification error:', error);
    }

    // Send in-app notification to seller
    try {
      await this.notificationsService.sendNewOrderNotification(
        result.sellerId,
        result.order.id,
        result.order.orderNumber,
        result.order.total,
        result.buyerName,
      );
    } catch (error) {
      console.error('In-app notification error:', error);
    }
  }

  /**
   * Get user orders (as buyer)
   */
  async getUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        escrow: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  /**
   * Get seller orders (as seller)
   */
  async getSellerOrders(sellerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { sellerId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        escrow: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  /**
   * Get order details with deliveries (for buyer)
   */
  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                accountTemplate: true,
              },
            },
            deliveries: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            sellerProfile: {
              select: {
                shopName: true,
                shopLogo: true,
              },
            },
          },
        },
        escrow: true,
        deliveries: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if user is buyer or seller
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new BadRequestException('Unauthorized to view this order');
    }

    // If buyer is viewing, track that they viewed the deliveries
    if (order.buyerId === userId && order.deliveries.length > 0) {
      // Update view count for deliveries that haven't been viewed
      const unviewedDeliveries = order.deliveries.filter(d => !d.viewedAt);
      if (unviewedDeliveries.length > 0) {
        await this.prisma.orderDelivery.updateMany({
          where: {
            id: { in: unviewedDeliveries.map(d => d.id) },
            viewedAt: null,
          },
          data: {
            viewedAt: new Date(),
            viewCount: 1,
          },
        });
      }

      // Increment view count for already viewed deliveries
      await this.prisma.orderDelivery.updateMany({
        where: {
          orderId,
          viewedAt: { not: null },
        },
        data: {
          viewCount: { increment: 1 },
        },
      });
    }

    // Parse account data for buyer view
    const isBuyer = order.buyerId === userId;

    // Format response with parsed account data
    const formattedOrder = {
      ...order,
      items: order.items.map(item => ({
        ...item,
        deliveries: isBuyer ? item.deliveries.map(d => ({
          ...d,
          parsedData: this.parseAccountData(
            d.accountData,
            item.product.accountTemplate?.fields
          ),
        })) : [], // Don't show delivery data to seller
      })),
    };

    return formattedOrder;
  }

  /**
   * Parse account data based on template fields
   */
  private parseAccountData(accountData: string, fieldsJson?: string | null) {
    if (!fieldsJson) {
      return { data: accountData };
    }

    try {
      const fields = JSON.parse(fieldsJson) as string[];
      const values = accountData.split('|');
      const parsed: Record<string, string> = {};

      fields.forEach((field, index) => {
        parsed[field] = values[index] || '';
      });

      return parsed;
    } catch {
      return { data: accountData };
    }
  }

  /**
   * Buyer confirms receipt of order
   */
  async confirmOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { escrow: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new BadRequestException('Only buyer can confirm the order');
    }

    if (order.confirmedAt) {
      throw new BadRequestException('Order already confirmed');
    }

    // Update order and release escrow early
    const result = await this.prisma.$transaction(async (tx) => {
      // Mark order as confirmed
      await tx.order.update({
        where: { id: orderId },
        data: {
          confirmedAt: new Date(),
          status: 'COMPLETED',
        },
      });

      // Release escrow early if exists
      if (order.escrow && order.escrow.status === 'HOLDING') {
        await tx.escrow.update({
          where: { id: order.escrow.id },
          data: {
            status: 'RELEASED',
            releasedAt: new Date(),
          },
        });

        // Add money to seller
        await tx.user.update({
          where: { id: order.sellerId },
          data: {
            balance: { increment: order.escrow.amount },
          },
        });

        // Create earning transaction
        await tx.transaction.create({
          data: {
            userId: order.sellerId,
            type: 'EARNING',
            amount: order.escrow.amount,
            status: 'COMPLETED',
            description: `Nhận tiền từ đơn hàng ${order.orderNumber} (xác nhận sớm)`,
            orderId: order.id,
          },
        });
      }

      return { message: 'Xác nhận đơn hàng thành công' };
    });

    return result;
  }

  /**
   * Release escrow to seller (called by cron job after 3 days)
   */
  async releaseEscrow(escrowId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { order: true },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== 'HOLDING') {
      throw new BadRequestException('Escrow already processed');
    }

    // Check if hold period has passed
    if (new Date() < escrow.holdUntil) {
      throw new BadRequestException('Escrow hold period has not expired yet');
    }

    // Release money to seller
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update escrow status
      const updatedEscrow = await tx.escrow.update({
        where: { id: escrowId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      });

      // 2. Add money to seller's balance
      await tx.user.update({
        where: { id: escrow.sellerId },
        data: {
          balance: { increment: escrow.amount },
        },
      });

      // 3. Create earning transaction for seller
      await tx.transaction.create({
        data: {
          userId: escrow.sellerId,
          type: 'EARNING',
          amount: escrow.amount,
          status: 'COMPLETED',
          description: `Nhận tiền từ đơn hàng ${escrow.order.orderNumber}`,
          orderId: escrow.orderId,
        },
      });

      // 4. Update order status
      await tx.order.update({
        where: { id: escrow.orderId },
        data: { status: 'COMPLETED' },
      });

      // 5. Notify seller about earnings
      await tx.notification.create({
        data: {
          userId: escrow.sellerId,
          type: 'ORDER',
          title: 'Đã nhận tiền từ đơn hàng',
          message: `Bạn đã nhận ${escrow.amount.toLocaleString('vi-VN')}đ từ đơn hàng #${escrow.order.orderNumber}. Tiền đã được cộng vào ví.`,
          link: `/seller/orders`,
          icon: 'Wallet',
        },
      });

      return updatedEscrow;
    });

    return result;
  }

  /**
   * Get all escrows ready to be released
   */
  async getReleasableEscrows() {
    const now = new Date();

    const escrows = await this.prisma.escrow.findMany({
      where: {
        status: 'HOLDING',
        holdUntil: {
          lte: now,
        },
      },
      include: {
        order: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return escrows;
  }

  /**
   * Submit review for completed order
   */
  async submitReview(
    orderId: string,
    userId: string,
    data: { rating: number; comment?: string; isAnonymous?: boolean },
  ) {
    // Validate order exists and belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new BadRequestException('You can only review your own orders');
    }

    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed orders');
    }

    // Check if already reviewed
    const existingReview = await this.prisma.review.findUnique({
      where: { orderId },
    });

    if (existingReview) {
      throw new BadRequestException('Order already reviewed');
    }

    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Get first product from order
    const productId = order.items[0]?.productId;
    if (!productId) {
      throw new BadRequestException('Order has no products');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        orderId,
        productId,
        buyerId: userId,
        sellerId: order.sellerId,
        rating: data.rating,
        comment: data.comment,
        isAnonymous: data.isAnonymous || false,
      },
    });

    // Update product rating
    const productReviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const avgRating =
      productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;

    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: avgRating },
    });

    // Update seller rating
    const sellerReviews = await this.prisma.review.findMany({
      where: { sellerId: order.sellerId },
      select: { rating: true },
    });

    const sellerAvgRating =
      sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;

    await this.prisma.sellerProfile.updateMany({
      where: { userId: order.sellerId },
      data: { rating: sellerAvgRating },
    });

    return { success: true, review };
  }

  /**
   * Get review for an order
   */
  async getOrderReview(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only buyer or seller can see the review
    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new BadRequestException('Access denied');
    }

    const review = await this.prisma.review.findUnique({
      where: { orderId },
    });

    return review;
  }

  /**
   * Get delivery data for file download
   * Validates buyer ownership and returns delivery info
   */
  async getDeliveryForDownload(orderId: string, deliveryId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new BadRequestException('Chỉ người mua mới có thể tải file');
    }

    const delivery = await this.prisma.orderDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        inventory: {
          select: {
            id: true,
            accountData: true,
          },
        },
      },
    });

    if (!delivery || delivery.orderId !== orderId) {
      throw new NotFoundException('Delivery not found');
    }

    // Extract original file name from accountData metadata if it's a FILE type
    let originalFileName: string | null = null;
    if (delivery.accountData.startsWith('FILE:')) {
      // The accountData format is FILE:path/to/file
      // Try to get original filename from path
      const filePath = delivery.accountData.replace('FILE:', '');
      const parts = filePath.split('/');
      originalFileName = parts[parts.length - 1];
    }

    // Update view tracking
    if (!delivery.viewedAt) {
      await this.prisma.orderDelivery.update({
        where: { id: deliveryId },
        data: { viewedAt: new Date(), viewCount: 1 },
      });
    } else {
      await this.prisma.orderDelivery.update({
        where: { id: deliveryId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return {
      accountData: delivery.accountData,
      originalFileName,
    };
  }
}
