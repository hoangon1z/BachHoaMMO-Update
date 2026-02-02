import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { OrdersService } from '../orders/orders.service';
import { TelegramService } from '../telegram/telegram.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private ordersService: OrdersService,
    private telegramService: TelegramService,
  ) {}

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
    const [
      totalUsers,
      totalOrders,
      pendingRecharges,
      holdingEscrows,
      totalRevenue,
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
    ]);

    // Get recent activities
    const recentOrders = await this.prisma.order.findMany({
      take: 5,
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
      },
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
  }) {
    const { type, status, limit = 50, offset = 0 } = params || {};

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

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
  async getAllUsers(params?: { role?: string; limit?: number; offset?: number; isBanned?: boolean }) {
    const { role, limit = 50, offset = 0, isBanned } = params || {};

    const where: any = {};
    if (role) where.role = role;
    if (isBanned !== undefined) where.isBanned = isBanned;

    const [users, total] = await Promise.all([
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
    ]);

    return {
      users,
      total,
      limit,
      offset,
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

    // Get recent transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get recent orders (as buyer)
    const recentOrders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        seller: { select: { name: true } },
        items: { include: { product: { select: { title: true } } } },
      },
    });

    // Get recent sales (as seller)
    const recentSales = await this.prisma.order.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
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
  async getAllOrders(params?: { status?: string; limit?: number; offset?: number }) {
    const { status, limit = 50, offset = 0 } = params || {};

    const where: any = {};
    if (status) where.status = status;

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
    return this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        image: data.image,
        parentId: data.parentId,
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

  async deleteCategory(id: string) {
    // Check if category has products
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (category && category._count.products > 0) {
      throw new Error('Không thể xóa danh mục đang có sản phẩm');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  // ==================== PRODUCT MANAGEMENT ====================

  async getProducts(options: { status?: string; categoryId?: string; limit?: number; offset?: number }) {
    const { status, categoryId, limit = 50, offset = 0 } = options;
    const where: any = {};

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

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

  // ==================== SELLER MANAGEMENT ====================

  async getSellers(options: { limit?: number; offset?: number }) {
    const { limit = 50, offset = 0 } = options;

    const [sellers, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { role: 'SELLER' },
            { isSeller: true },
          ],
        },
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
        where: {
          OR: [
            { role: 'SELLER' },
            { isSeller: true },
          ],
        },
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

  // ==================== WITHDRAWAL MANAGEMENT ====================

  /**
   * Get all withdrawal requests
   */
  async getWithdrawals(params?: { status?: string; limit?: number; offset?: number }) {
    const { status, limit = 50, offset = 0 } = params || {};

    const where: any = {};
    if (status) where.status = status;

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

  async getSellerApplications(params: { status?: string; limit: number; offset: number }) {
    const where: any = {};
    if (params.status) {
      where.status = params.status;
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
