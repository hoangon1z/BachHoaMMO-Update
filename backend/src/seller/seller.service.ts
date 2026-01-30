import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStoreDto,
  UpdateStoreDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  CreateWithdrawalDto,
  UpdateComplaintDto,
  SendComplaintMessageDto,
  UpdateOrderStatusDto,
} from './dto/seller.dto';

@Injectable()
export class SellerService {
  constructor(private prisma: PrismaService) {}

  // ==================== STORE MANAGEMENT ====================

  async createStore(userId: string, dto: CreateStoreDto) {
    // Check if user already has a store
    const existingStore = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (existingStore) {
      throw new BadRequestException('Bạn đã có cửa hàng');
    }

    // Create seller profile and update user role
    const [sellerProfile] = await this.prisma.$transaction([
      this.prisma.sellerProfile.create({
        data: {
          userId,
          shopName: dto.shopName,
          shopDescription: dto.shopDescription,
          shopLogo: dto.shopLogo,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { 
          role: 'SELLER',
          isSeller: true,
        },
      }),
    ]);

    return sellerProfile;
  }

  async getStore(userId: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            balance: true,
            createdAt: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    return store;
  }

  async updateStore(userId: string, dto: UpdateStoreDto) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async updateShopLogo(userId: string, logoUrl: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    const updatedStore = await this.prisma.sellerProfile.update({
      where: { userId },
      data: { shopLogo: logoUrl },
    });

    return {
      success: true,
      shopLogo: logoUrl,
      store: updatedStore,
    };
  }

  // ==================== PRODUCT/INVENTORY MANAGEMENT ====================

  async createProduct(userId: string, dto: CreateProductDto) {
    // Verify seller has a store
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!store) {
      throw new ForbiddenException('Bạn cần tạo cửa hàng trước');
    }

    const { variants, hasVariants, ...productData } = dto;

    // If product has variants, create product with variants
    if (hasVariants && variants && variants.length > 0) {
      return this.prisma.product.create({
        data: {
          ...productData,
          sellerId: userId,
          status: 'ACTIVE',
          hasVariants: true,
          variants: {
            create: variants.map((v, index) => ({
              name: v.name,
              price: v.price,
              salePrice: v.salePrice,
              stock: v.stock,
              sku: v.sku,
              attributes: v.attributes,
              position: index,
            })),
          },
        },
        include: {
          category: true,
          variants: {
            orderBy: { position: 'asc' },
          },
        },
      });
    }

    // No variants - create simple product
    return this.prisma.product.create({
      data: {
        ...productData,
        sellerId: userId,
        status: 'ACTIVE',
      },
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async getProducts(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { sellerId: userId };
    
    if (status) {
      where.status = status;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return product;
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  async updateStock(userId: string, productId: string, dto: UpdateStockDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const status = dto.stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE';

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        stock: dto.stock,
        status: product.status === 'INACTIVE' ? 'INACTIVE' : status,
      },
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Soft delete by setting status to INACTIVE
    return this.prisma.product.update({
      where: { id: productId },
      data: { status: 'INACTIVE' },
    });
  }

  // ==================== ORDER MANAGEMENT ====================

  async getOrders(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { sellerId: userId };
    
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: true,
                  autoDelivery: true,
                  isDigital: true,
                },
              },
              deliveries: true,
            },
          },
          escrow: true,
          deliveries: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Map orders with delivery status info
    const ordersWithDeliveryInfo = orders.map(order => {
      const items = order.items.map(item => {
        const isAutoDelivery = item.product.autoDelivery;
        const deliveredQuantity = item.deliveries?.length || 0;
        const needsManualDelivery = !isAutoDelivery && deliveredQuantity < item.quantity;
        
        return {
          ...item,
          isAutoDelivery,
          deliveredQuantity,
          needsManualDelivery,
          pendingDeliveryCount: item.quantity - deliveredQuantity,
        };
      });

      // Check if order needs manual delivery
      const needsManualDelivery = items.some(item => item.needsManualDelivery);
      const allDelivered = items.every(item => item.deliveredQuantity >= item.quantity);

      return {
        ...order,
        items,
        needsManualDelivery,
        allDelivered,
      };
    });

    return {
      orders: ordersWithDeliveryInfo,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: true,
                autoDelivery: true,
                isDigital: true,
              },
            },
            deliveries: true,
          },
        },
        escrow: true,
        deliveries: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Map items with delivery info
    const items = order.items.map(item => {
      const isAutoDelivery = item.product.autoDelivery;
      const deliveredQuantity = item.deliveries?.length || 0;
      const needsManualDelivery = !isAutoDelivery && deliveredQuantity < item.quantity;
      
      return {
        ...item,
        isAutoDelivery,
        deliveredQuantity,
        needsManualDelivery,
        pendingDeliveryCount: item.quantity - deliveredQuantity,
      };
    });

    const needsManualDelivery = items.some(item => item.needsManualDelivery);
    const allDelivered = items.every(item => item.deliveredQuantity >= item.quantity);

    return {
      ...order,
      items,
      needsManualDelivery,
      allDelivered,
    };
  }

  async updateOrderStatus(userId: string, orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      REFUNDED: [],
    };

    if (!validTransitions[order.status]?.includes(dto.status)) {
      throw new BadRequestException(`Không thể chuyển từ ${order.status} sang ${dto.status}`);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        notes: dto.notes || order.notes,
      },
      include: {
        items: true,
        escrow: true,
      },
    });
  }

  /**
   * Manual delivery - Seller giao tài khoản thủ công
   */
  async manualDeliver(
    userId: string,
    orderId: string,
    deliveries: Array<{ orderItemId: string; accountData: string }>,
  ) {
    // Verify order belongs to seller
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
      include: {
        items: {
          include: {
            product: true,
            deliveries: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException('Không thể giao hàng cho đơn đã hủy hoặc hoàn tiền');
    }

    const results = [];

    for (const delivery of deliveries) {
      const result = await this.manualDeliverItem(
        userId,
        orderId,
        delivery.orderItemId,
        delivery.accountData,
      );
      results.push(result);
    }

    return {
      message: `Đã giao ${results.length} tài khoản thành công`,
      deliveries: results,
    };
  }

  /**
   * Manual delivery for single item
   */
  async manualDeliverItem(
    userId: string,
    orderId: string,
    orderItemId: string,
    accountData: string,
  ) {
    // Verify order and item
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
      include: {
        items: {
          where: { id: orderItemId },
          include: {
            product: true,
            deliveries: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const orderItem = order.items[0];
    if (!orderItem) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong đơn hàng');
    }

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException('Không thể giao hàng cho đơn đã hủy hoặc hoàn tiền');
    }

    // Check if item is already fully delivered
    const deliveredCount = orderItem.deliveries?.length || 0;
    if (deliveredCount >= orderItem.quantity) {
      throw new BadRequestException('Sản phẩm này đã được giao đủ số lượng');
    }

    // Create hash for the account data
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(accountData).digest('hex');

    // Create inventory record (for tracking) and delivery in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create a "virtual" inventory record for manual delivery
      const inventory = await tx.productInventory.create({
        data: {
          productId: orderItem.productId,
          variantId: orderItem.variantId,
          accountData: accountData,
          hash: `manual-${orderId}-${orderItemId}-${Date.now()}-${hash}`,
          status: 'SOLD',
          soldAt: new Date(),
          soldToId: order.buyerId,
          orderId: orderId,
          orderItemId: orderItemId,
        },
      });

      // Create delivery record
      const delivery = await tx.orderDelivery.create({
        data: {
          orderId: orderId,
          orderItemId: orderItemId,
          inventoryId: inventory.id,
          accountData: accountData,
        },
      });

      // Update delivered quantity
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          deliveredQuantity: { increment: 1 },
        },
      });

      // Check if all items are delivered
      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              deliveries: true,
            },
          },
        },
      });

      const allDelivered = updatedOrder?.items.every(
        item => (item.deliveries?.length || 0) >= item.quantity
      );

      // Update order status if all delivered
      if (allDelivered && order.status === 'PENDING') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PROCESSING',
            deliveredAt: new Date(),
          },
        });
      }

      return delivery;
    });

    return {
      message: 'Giao tài khoản thành công',
      delivery: result,
    };
  }

  // ==================== COMPLAINT MANAGEMENT ====================

  async getComplaints(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { sellerId: userId };
    
    if (status) {
      where.status = status;
    }

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          order: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getComplaint(userId: string, complaintId: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id: complaintId,
        sellerId: userId,
      },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    return complaint;
  }

  async updateComplaint(userId: string, complaintId: string, dto: UpdateComplaintDto) {
    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id: complaintId,
        sellerId: userId,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    const updateData: any = { ...dto };
    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
    });
  }

  async sendComplaintMessage(userId: string, complaintId: string, dto: SendComplaintMessageDto) {
    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id: complaintId,
        sellerId: userId,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    if (complaint.status === 'CLOSED') {
      throw new BadRequestException('Khiếu nại đã đóng');
    }

    return this.prisma.complaintMessage.create({
      data: {
        complaintId,
        senderId: userId,
        message: dto.message,
        attachments: dto.attachments,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // ==================== WITHDRAWAL MANAGEMENT ====================

  async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    // Get user balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.balance < dto.amount) {
      throw new BadRequestException('Số dư không đủ');
    }

    // Calculate fee (2% fee for withdrawals)
    const feeRate = 0.02;
    const fee = Math.round(dto.amount * feeRate);
    const netAmount = dto.amount - fee;

    // Create withdrawal and deduct balance
    const [withdrawal] = await this.prisma.$transaction([
      this.prisma.sellerWithdrawal.create({
        data: {
          sellerId: userId,
          amount: dto.amount,
          fee,
          netAmount,
          bankName: dto.bankName,
          bankAccount: dto.bankAccount,
          bankHolder: dto.bankHolder,
          status: 'PENDING',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: dto.amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
          amount: -dto.amount,
          status: 'PENDING',
          description: `Rút tiền về ${dto.bankName} - ${dto.bankAccount}`,
        },
      }),
    ]);

    return withdrawal;
  }

  async getWithdrawals(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { sellerId: userId };
    
    if (status) {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      this.prisma.sellerWithdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sellerWithdrawal.count({ where }),
    ]);

    return {
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelWithdrawal(userId: string, withdrawalId: string) {
    const withdrawal = await this.prisma.sellerWithdrawal.findFirst({
      where: {
        id: withdrawalId,
        sellerId: userId,
        status: 'PENDING',
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Không tìm thấy yêu cầu rút tiền hoặc đã được xử lý');
    }

    // Cancel withdrawal and refund balance
    await this.prisma.$transaction([
      this.prisma.sellerWithdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'REJECTED', rejectedReason: 'Người bán tự hủy' },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: { increment: withdrawal.amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount: withdrawal.amount,
          status: 'COMPLETED',
          description: `Hoàn tiền do hủy yêu cầu rút tiền`,
        },
      }),
    ]);

    return { message: 'Đã hủy yêu cầu rút tiền' };
  }

  // ==================== DASHBOARD/STATISTICS ====================

  async getDashboard(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get store info
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            balance: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    // Get statistics - wrap in try-catch for resilience
    let totalProducts = 0;
    let activeProducts = 0;
    let totalOrders = 0;
    let pendingOrders = 0;
    let completedOrdersThisMonth = 0;
    let completedOrdersLastMonth = 0;
    let revenueThisMonth = { _sum: { subtotal: 0 } };
    let revenueLastMonth = { _sum: { subtotal: 0 } };
    let openComplaints = 0;
    let pendingWithdrawals = { _sum: { amount: 0 } };

    try {
      [
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        completedOrdersThisMonth,
        completedOrdersLastMonth,
        revenueThisMonth,
        revenueLastMonth,
      ] = await Promise.all([
        // Products
        this.prisma.product.count({ where: { sellerId: userId } }),
        this.prisma.product.count({ where: { sellerId: userId, status: 'ACTIVE' } }),
        
        // Orders
        this.prisma.order.count({ where: { sellerId: userId } }),
        this.prisma.order.count({ where: { sellerId: userId, status: 'PENDING' } }),
        this.prisma.order.count({
          where: {
            sellerId: userId,
            status: 'COMPLETED',
            createdAt: { gte: startOfMonth },
          },
        }),
        this.prisma.order.count({
          where: {
            sellerId: userId,
            status: 'COMPLETED',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
        }),
        
        // Revenue
        this.prisma.order.aggregate({
          where: {
            sellerId: userId,
            status: 'COMPLETED',
            createdAt: { gte: startOfMonth },
          },
          _sum: { subtotal: true },
        }),
        this.prisma.order.aggregate({
          where: {
            sellerId: userId,
            status: 'COMPLETED',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
          _sum: { subtotal: true },
        }),
      ]);
    } catch (error) {
      console.error('Error fetching basic stats:', error);
    }

    // Fetch complaints count separately (table might not exist)
    try {
      openComplaints = await this.prisma.complaint.count({
        where: { sellerId: userId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      });
    } catch (error) {
      console.error('Error fetching complaints:', error);
      openComplaints = 0;
    }

    // Fetch withdrawals separately (table might not exist)
    try {
      pendingWithdrawals = await this.prisma.sellerWithdrawal.aggregate({
        where: { sellerId: userId, status: 'PENDING' },
        _sum: { amount: true },
      });
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      pendingWithdrawals = { _sum: { amount: 0 } };
    }

    // Calculate growth
    const revenueThisMonthValue = revenueThisMonth._sum.subtotal || 0;
    const revenueLastMonthValue = revenueLastMonth._sum.subtotal || 0;
    const revenueGrowth = revenueLastMonthValue > 0
      ? ((revenueThisMonthValue - revenueLastMonthValue) / revenueLastMonthValue) * 100
      : 0;

    const ordersGrowth = completedOrdersLastMonth > 0
      ? ((completedOrdersThisMonth - completedOrdersLastMonth) / completedOrdersLastMonth) * 100
      : 0;

    // Get recent orders
    const recentOrders = await this.prisma.order.findMany({
      where: { sellerId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: {
          select: { name: true, email: true },
        },
        items: {
          take: 1,
          include: {
            product: {
              select: { title: true },
            },
          },
        },
      },
    });

    // Get top products
    const topProducts = await this.prisma.product.findMany({
      where: { sellerId: userId },
      take: 5,
      orderBy: { sales: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        sales: true,
        stock: true,
        images: true,
      },
    });

    return {
      store: {
        id: store.id,
        shopName: store.shopName,
        rating: store.rating,
        totalSales: store.totalSales,
        isVerified: store.isVerified,
        balance: store.user.balance,
      },
      stats: {
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completedThisMonth: completedOrdersThisMonth,
          growth: Math.round(ordersGrowth * 100) / 100,
        },
        revenue: {
          thisMonth: revenueThisMonthValue,
          lastMonth: revenueLastMonthValue,
          growth: Math.round(revenueGrowth * 100) / 100,
        },
        complaints: {
          open: openComplaints,
        },
        withdrawals: {
          pending: pendingWithdrawals._sum.amount || 0,
        },
      },
      recentOrders,
      topProducts,
    };
  }

  async getRevenueChart(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        sellerId: userId,
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      select: {
        subtotal: true,
        createdAt: true,
      },
    });

    // Group by date
    const revenueByDate: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      revenueByDate[dateStr] = 0;
    }

    orders.forEach((order) => {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += order.subtotal;
      }
    });

    return Object.entries(revenueByDate)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ==================== INVENTORY MANAGEMENT ====================

  /**
   * Generate hash for account data (for duplicate detection)
   */
  private generateAccountHash(accountData: string): string {
    const crypto = require('crypto');
    const normalized = accountData.trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get inventory for a product
   */
  async getProductInventory(
    userId: string,
    productId: string,
    params?: { status?: string; variantId?: string; limit?: number; offset?: number },
  ) {
    // Verify product belongs to seller and get variants
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
      include: { variants: { orderBy: { position: 'asc' } } },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    const { status, variantId, limit = 50, offset = 0 } = params || {};

    const where: any = { productId };
    if (status) where.status = status;
    if (variantId) where.variantId = variantId;

    const [inventory, total, stats] = await Promise.all([
      this.prisma.productInventory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          soldTo: { select: { id: true, name: true, email: true } },
          variant: { select: { id: true, name: true } },
        },
      }),
      this.prisma.productInventory.count({ where }),
      this.prisma.productInventory.groupBy({
        by: ['status'],
        where: { productId, ...(variantId ? { variantId } : {}) },
        _count: true,
      }),
    ]);

    // Parse stats
    const statusCounts = {
      AVAILABLE: 0,
      RESERVED: 0,
      SOLD: 0,
      DISABLED: 0,
    };
    stats.forEach((s) => {
      statusCounts[s.status as keyof typeof statusCounts] = s._count;
    });

    // Get variant-level stats if product has variants
    let variantStats: any[] = [];
    if (product.hasVariants && product.variants.length > 0) {
      variantStats = await Promise.all(
        product.variants.map(async (variant) => {
          const count = await this.prisma.productInventory.count({
            where: { productId, variantId: variant.id, status: 'AVAILABLE' },
          });
          return {
            variantId: variant.id,
            variantName: variant.name,
            availableCount: count,
          };
        })
      );
    }

    return {
      inventory,
      total,
      stats: statusCounts,
      variants: product.variants,
      variantStats,
      hasVariants: product.hasVariants,
      limit,
      offset,
    };
  }

  /**
   * Upload multiple accounts from text (bulk upload)
   */
  async uploadInventory(
    userId: string,
    productId: string,
    accountData: string,
    variantId?: string,
  ) {
    // Verify product belongs to seller
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    // If product has variants, variantId is required
    if (product.hasVariants && product.variants.length > 0 && !variantId) {
      throw new BadRequestException('Sản phẩm có phân loại, vui lòng chọn phân loại để thêm kho hàng');
    }

    // Verify variant belongs to product if provided
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (!variant) {
        throw new BadRequestException('Phân loại không hợp lệ');
      }
    }

    // Parse lines
    const lines = accountData
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new BadRequestException('Không có dữ liệu tài khoản hợp lệ');
    }

    const results = {
      success: 0,
      duplicates: 0,
      blacklisted: 0,
      errors: 0,
      details: [] as { line: number; status: string; message: string }[],
    };

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hash = this.generateAccountHash(line);

      try {
        // Check if already exists in this product (same product + variant combination)
        const existingInProduct = await this.prisma.productInventory.findFirst({
          where: { 
            productId, 
            hash,
            ...(variantId ? { variantId } : {}),
          },
        });

        if (existingInProduct) {
          results.duplicates++;
          results.details.push({
            line: i + 1,
            status: 'duplicate',
            message: 'Tài khoản đã tồn tại trong sản phẩm này',
          });
          continue;
        }

        // Check if in global blacklist
        const blacklisted = await this.prisma.accountBlacklist.findUnique({
          where: { hash },
        });

        if (blacklisted) {
          results.blacklisted++;
          results.details.push({
            line: i + 1,
            status: 'blacklisted',
            message: `Tài khoản trong blacklist: ${blacklisted.reason}`,
          });
          continue;
        }

        // Check if sold in another product (cross-product duplicate detection)
        const soldElsewhere = await this.prisma.productInventory.findFirst({
          where: { hash, status: 'SOLD' },
        });

        if (soldElsewhere) {
          results.duplicates++;
          results.details.push({
            line: i + 1,
            status: 'duplicate_sold',
            message: 'Tài khoản này đã được bán trước đó',
          });
          continue;
        }

        // Create inventory item with optional variantId
        await this.prisma.productInventory.create({
          data: {
            productId,
            variantId: variantId || null,
            accountData: line,
            hash,
            status: 'AVAILABLE',
          },
        });

        results.success++;
        results.details.push({
          line: i + 1,
          status: 'success',
          message: 'Thêm thành công',
        });
      } catch (error: any) {
        // Handle Prisma unique constraint error
        if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
          results.duplicates++;
          results.details.push({
            line: i + 1,
            status: 'duplicate',
            message: 'Tài khoản đã tồn tại trong kho',
          });
        } else {
          results.errors++;
          results.details.push({
            line: i + 1,
            status: 'error',
            message: 'Lỗi khi thêm tài khoản',
          });
        }
      }
    }

    // Update stock - for product or variant depending on whether variantId is provided
    if (variantId) {
      // Update variant stock
      const variantAvailableCount = await this.prisma.productInventory.count({
        where: { productId, variantId, status: 'AVAILABLE' },
      });

      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: variantAvailableCount },
      });

      // Also update total product stock (sum of all variants)
      const totalAvailableCount = await this.prisma.productInventory.count({
        where: { productId, status: 'AVAILABLE' },
      });

      await this.prisma.product.update({
        where: { id: productId },
        data: { stock: totalAvailableCount },
      });

      return {
        totalLines: lines.length,
        ...results,
        newStock: variantAvailableCount,
        totalProductStock: totalAvailableCount,
      };
    } else {
      // Update product stock
      const availableCount = await this.prisma.productInventory.count({
        where: { productId, status: 'AVAILABLE' },
      });

      await this.prisma.product.update({
        where: { id: productId },
        data: { stock: availableCount },
      });

      return {
        totalLines: lines.length,
        ...results,
        newStock: availableCount,
      };
    }
  }

  /**
   * Add single account to inventory
   */
  async addSingleInventory(
    userId: string,
    productId: string,
    accountData: string,
    variantId?: string,
  ) {
    const result = await this.uploadInventory(userId, productId, accountData, variantId);
    
    if (result.success === 0) {
      const detail = result.details[0];
      throw new BadRequestException(detail?.message || 'Không thể thêm tài khoản');
    }

    return { message: 'Thêm tài khoản thành công', newStock: result.newStock };
  }

  /**
   * Update inventory item
   */
  async updateInventoryItem(
    userId: string,
    inventoryId: string,
    data: { accountData?: string; status?: string },
  ) {
    // Get inventory with product to verify ownership
    const inventory = await this.prisma.productInventory.findUnique({
      where: { id: inventoryId },
      include: { product: true },
    });

    if (!inventory) {
      throw new NotFoundException('Không tìm thấy item');
    }

    if (inventory.product.sellerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa item này');
    }

    if (inventory.status === 'SOLD') {
      throw new BadRequestException('Không thể chỉnh sửa tài khoản đã bán');
    }

    const updateData: any = {};
    
    if (data.accountData) {
      updateData.accountData = data.accountData;
      updateData.hash = this.generateAccountHash(data.accountData);
    }
    
    if (data.status && ['AVAILABLE', 'DISABLED'].includes(data.status)) {
      updateData.status = data.status;
    }

    const updated = await this.prisma.productInventory.update({
      where: { id: inventoryId },
      data: updateData,
    });

    // Update product stock
    const availableCount = await this.prisma.productInventory.count({
      where: { productId: inventory.productId, status: 'AVAILABLE' },
    });

    await this.prisma.product.update({
      where: { id: inventory.productId },
      data: { stock: availableCount },
    });

    return updated;
  }

  /**
   * Delete inventory item
   */
  async deleteInventoryItem(userId: string, inventoryId: string) {
    const inventory = await this.prisma.productInventory.findUnique({
      where: { id: inventoryId },
      include: { product: true },
    });

    if (!inventory) {
      throw new NotFoundException('Không tìm thấy item');
    }

    if (inventory.product.sellerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa item này');
    }

    if (inventory.status === 'SOLD') {
      throw new BadRequestException('Không thể xóa tài khoản đã bán');
    }

    await this.prisma.productInventory.delete({
      where: { id: inventoryId },
    });

    // Update product stock
    const availableCount = await this.prisma.productInventory.count({
      where: { productId: inventory.productId, status: 'AVAILABLE' },
    });

    await this.prisma.product.update({
      where: { id: inventory.productId },
      data: { stock: availableCount },
    });

    return { message: 'Xóa thành công', newStock: availableCount };
  }

  /**
   * Delete multiple inventory items
   */
  async deleteMultipleInventory(
    userId: string,
    productId: string,
    inventoryIds: string[],
  ) {
    // Verify product belongs to seller
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    // Only delete AVAILABLE or DISABLED items
    const result = await this.prisma.productInventory.deleteMany({
      where: {
        id: { in: inventoryIds },
        productId,
        status: { in: ['AVAILABLE', 'DISABLED'] },
      },
    });

    // Update product stock
    const availableCount = await this.prisma.productInventory.count({
      where: { productId, status: 'AVAILABLE' },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: availableCount },
    });

    return {
      deleted: result.count,
      newStock: availableCount,
    };
  }

  /**
   * Get account templates
   */
  async getAccountTemplates() {
    return this.prisma.accountTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
