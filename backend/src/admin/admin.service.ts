import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { OrdersService } from '../orders/orders.service';
import { TelegramService } from '../telegram/telegram.service';
import { ChatGateway } from '../chat/chat.gateway';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private ordersService: OrdersService,
    private telegramService: TelegramService,
    private chatGateway: ChatGateway,
  ) { }

  /**
   * Check if user is admin
   */
  async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedException('Admin access required');
    }

    return user;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      totalOrders,
      pendingRecharges,
      holdingEscrows,
      totalRevenue,
      totalSellers,
      totalProducts,
      todayOrders,
      todayRevenue,
      todayNewUsers,
      todayCommission,
      monthOrders,
      monthRevenue,
      monthCommission,
      lastMonthOrders,
      lastMonthRevenue,
      pendingWithdrawals,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.transaction.count({
        where: { type: 'DEPOSIT', status: 'PENDING' },
      }),
      this.prisma.escrow.count({
        where: { status: 'HOLDING' },
      }),
      this.prisma.order.aggregate({
        _sum: { commission: true },
      }),
      this.prisma.user.count({ where: { OR: [{ role: 'SELLER' }, { isSeller: true }] } }),
      this.prisma.product.count(),
      // Today
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: todayStart } }, _sum: { subtotal: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: todayStart } }, _sum: { commission: true } }),
      // This month
      this.prisma.order.count({ where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } } }),
      this.prisma.order.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } }, _sum: { subtotal: true } }),
      this.prisma.order.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } }, _sum: { commission: true } }),
      // Last month
      this.prisma.order.count({ where: { status: 'COMPLETED', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.order.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { subtotal: true } }),
      // Pending withdrawals
      this.prisma.sellerWithdrawal.count({ where: { status: 'PENDING' } }).catch(() => 0),
    ]);

    // 7-day chart
    let chartData: { date: string; revenue: number; orders: number; commission: number }[] = [];
    try {
      const weekOrders = await this.prisma.order.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: sevenDaysAgo } },
        select: { subtotal: true, commission: true, createdAt: true },
      });
      const dayMap: Record<string, { revenue: number; orders: number; commission: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0, commission: 0 };
      }
      weekOrders.forEach(o => {
        const ds = o.createdAt.toISOString().split('T')[0];
        if (dayMap[ds]) {
          dayMap[ds].revenue += o.subtotal;
          dayMap[ds].orders += 1;
          dayMap[ds].commission += o.commission || 0;
        }
      });
      chartData = Object.entries(dayMap).map(([date, d]) => ({ date, ...d }));
    } catch (e) { /* ignore */ }

    // Growth calculations
    const thisMonthRev = monthRevenue._sum.subtotal || 0;
    const lastMonthRev = lastMonthRevenue._sum.subtotal || 0;
    const revenueGrowth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 10000) / 100 : 0;
    const ordersGrowth = lastMonthOrders > 0 ? Math.round(((monthOrders - lastMonthOrders) / lastMonthOrders) * 10000) / 100 : 0;

    // Get recent orders
    const recentOrders = await this.prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { name: true, email: true } },
        seller: { select: { name: true } },
      },
    });

    const recentTransactions = await this.prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return {
      stats: {
        totalUsers,
        totalOrders,
        pendingRecharges,
        holdingEscrows,
        totalRevenue: totalRevenue._sum.commission || 0,
        totalSellers,
        totalProducts,
        pendingWithdrawals,
      },
      today: {
        orders: todayOrders,
        revenue: todayRevenue._sum.subtotal || 0,
        newUsers: todayNewUsers,
        commission: todayCommission._sum.commission || 0,
      },
      month: {
        orders: monthOrders,
        revenue: thisMonthRev,
        commission: monthCommission._sum.commission || 0,
        revenueGrowth,
        ordersGrowth,
      },
      chart: chartData,
      recentOrders,
      recentTransactions,
    };
  }

  /**
   * Get all pending recharge requests
   */
  async getPendingRecharges() {
    const recharges = await this.prisma.transaction.findMany({
      where: {
        type: 'DEPOSIT',
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            balance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recharges;
  }

  /**
   * Approve recharge request
   */
  async approveRecharge(transactionId: string, adminId: string) {
    await this.verifyAdmin(adminId);
    return this.walletService.approveRecharge(transactionId, adminId);
  }

  /**
   * Reject recharge request
   */
  async rejectRecharge(transactionId: string, adminId: string) {
    await this.verifyAdmin(adminId);
    return this.walletService.rejectRecharge(transactionId, adminId);
  }

  /**
   * Get all transactions
   */
  async getAllTransactions(params?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    const { type, status, limit = 50, offset = 0, search } = params || {};

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    // Add search filter
    if (search) {
      where.AND = [
        {
          OR: [
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
            { description: { contains: search } },
          ],
        },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get all escrows
   */
  async getAllEscrows(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const escrows = await this.prisma.escrow.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            createdAt: true,
          },
        },
        buyer: {
          select: {
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return escrows;
  }

  /**
   * Get releasable escrows
   */
  async getReleasableEscrows() {
    return this.ordersService.getReleasableEscrows();
  }

  /**
   * Manually release escrow
   */
  async releaseEscrow(escrowId: string, adminId: string) {
    await this.verifyAdmin(adminId);
    return this.ordersService.releaseEscrow(escrowId);
  }

  /**
   * Get all users
   */
  async getAllUsers(params?: { role?: string; limit?: number; offset?: number; isBanned?: boolean; isSeller?: boolean; search?: string }) {
    const { role, limit = 50, offset = 0, isBanned, isSeller, search } = params || {};

    const where: any = {};
    if (role) where.role = role;
    if (isBanned !== undefined) where.isBanned = isBanned;
    if (isSeller !== undefined) where.isSeller = isSeller;

    // Add search filter (search by name or email)
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total, totalUsers, totalAdmins, totalSellers, totalBuyers, totalBanned] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isSeller: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          balance: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
      // Stats: count from ALL users (no filter)
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { isSeller: true } }),
      this.prisma.user.count({ where: { isSeller: false, role: { not: 'ADMIN' } } }),
      this.prisma.user.count({ where: { isBanned: true } }),
    ]);

    return {
      users,
      total,
      limit,
      offset,
      stats: {
        totalUsers,
        totalAdmins,
        totalSellers,
        totalBuyers,
        totalBanned,
      },
    };
  }

  /**
   * Get user detail by ID (includes all information for admin)
   */
  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerProfile: true,
        _count: {
          select: {
            orders: true,
            sales: true,
            products: true,
            transactions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get ALL transactions (not just recent)
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Get ALL orders (as buyer)
    const recentOrders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { name: true } },
        items: { include: { product: { select: { title: true } } } },
      },
    });

    // Get ALL sales (as seller)
    const recentSales = await this.prisma.order.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { name: true } },
        items: { include: { product: { select: { title: true } } } },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        password: user.password, // Include password hash for admin
        role: user.role,
        isSeller: user.isSeller,
        isBanned: user.isBanned,
        banReason: user.banReason,
        bannedAt: user.bannedAt,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address,
        balance: user.balance,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        sellerProfile: user.sellerProfile,
        _count: user._count,
      },
      recentTransactions,
      recentOrders,
      recentSales,
    };
  }

  /**
   * Update user information
   */
  async updateUser(
    userId: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      isSeller?: boolean;
      balance?: number;
      phone?: string;
      address?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isSeller !== undefined) updateData.isSeller = data.isSeller;
    if (data.balance !== undefined) updateData.balance = data.balance;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;

    // If password is provided, hash it
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // If setting isSeller to true, create seller profile if not exists
    if (data.isSeller === true) {
      const existingProfile = await this.prisma.sellerProfile.findUnique({
        where: { userId },
      });

      if (!existingProfile) {
        await this.prisma.sellerProfile.create({
          data: {
            userId,
            shopName: user.name || 'My Shop',
            shopDescription: 'Welcome to my shop!',
          },
        });
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSeller: true,
        balance: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        sellerProfile: true,
      },
    });

    return updatedUser;
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Ban a user
   */
  async banUser(userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'ADMIN') {
      throw new BadRequestException('Cannot ban an admin user');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        banReason: true,
        bannedAt: true,
      },
    });

    // Send real-time notification to the banned user and force logout
    try {
      this.chatGateway.sendToUser(userId, 'account:banned', {
        reason: reason || 'Vi phạm quy định',
        bannedAt: new Date().toISOString(),
      });
      console.log(`[Admin] 🔨 Sent ban notification to user ${userId}`);
    } catch (err) {
      console.error('[Admin] Failed to send ban notification:', err);
    }

    return { message: 'User banned successfully', user: updatedUser };
  }

  /**
   * Unban a user
   */
  async unbanUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
      },
    });

    return { message: 'User unbanned successfully', user: updatedUser };
  }

  /**
   * Get all orders
   */
  async getAllOrders(params?: { status?: string; limit?: number; offset?: number; search?: string }) {
    const { status, limit = 50, offset = 0, search } = params || {};

    const where: any = {};
    if (status) where.status = status;

    // Add search filter
    if (search) {
      where.AND = [
        {
          OR: [
            { orderNumber: { contains: search } },
            { buyer: { name: { contains: search } } },
            { buyer: { email: { contains: search } } },
            { seller: { name: { contains: search } } },
            { seller: { email: { contains: search } } },
          ],
        },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          buyer: {
            select: {
              name: true,
              email: true,
            },
          },
          seller: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  title: true,
                },
              },
            },
          },
          escrow: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      total,
      limit,
      offset,
    };
  }

  /**
   * Admin refund order - Hoàn tiền đơn hàng cho buyer
   * 1. Hoàn tiền vào ví buyer
   * 2. Xử lý escrow (hủy nếu HOLDING, trừ lại nếu RELEASED)
   * 3. Cập nhật trạng thái order → REFUNDED
   * 4. Khôi phục inventory nếu cần
   * 5. Tạo transaction ghi nhận
   */
  async refundOrder(orderId: string, adminId: string, reason?: string) {
    await this.verifyAdmin(adminId);

    // Lấy thông tin order đầy đủ
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        escrow: true,
        buyer: { select: { id: true, name: true, email: true, balance: true } },
        seller: { select: { id: true, name: true, email: true, balance: true } },
        items: {
          include: {
            product: { select: { id: true, title: true } },
            deliveries: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.status === 'REFUNDED') {
      throw new BadRequestException('Đơn hàng đã được hoàn tiền trước đó');
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Đơn hàng đã bị hủy');
    }

    const refundAmount = order.total; // Hoàn toàn bộ tiền cho buyer
    const refundReason = reason || 'Admin hoàn tiền đơn hàng';

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Hoàn tiền vào ví buyer
      await tx.user.update({
        where: { id: order.buyerId },
        data: { balance: { increment: refundAmount } },
      });

      // 2. Tạo transaction hoàn tiền cho buyer
      await tx.transaction.create({
        data: {
          userId: order.buyerId,
          type: 'REFUND',
          amount: refundAmount,
          status: 'COMPLETED',
          description: `Hoàn tiền đơn hàng ${order.orderNumber} - ${refundReason}`,
          orderId: order.id,
        },
      });

      // 3. Xử lý escrow
      if (order.escrow) {
        if (order.escrow.status === 'HOLDING') {
          // Escrow đang giữ tiền → hủy escrow (tiền chưa vào ví seller)
          await tx.escrow.update({
            where: { id: order.escrow.id },
            data: {
              status: 'REFUNDED',
              releasedAt: new Date(),
            },
          });
        } else if (order.escrow.status === 'RELEASED') {
          // Escrow đã released → trừ lại tiền từ ví seller
          await tx.user.update({
            where: { id: order.sellerId },
            data: { balance: { decrement: order.escrow.amount } },
          });

          // Tạo transaction ghi nhận trừ tiền seller
          await tx.transaction.create({
            data: {
              userId: order.sellerId,
              type: 'REFUND',
              amount: order.escrow.amount,
              status: 'COMPLETED',
              description: `Trừ tiền do hoàn tiền đơn hàng ${order.orderNumber} - ${refundReason}`,
              orderId: order.id,
            },
          });

          // Cập nhật escrow
          await tx.escrow.update({
            where: { id: order.escrow.id },
            data: { status: 'REFUNDED' },
          });
        }
      }

      // 4. Khôi phục inventory - đưa các item đã giao về AVAILABLE 
      for (const item of order.items) {
        for (const delivery of item.deliveries) {
          if (delivery.inventory) {
            await tx.productInventory.update({
              where: { id: delivery.inventoryId },
              data: {
                status: 'AVAILABLE',
                soldAt: null,
                soldToId: null,
                orderId: null,
                orderItemId: null,
              },
            });
          }
        }

        // Cập nhật stock sản phẩm
        if (item.product) {
          const newStock = await tx.productInventory.count({
            where: { productId: item.productId, status: 'AVAILABLE' },
          });
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: newStock,
              sales: { decrement: item.quantity },
            },
          });

          // Cập nhật variant stock nếu có
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
      }

      // 5. Cập nhật trạng thái order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
        },
      });

      // 6. Giảm totalSales của seller profile
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      await tx.sellerProfile.updateMany({
        where: { userId: order.sellerId },
        data: {
          totalSales: { decrement: totalQuantity },
        },
      });

      return updatedOrder;
    });

    // Gửi notification cho buyer
    try {
      await this.prisma.notification.create({
        data: {
          userId: order.buyerId,
          type: 'ORDER',
          title: 'Đơn hàng đã được hoàn tiền',
          message: `Đơn hàng #${order.orderNumber} đã được hoàn ${refundAmount.toLocaleString('vi-VN')}đ vào ví. Lý do: ${refundReason}`,
          link: `/orders`,
          icon: 'Wallet',
        },
      });
    } catch (e) {
      console.error('Failed to create refund notification:', e);
    }

    return {
      success: true,
      message: `Đã hoàn ${refundAmount.toLocaleString('vi-VN')}đ cho buyer ${order.buyer.name || order.buyer.email}`,
      order: result,
      refundAmount,
      escrowStatus: order.escrow?.status || 'N/A',
    };
  }

  // ==================== BANNER MANAGEMENT ====================

  async getBanners() {
    return this.prisma.banner.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async getActiveBanners() {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { position: 'asc' },
    });
  }

  async createBanner(data: {
    title: string;
    subtitle?: string;
    description?: string;
    image: string;
    link: string;
    gradient?: string;
    icon?: string;
    discount?: string;
    price?: string;
    originalPrice?: string;
    position?: number;
    isActive?: boolean;
    startDate?: Date;
    endDate?: Date;
  }) {
    return this.prisma.banner.create({
      data: {
        ...data,
        position: data.position ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateBanner(id: string, data: {
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
    link?: string;
    gradient?: string;
    icon?: string;
    discount?: string;
    price?: string;
    originalPrice?: string;
    position?: number;
    isActive?: boolean;
    startDate?: Date;
    endDate?: Date;
  }) {
    return this.prisma.banner.update({
      where: { id },
      data,
    });
  }

  async deleteBanner(id: string) {
    return this.prisma.banner.delete({
      where: { id },
    });
  }

  // ==================== CATEGORY SHOWCASE MANAGEMENT ====================

  async getCategoryShowcases() {
    return this.prisma.categoryShowcase.findMany({
      orderBy: { position: 'asc' },
    });
  }

  async getActiveCategoryShowcases() {
    return this.prisma.categoryShowcase.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
    });
  }

  async createCategoryShowcase(data: {
    title: string;
    image: string;
    link: string;
    position?: number;
    isActive?: boolean;
  }) {
    return this.prisma.categoryShowcase.create({
      data: {
        ...data,
        position: data.position ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateCategoryShowcase(id: string, data: {
    title?: string;
    image?: string;
    link?: string;
    position?: number;
    isActive?: boolean;
  }) {
    return this.prisma.categoryShowcase.update({
      where: { id },
      data,
    });
  }

  async deleteCategoryShowcase(id: string) {
    return this.prisma.categoryShowcase.delete({
      where: { id },
    });
  }

  // ==================== CATEGORY MANAGEMENT ====================

  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    image?: string;
    parentId?: string;
  }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        image: data.image,
        parentId: data.parentId || null,
      },
      include: {
        _count: {
          select: { products: true },
        },
        parent: true,
        children: true,
      },
    });
  }

  async updateCategory(id: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    image?: string;
    parentId?: string | null;
  }) {
    // Only pick valid fields to avoid Prisma errors from extra body data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null; // empty string → null

    return this.prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { products: true },
        },
        parent: true,
        children: true,
      },
    });
  }

  async deleteCategory(id: string) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    // Check if category has child categories
    if (category._count.children > 0) {
      throw new BadRequestException('Không thể xóa danh mục đang có danh mục con. Vui lòng xóa hoặc di chuyển các danh mục con trước.');
    }

    // Check if category has products
    if (category._count.products > 0) {
      throw new BadRequestException('Không thể xóa danh mục đang có sản phẩm. Vui lòng di chuyển sản phẩm sang danh mục khác trước.');
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { success: true, message: 'Đã xóa danh mục thành công' };
  }

  // ==================== PRODUCT MANAGEMENT ====================

  async getProducts(options: { status?: string; categoryId?: string; search?: string; limit?: number; offset?: number }) {
    const { status, categoryId, search, limit = 50, offset = 0 } = options;
    const where: any = {};

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { seller: { name: { contains: search } } },
        { seller: { email: { contains: search } } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          seller: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total, limit, offset };
  }

  async updateProductStatus(id: string, status: string) {
    return this.prisma.product.update({
      where: { id },
      data: { status },
    });
  }

  async deleteProduct(id: string) {
    // Check if product has orders - if so, just set status to DELETED instead of hard delete
    const orderCount = await this.prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderCount > 0) {
      // Soft delete - mark as DELETED to preserve order history
      return this.prisma.product.update({
        where: { id },
        data: { status: 'DELETED' },
      });
    }

    // Hard delete - remove related records first, then product
    await this.prisma.$transaction(async (tx) => {
      // Delete cart items
      await tx.cartItem.deleteMany({ where: { productId: id } });
      // Delete inventory
      await tx.productInventory.deleteMany({ where: { productId: id } });
      // Delete variants (and their inventory/cart items)
      const variants = await tx.productVariant.findMany({ where: { productId: id } });
      for (const variant of variants) {
        await tx.cartItem.deleteMany({ where: { variantId: variant.id } });
        await tx.productInventory.deleteMany({ where: { variantId: variant.id } });
      }
      await tx.productVariant.deleteMany({ where: { productId: id } });
      // Finally delete product
      await tx.product.delete({ where: { id } });
    });

    return { success: true, message: 'Sản phẩm đã được xóa' };
  }

  /**
   * Update product statistics (admin only)
   * Also syncs seller's totalSales and average rating
   */
  async updateProductStats(id: string, data: { sales?: number; rating?: number }) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: { include: { sellerProfile: true } } },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const updateData: any = {};
    if (data.sales !== undefined) updateData.sales = data.sales;
    if (data.rating !== undefined) updateData.rating = data.rating;

    // Update product stats
    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Sync seller's totalSales and average rating if seller has profile
    if (product.seller?.sellerProfile) {
      // Calculate total sales from all seller's products
      const salesAggregate = await this.prisma.product.aggregate({
        where: { sellerId: product.sellerId, status: 'ACTIVE' },
        _sum: { sales: true },
      });

      // Calculate average rating from all seller's products with rating > 0
      const ratingAggregate = await this.prisma.product.aggregate({
        where: { sellerId: product.sellerId, status: 'ACTIVE', rating: { gt: 0 } },
        _avg: { rating: true },
      });

      // Update seller profile
      await this.prisma.sellerProfile.update({
        where: { userId: product.sellerId },
        data: {
          totalSales: salesAggregate._sum.sales || 0,
          rating: ratingAggregate._avg.rating || 0,
        },
      });
    }

    return { success: true, message: 'Đã cập nhật thống kê sản phẩm', product: updated };
  }

  // ==================== SELLER MANAGEMENT ====================

  async getSellers(options: { limit?: number; offset?: number; search?: string }) {
    const { limit = 50, offset = 0, search } = options;

    const baseWhere: any = {
      OR: [
        { role: 'SELLER' },
        { isSeller: true },
      ],
    };

    // Add search filter
    if (search) {
      baseWhere.AND = [
        {
          OR: [
            { email: { contains: search } },
            { name: { contains: search } },
            { sellerProfile: { shopName: { contains: search } } },
          ],
        },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.user.findMany({
        where: baseWhere,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isSeller: true,
          balance: true,
          createdAt: true,
          sellerProfile: true,
          _count: {
            select: {
              products: true,
              sales: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({
        where: baseWhere,
      }),
    ]);

    return { sellers, total, limit, offset };
  }

  async updateSellerStatus(userId: string, data: { isSeller?: boolean; role?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Verify or unverify a seller
   */
  async verifySeller(userId: string, isVerified: boolean) {
    // Check if user exists and has seller profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { sellerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.sellerProfile) {
      throw new NotFoundException('Seller profile not found. User must create a shop first.');
    }

    // Update seller profile verification status
    const updatedProfile = await this.prisma.sellerProfile.update({
      where: { userId },
      data: { isVerified },
    });

    return {
      success: true,
      message: isVerified ? 'Seller đã được xác minh' : 'Đã hủy xác minh seller',
      sellerProfile: updatedProfile,
    };
  }

  /**
   * Revoke ALL old verify badges — transition to insurance system
   */
  async revokeAllVerifyBadges() {
    // Reset all seller profiles: isVerified = false, insuranceLevel = 0, insuranceTier = null
    const result = await this.prisma.sellerProfile.updateMany({
      where: { isVerified: true },
      data: {
        isVerified: false,
        insuranceLevel: 0,
        insuranceTier: null,
      },
    });

    // Also deactivate any existing insurance funds
    await this.prisma.insuranceFund.updateMany({
      where: { status: 'ACTIVE' },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Đã thu hồi tích xanh của ${result.count} seller`,
      count: result.count,
    };
  }

  // ==================== INSURANCE MANAGEMENT ====================

  /**
   * Get all insurance funds with seller info
   */
  async getInsuranceFunds(params: {
    status?: string;
    tier?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    const { status, tier, limit = 50, offset = 0, search } = params;

    const where: any = {};
    if (status) where.status = status;
    if (tier) where.tier = tier;

    // Search by shop name
    if (search) {
      where.sellerProfile = {
        OR: [
          { shopName: { contains: search } },
          { user: { email: { contains: search } } },
          { user: { name: { contains: search } } },
        ],
      };
    }

    const [funds, total] = await Promise.all([
      this.prisma.insuranceFund.findMany({
        where,
        include: {
          sellerProfile: {
            select: {
              userId: true,
              shopName: true,
              shopLogo: true,
              rating: true,
              totalSales: true,
              insuranceLevel: true,
              insuranceTier: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { activatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.insuranceFund.count({ where }),
    ]);

    return { funds, total, limit, offset };
  }

  /**
   * Get insurance detail for a specific seller
   */
  async getSellerInsuranceDetail(sellerId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true,
        sellerProfile: {
          select: {
            shopName: true,
            shopLogo: true,
            rating: true,
            totalSales: true,
            insuranceLevel: true,
            insuranceTier: true,
            isVerified: true,
          },
        },
      },
    });

    if (!seller) {
      throw new Error('Không tìm thấy seller');
    }

    // Get current active fund
    const fund = await this.prisma.insuranceFund.findFirst({
      where: { sellerId, status: 'ACTIVE' },
    });

    // Get all funds (including past/revoked)
    const allFunds = await this.prisma.insuranceFund.findMany({
      where: { sellerId },
      orderBy: { activatedAt: 'desc' },
    });

    // Get fund history
    const history = await this.prisma.insuranceFundHistory.findMany({
      where: { fund: { sellerId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fund: { select: { tier: true } },
      },
    });

    return {
      seller,
      activeFund: fund,
      allFunds,
      history,
    };
  }

  /**
   * Confiscate insurance fund — 100% seizure for serious violations
   * Money goes to platform (not returned to seller)
   */
  async confiscateInsuranceFund(fundId: string, reason: string, adminId: string) {
    if (!reason || reason.trim().length < 10) {
      throw new Error('Lý do tịch thu phải ít nhất 10 ký tự');
    }

    const fund = await this.prisma.insuranceFund.findUnique({
      where: { id: fundId },
      include: {
        sellerProfile: {
          select: { userId: true, shopName: true, user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!fund) throw new Error('Không tìm thấy quỹ BH');
    if (fund.status !== 'ACTIVE') throw new Error('Quỹ BH không ở trạng thái hoạt động');

    const confiscatedAmount = fund.currentBalance;

    await this.prisma.$transaction([
      // 1. Mark fund as confiscated
      this.prisma.insuranceFund.update({
        where: { id: fundId },
        data: {
          status: 'CONFISCATED',
          currentBalance: 0,
          revokedAt: new Date(),
        },
      }),
      // 2. Remove insurance from seller profile
      this.prisma.sellerProfile.update({
        where: { userId: fund.sellerId },
        data: {
          insuranceLevel: 0,
          insuranceTier: null,
          isVerified: false,
        },
      }),
      // 3. Create history record
      this.prisma.insuranceFundHistory.create({
        data: {
          fundId: fund.id,
          type: 'CONFISCATED',
          amount: -confiscatedAmount,
          balanceBefore: fund.currentBalance,
          balanceAfter: 0,
          description: `Admin tịch thu quỹ BH: ${reason}`,
        },
      }),
    ]);

    const shopName = fund.sellerProfile?.shopName || fund.sellerProfile?.user?.name || 'N/A';

    return {
      success: true,
      message: `Đã tịch thu ${confiscatedAmount.toLocaleString('vi-VN')}đ từ quỹ BH của ${shopName}`,
      confiscatedAmount,
      sellerId: fund.sellerId,
    };
  }

  /**
   * Adjust insurance fund balance — deduct for disputes or top-up
   */
  async adjustInsuranceFund(
    fundId: string,
    amount: number,
    reason: string,
    type: 'DEDUCT' | 'TOPUP',
    adminId: string,
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Lý do điều chỉnh phải ít nhất 5 ký tự');
    }
    if (!amount || amount <= 0) {
      throw new Error('Số tiền phải lớn hơn 0');
    }

    const fund = await this.prisma.insuranceFund.findUnique({
      where: { id: fundId },
      include: {
        sellerProfile: {
          select: { userId: true, shopName: true, user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!fund) throw new Error('Không tìm thấy quỹ BH');
    if (fund.status !== 'ACTIVE') throw new Error('Quỹ BH không ở trạng thái hoạt động');

    const balanceBefore = fund.currentBalance;
    let newBalance: number;

    if (type === 'DEDUCT') {
      if (amount > fund.currentBalance) {
        throw new Error(`Không thể trừ ${amount.toLocaleString('vi-VN')}đ — quỹ chỉ còn ${fund.currentBalance.toLocaleString('vi-VN')}đ`);
      }
      newBalance = balanceBefore - amount;
    } else {
      newBalance = balanceBefore + amount;
    }

    await this.prisma.$transaction([
      // 1. Update fund balance
      this.prisma.insuranceFund.update({
        where: { id: fundId },
        data: { currentBalance: newBalance },
      }),
      // 2. Create history record
      this.prisma.insuranceFundHistory.create({
        data: {
          fundId: fund.id,
          type: type === 'DEDUCT' ? 'DISPUTE_DEDUCTION' : 'ADMIN_TOPUP',
          amount: type === 'DEDUCT' ? -amount : amount,
          balanceBefore,
          balanceAfter: newBalance,
          description: `Admin ${type === 'DEDUCT' ? 'trừ' : 'nạp thêm'}: ${reason}`,
        },
      }),
    ]);

    const shopName = fund.sellerProfile?.shopName || fund.sellerProfile?.user?.name || 'N/A';
    return {
      success: true,
      message: type === 'DEDUCT'
        ? `Đã trừ ${amount.toLocaleString('vi-VN')}đ từ quỹ BH của ${shopName}. Còn: ${newBalance.toLocaleString('vi-VN')}đ`
        : `Đã nạp thêm ${amount.toLocaleString('vi-VN')}đ vào quỹ BH của ${shopName}. Còn: ${newBalance.toLocaleString('vi-VN')}đ`,
      balanceBefore,
      balanceAfter: newBalance,
      sellerId: fund.sellerId,
    };
  }

  /**
   * Admin set insurance tier for a seller — no deposit required
   */
  async setSellerInsuranceTier(sellerId: string, tier: string | null, adminId: string) {
    const VALID_TIERS = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'VIP'];
    const TIER_LEVELS: Record<string, number> = { BRONZE: 1, SILVER: 2, GOLD: 3, DIAMOND: 4, VIP: 5 };

    if (tier && !VALID_TIERS.includes(tier)) {
      throw new Error(`Tier không hợp lệ. Chọn: ${VALID_TIERS.join(', ')}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (!user) throw new Error('Không tìm thấy user');
    if (!user.sellerProfile) throw new Error('User chưa có seller profile');

    if (!tier) {
      // Remove insurance
      await this.prisma.$transaction([
        this.prisma.sellerProfile.update({
          where: { userId: sellerId },
          data: { insuranceLevel: 0, insuranceTier: null, isVerified: false },
        }),
        this.prisma.insuranceFund.updateMany({
          where: { sellerId, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt: new Date() },
        }),
      ]);

      return { success: true, message: `Đã xoá bảo hiểm của ${user.name || user.email}` };
    }

    const level = TIER_LEVELS[tier];

    // Check if there's an existing active fund
    const existingFund = await this.prisma.insuranceFund.findFirst({
      where: { sellerId, status: 'ACTIVE' },
    });

    if (existingFund) {
      // Update existing fund tier
      await this.prisma.$transaction([
        this.prisma.insuranceFund.update({
          where: { id: existingFund.id },
          data: { tier, level },
        }),
        this.prisma.sellerProfile.update({
          where: { userId: sellerId },
          data: { insuranceLevel: level, insuranceTier: tier, isVerified: true },
        }),
        this.prisma.insuranceFundHistory.create({
          data: {
            fundId: existingFund.id,
            type: 'ADMIN_TOPUP',
            amount: 0,
            balanceBefore: existingFund.currentBalance,
            balanceAfter: existingFund.currentBalance,
            description: `Admin đặt gói BH: ${tier} (Level ${level})`,
          },
        }),
      ]);
    } else {
      // Create new fund
      await this.prisma.$transaction(async (tx) => {
        const fund = await tx.insuranceFund.create({
          data: {
            sellerProfile: { connect: { userId: sellerId } },
            tier,
            level,
            depositAmount: 0,
            currentBalance: 0,
            maxCoverage: 0,
            annualFee: 0,
            status: 'ACTIVE',
            activatedAt: new Date(),
            nextRenewalAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        });

        await tx.sellerProfile.update({
          where: { userId: sellerId },
          data: { insuranceLevel: level, insuranceTier: tier, isVerified: true },
        });

        await tx.insuranceFundHistory.create({
          data: {
            fundId: fund.id,
            type: 'ADMIN_TOPUP',
            amount: 0,
            balanceBefore: 0,
            balanceAfter: 0,
            description: `Admin cấp gói BH: ${tier} (Level ${level})`,
          },
        });
      });
    }

    const tierLabel = { BRONZE: 'Đồng', SILVER: 'Bạc', GOLD: 'Vàng', DIAMOND: 'Kim Cương', VIP: 'VIP' }[tier];
    return {
      success: true,
      message: `Đã đặt gói BH ${tierLabel} cho ${user.name || user.email}`,
      tier,
      level,
    };
  }

  // ==================== WITHDRAWAL MANAGEMENT ====================

  /**
   * Get all withdrawal requests
   */
  async getWithdrawals(params?: { status?: string; limit?: number; offset?: number; search?: string }) {
    const { status, limit = 50, offset = 0, search } = params || {};

    const where: any = {};
    if (status) where.status = status;

    // Add search filter
    if (search) {
      where.AND = [
        {
          OR: [
            { seller: { name: { contains: search } } },
            { seller: { email: { contains: search } } },
            { bankAccount: { contains: search } },
            { bankHolder: { contains: search } },
            { seller: { sellerProfile: { shopName: { contains: search } } } },
          ],
        },
      ];
    }

    const [withdrawals, total] = await Promise.all([
      this.prisma.sellerWithdrawal.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              balance: true,
              sellerProfile: {
                select: {
                  shopName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.sellerWithdrawal.count({ where }),
    ]);

    return {
      withdrawals,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get pending withdrawals count
   */
  async getPendingWithdrawalsCount() {
    const count = await this.prisma.sellerWithdrawal.count({
      where: { status: 'PENDING' },
    });
    return { count };
  }

  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(withdrawalId: string, adminId: string, note?: string) {
    const withdrawal = await this.prisma.sellerWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { seller: true },
    });

    if (!withdrawal) {
      throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error('Yêu cầu đã được xử lý trước đó');
    }

    // Update withdrawal status to COMPLETED
    const updatedWithdrawal = await this.prisma.sellerWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        adminNote: note,
      },
    });

    // Create transaction record for the withdrawal
    await this.prisma.transaction.create({
      data: {
        userId: withdrawal.sellerId,
        type: 'WITHDRAW',
        amount: withdrawal.netAmount,
        status: 'COMPLETED',
        description: `Rút tiền về ${withdrawal.bankName} - ${withdrawal.bankAccount}`,
      },
    });

    // Send Telegram notification to seller
    this.telegramService.notifyWithdrawalStatus(withdrawal.sellerId, {
      amount: withdrawal.netAmount,
      status: 'APPROVED',
    }).catch(err => console.error('Telegram notification error:', err));

    return updatedWithdrawal;
  }

  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string) {
    const withdrawal = await this.prisma.sellerWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: { seller: true },
    });

    if (!withdrawal) {
      throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error('Yêu cầu đã được xử lý trước đó');
    }

    // Update withdrawal status to REJECTED and refund balance
    const [updatedWithdrawal] = await this.prisma.$transaction([
      this.prisma.sellerWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          rejectedReason: reason,
          completedAt: new Date(),
        },
      }),
      // Refund the amount back to seller
      this.prisma.user.update({
        where: { id: withdrawal.sellerId },
        data: {
          balance: { increment: withdrawal.amount },
        },
      }),
      // Create refund transaction
      this.prisma.transaction.create({
        data: {
          userId: withdrawal.sellerId,
          type: 'REFUND',
          amount: withdrawal.amount,
          status: 'COMPLETED',
          description: `Hoàn tiền rút tiền bị từ chối: ${reason}`,
        },
      }),
    ]);

    // Send Telegram notification to seller
    this.telegramService.notifyWithdrawalStatus(withdrawal.sellerId, {
      amount: withdrawal.amount,
      status: 'REJECTED',
      reason,
    }).catch(err => console.error('Telegram notification error:', err));

    return updatedWithdrawal;
  }

  // ==================== SELLER APPLICATIONS ====================

  async getSellerApplications(params: { status?: string; limit: number; offset: number; search?: string }) {
    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }

    // Add search filter
    if (params.search) {
      where.AND = [
        {
          OR: [
            { fullName: { contains: params.search } },
            { shopName: { contains: params.search } },
            { email: { contains: params.search } },
          ],
        },
      ];
    }

    const [applications, total] = await Promise.all([
      this.prisma.sellerApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.offset,
        take: params.limit,
      }),
      this.prisma.sellerApplication.count({ where }),
    ]);

    // Get user info for each application
    const applicationsWithUser = await Promise.all(
      applications.map(async (app) => {
        const user = await this.prisma.user.findUnique({
          where: { id: app.userId },
          select: { id: true, email: true, name: true, avatar: true, createdAt: true },
        });
        return { ...app, user };
      }),
    );

    return { applications: applicationsWithUser, total };
  }

  async getPendingSellerApplicationsCount() {
    const count = await this.prisma.sellerApplication.count({
      where: { status: 'PENDING' },
    });
    return { count };
  }

  async approveSellerApplication(applicationId: string, adminId: string, note?: string) {
    const application = await this.prisma.sellerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.status !== 'PENDING') {
      throw new Error('Đơn đăng ký đã được xử lý');
    }

    // Update application status
    await this.prisma.sellerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'APPROVED',
        adminNote: note,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Update user to seller
    await this.prisma.user.update({
      where: { id: application.userId },
      data: {
        isSeller: true,
        role: 'SELLER',
      },
    });

    // Create seller profile
    await this.prisma.sellerProfile.create({
      data: {
        userId: application.userId,
        shopName: application.shopName,
        shopDescription: application.description,
      },
    });

    // Send Telegram notification
    this.telegramService.notifyAnnouncement(application.userId, {
      title: '🎉 Chúc mừng! Đơn đăng ký Seller đã được duyệt',
      content: `Xin chào ${application.fullName},\n\nĐơn đăng ký trở thành Seller của bạn đã được chấp thuận!\n\nShop: ${application.shopName}\n\nBạn có thể bắt đầu đăng bán sản phẩm ngay bây giờ.`,
    }).catch(err => console.error('Telegram notification error:', err));

    return { success: true, message: 'Đã duyệt đơn đăng ký' };
  }

  async rejectSellerApplication(applicationId: string, adminId: string, reason: string) {
    const application = await this.prisma.sellerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.status !== 'PENDING') {
      throw new Error('Đơn đăng ký đã được xử lý');
    }

    // Update application status
    await this.prisma.sellerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        adminNote: reason,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });

    // Send Telegram notification
    this.telegramService.notifyAnnouncement(application.userId, {
      title: '❌ Đơn đăng ký Seller bị từ chối',
      content: `Xin chào ${application.fullName},\n\nĐơn đăng ký trở thành Seller của bạn đã bị từ chối.\n\nLý do: ${reason}\n\nBạn có thể nộp đơn đăng ký mới sau khi khắc phục các vấn đề trên.`,
    }).catch(err => console.error('Telegram notification error:', err));

    return { success: true, message: 'Đã từ chối đơn đăng ký' };
  }
}
