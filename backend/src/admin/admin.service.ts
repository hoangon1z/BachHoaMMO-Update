import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { OrdersService } from '../orders/orders.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private ordersService: OrdersService,
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
  async getAllUsers(params?: { role?: string; limit?: number; offset?: number }) {
    const { role, limit = 50, offset = 0 } = params || {};

    const where: any = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isSeller: true,
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
  }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        image: data.image,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async updateCategory(id: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    image?: string;
  }) {
    return this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        image: data.image,
      },
      include: {
        _count: {
          select: { products: true },
        },
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
    return this.prisma.product.delete({
      where: { id },
    });
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
}
