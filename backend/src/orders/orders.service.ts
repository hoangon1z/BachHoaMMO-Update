import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private telegramService: TelegramService,
  ) {}

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
    items: Array<{ productId: string; quantity: number; price: number }>,
    total: number,
  ) {
    // Validate buyer has sufficient balance
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    if (buyer.balance < total) {
      throw new BadRequestException('Insufficient balance');
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

    // For simplicity, assume single seller (in real app, split orders by seller)
    const sellerId = products[0].sellerId;
    
    // Check if all products are from same seller
    const allSameSeller = products.every(p => p.sellerId === sellerId);
    if (!allSameSeller) {
      throw new BadRequestException('All products must be from the same seller for this order');
    }

    // Check inventory availability for digital products with auto-delivery
    // Skip check if product allows manual delivery (autoDelivery = false)
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      // Chỉ check inventory nếu sản phẩm số VÀ bật auto-delivery
      // Nếu autoDelivery = false, seller sẽ giao thủ công nên không cần có hàng trong kho
      if (product?.isDigital && product.autoDelivery) {
        const availableCount = await this.prisma.productInventory.count({
          where: { productId: item.productId, status: 'AVAILABLE' },
        });
        if (availableCount < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm "${product.title}" chỉ còn ${availableCount} trong kho`
          );
        }
      }
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
        const productCommission = (product as any).commission || 5; // Default 5% if not set
        commission += itemTotal * (productCommission / 100);
      }
    }
    const sellerAmount = total - commission;

    // Calculate dispute deadline based on product type
    const disputeDeadline = new Date();
    const maxDisputeHours = Math.max(
      ...products.map(p => p.accountTemplate?.disputeWindow || 24)
    );
    disputeDeadline.setHours(disputeDeadline.getHours() + maxDisputeHours);

    // Create order, deduct balance, and create escrow in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Deduct money from buyer
      await tx.user.update({
        where: { id: buyerId },
        data: { balance: { decrement: total } },
      });

      // 2. Create purchase transaction
      await tx.transaction.create({
        data: {
          userId: buyerId,
          type: 'PURCHASE',
          amount: total,
          status: 'COMPLETED',
          description: `Thanh toán đơn hàng ${orderNumber}`,
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
          commission,
          total,
          disputeDeadline,
        },
      });

      // 4. Create order items and handle inventory
      const orderItems = [];
      const deliveries = [];

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        
        // Create order item
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            deliveredQuantity: 0,
          },
        });
        orderItems.push(orderItem);

        // Handle digital product delivery
        if (product?.isDigital && product.autoDelivery) {
          // Get available inventory items
          const inventoryItems = await tx.productInventory.findMany({
            where: { productId: item.productId, status: 'AVAILABLE' },
            take: item.quantity,
            orderBy: { createdAt: 'asc' }, // FIFO - First In First Out
          });

          // Mark inventory as SOLD and create deliveries
          for (const inv of inventoryItems) {
            // Update inventory status
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

            // Create delivery record
            const delivery = await tx.orderDelivery.create({
              data: {
                orderId: order.id,
                orderItemId: orderItem.id,
                inventoryId: inv.id,
                accountData: inv.accountData, // Copy data at time of delivery
              },
            });
            deliveries.push(delivery);
          }

          // Update delivered quantity
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: { deliveredQuantity: inventoryItems.length },
          });
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
      }

      // 5. Update order status and delivery time
      const allDelivered = orderItems.every((oi, idx) => {
        const item = items[idx];
        return oi.deliveredQuantity >= item.quantity;
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: allDelivered ? 'PROCESSING' : 'PENDING',
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

    return result;
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

      await this.telegramService.notifyNewOrder(result.sellerId, {
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        buyerName: result.buyerName,
        items,
      });
    } catch (error) {
      console.error('Telegram notification error:', error);
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
}
