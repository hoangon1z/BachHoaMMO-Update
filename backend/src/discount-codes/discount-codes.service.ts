import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountCodeDto, UpdateDiscountCodeDto } from './dto/discount-code.dto';

@Injectable()
export class DiscountCodesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Seller tạo mã giảm giá mới
   */
  async create(sellerId: string, dto: CreateDiscountCodeDto) {
    // Validate: PERCENT phải từ 1-100
    if (dto.type === 'PERCENT' && (dto.value <= 0 || dto.value > 100)) {
      throw new BadRequestException('Phần trăm giảm giá phải từ 1 đến 100');
    }
    // Validate: FIXED phải > 0
    if (dto.type === 'FIXED' && dto.value <= 0) {
      throw new BadRequestException('Số tiền giảm giá phải lớn hơn 0');
    }

    // Chuẩn hóa code: uppercase, bỏ khoảng trắng
    const code = dto.code.toUpperCase().replace(/\s+/g, '');

    // Kiểm tra code đã tồn tại chưa
    const existing = await this.prisma.discountCode.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException(`Mã giảm giá "${code}" đã tồn tại`);
    }

    // Validate thời gian
    if (dto.startsAt && dto.expiresAt) {
      if (new Date(dto.startsAt) >= new Date(dto.expiresAt)) {
        throw new BadRequestException('Ngày bắt đầu phải trước ngày hết hạn');
      }
    }

    // Validate productIds nếu có
    if (dto.productIds) {
      try {
        const ids = JSON.parse(dto.productIds);
        if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
          throw new BadRequestException('productIds phải là JSON array of strings');
        }
        // Kiểm tra các product này thuộc về seller
        const products = await this.prisma.product.findMany({
          where: { id: { in: ids }, sellerId },
          select: { id: true },
        });
        if (products.length !== ids.length) {
          throw new BadRequestException('Một số sản phẩm không thuộc gian hàng của bạn');
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('productIds không hợp lệ');
      }
    }

    return this.prisma.discountCode.create({
      data: {
        code,
        sellerId,
        type: dto.type,
        value: dto.value,
        maxDiscount: dto.maxDiscount ?? null,
        minOrderValue: dto.minOrderValue ?? 0,
        usageLimit: dto.usageLimit ?? null,
        usageLimitPerUser: dto.usageLimitPerUser ?? 1,
        description: dto.description ?? null,
        productIds: dto.productIds ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: true,
      },
    });
  }

  /**
   * Lấy danh sách mã giảm giá của seller
   */
  async findAllBySeller(sellerId: string) {
    return this.prisma.discountCode.findMany({
      where: { sellerId },
      include: {
        _count: { select: { usages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cập nhật mã giảm giá
   */
  async update(id: string, sellerId: string, dto: UpdateDiscountCodeDto) {
    const code = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException('Mã giảm giá không tồn tại');
    if (code.sellerId !== sellerId) throw new ForbiddenException('Bạn không có quyền chỉnh sửa mã này');

    return this.prisma.discountCode.update({
      where: { id },
      data: {
        isActive: dto.isActive !== undefined ? dto.isActive : code.isActive,
        description: dto.description !== undefined ? dto.description : code.description,
        usageLimit: dto.usageLimit !== undefined ? dto.usageLimit : code.usageLimit,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : code.expiresAt,
      },
    });
  }

  /**
   * Xóa mã giảm giá
   */
  async remove(id: string, sellerId: string) {
    const code = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException('Mã giảm giá không tồn tại');
    if (code.sellerId !== sellerId) throw new ForbiddenException('Bạn không có quyền xóa mã này');

    // Không xóa nếu đã có lịch sử sử dụng, chỉ deactivate
    if (code.usageCount > 0) {
      return this.prisma.discountCode.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.discountCode.delete({ where: { id } });
  }

  /**
   * Validate và tính toán giảm giá cho buyer
   * Trả về discountAmount nếu hợp lệ, throw lỗi nếu không hợp lệ
   */
  async validateAndCalculate(
    code: string,
    orderTotal: number,
    sellerId: string,
    buyerId: string,
    productId?: string,
  ): Promise<{ discountCode: any; discountAmount: number }> {
    const normalizedCode = code.toUpperCase().trim();

    const discountCode = await this.prisma.discountCode.findUnique({
      where: { code: normalizedCode },
      include: {
        usages: {
          where: { userId: buyerId },
        },
      },
    });

    if (!discountCode) {
      throw new BadRequestException('Mã giảm giá không tồn tại');
    }

    // Kiểm tra mã thuộc seller này
    if (discountCode.sellerId !== sellerId) {
      throw new BadRequestException('Mã giảm giá không hợp lệ cho đơn hàng này');
    }

    // Kiểm tra giới hạn sản phẩm (nếu có)
    if (discountCode.productIds && productId) {
      const allowedIds: string[] = JSON.parse(discountCode.productIds);
      if (!allowedIds.includes(productId)) {
        throw new BadRequestException('Mã giảm giá không áp dụng cho sản phẩm này');
      }
    }

    // Kiểm tra isActive
    if (!discountCode.isActive) {
      throw new BadRequestException('Mã giảm giá đã bị vô hiệu hóa');
    }

    // Kiểm tra thời gian bắt đầu
    const now = new Date();
    if (discountCode.startsAt && now < discountCode.startsAt) {
      throw new BadRequestException('Mã giảm giá chưa có hiệu lực');
    }

    // Kiểm tra hết hạn
    if (discountCode.expiresAt && now > discountCode.expiresAt) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }

    // Kiểm tra tổng số lần sử dụng
    if (discountCode.usageLimit !== null && discountCode.usageCount >= discountCode.usageLimit) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }

    // Kiểm tra giới hạn per user
    if (discountCode.usageLimitPerUser !== null) {
      const userUsageCount = discountCode.usages.length;
      if (userUsageCount >= discountCode.usageLimitPerUser) {
        throw new BadRequestException('Bạn đã sử dụng mã giảm giá này rồi');
      }
    }

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (orderTotal < discountCode.minOrderValue) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${discountCode.minOrderValue.toLocaleString('vi-VN')}đ để dùng mã này`
      );
    }

    // Tính số tiền giảm
    let discountAmount = 0;
    if (discountCode.type === 'PERCENT') {
      discountAmount = (orderTotal * discountCode.value) / 100;
      // Áp dụng giới hạn tối đa nếu có
      if (discountCode.maxDiscount && discountAmount > discountCode.maxDiscount) {
        discountAmount = discountCode.maxDiscount;
      }
    } else {
      // FIXED
      discountAmount = discountCode.value;
      // Không được giảm hơn tổng đơn hàng
      if (discountAmount > orderTotal) {
        discountAmount = orderTotal;
      }
    }

    // Làm tròn xuống đơn vị nghìn đồng
    discountAmount = Math.floor(discountAmount);

    return { discountCode, discountAmount };
  }

  /**
   * Ghi nhận việc sử dụng mã (gọi bên trong transaction tạo đơn hàng)
   */
  async recordUsage(
    tx: any,
    discountCodeId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ) {
    // Tăng usageCount
    await tx.discountCode.update({
      where: { id: discountCodeId },
      data: { usageCount: { increment: 1 } },
    });

    // Tạo bản ghi usage
    await tx.discountCodeUsage.create({
      data: {
        discountCodeId,
        userId,
        orderId,
        discountAmount,
      },
    });
  }

  /**
   * Admin: lấy tất cả mã giảm giá
   */
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.discountCode.findMany({
        skip,
        take: limit,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          _count: { select: { usages: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.discountCode.count(),
    ]);
    return { items, total, page, limit };
  }
}
