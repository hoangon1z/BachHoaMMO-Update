import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // Get public profile (for chat header, etc.)
  async getPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        isSeller: true,
        sellerProfile: {
          select: {
            shopName: true,
            shopLogo: true,
            shopDescription: true,
            rating: true,
            totalSales: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(data: { email: string; password: string; name?: string }): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateProfile(id: string, data: { name?: string; phone?: string; address?: string }): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateAvatar(id: string, avatar: string): Promise<User> {
    // Update user avatar
    const user = await this.prisma.user.update({
      where: { id },
      data: { avatar },
    });

    // Nếu user là seller, đồng bộ avatar vào shopLogo
    if (user.isSeller) {
      await this.prisma.sellerProfile.updateMany({
        where: { userId: id },
        data: { shopLogo: avatar },
      });
    }

    return user;
  }

  // ==================== SELLER APPLICATION ====================

  async applyForSeller(
    userId: string,
    data: {
      fullName: string;
      shopName: string;
      email: string;
      phone?: string;
      description?: string;
      agreement: boolean;
    },
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a seller
    if (user.isSeller) {
      throw new BadRequestException('Bạn đã là người bán');
    }

    // Check if already has pending application
    const existingApplication = await this.prisma.sellerApplication.findFirst({
      where: { userId, status: 'PENDING' },
    });

    if (existingApplication) {
      throw new BadRequestException('Bạn đã có đơn đăng ký đang chờ duyệt');
    }

    // Validate agreement
    if (!data.agreement) {
      throw new BadRequestException('Bạn phải đồng ý với điều khoản');
    }

    // Create application
    const application = await this.prisma.sellerApplication.create({
      data: {
        userId,
        fullName: data.fullName,
        shopName: data.shopName,
        email: data.email,
        phone: data.phone,
        description: data.description,
        agreement: data.agreement,
      },
    });

    return {
      success: true,
      message: 'Đơn đăng ký đã được gửi. Vui lòng chờ Admin duyệt.',
      application,
    };
  }

  async getSellerApplication(userId: string) {
    const application = await this.prisma.sellerApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return application;
  }
}
