import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  async findAll(params?: {
    skip?: number;
    take?: number;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  }) {
    const {
      skip = 0,
      take = 20,
      categoryId,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
    } = params || {};

    const where: any = {
      status: 'ACTIVE',
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const orderBy: any = {};
    if (sortBy === 'price_asc') {
      orderBy.price = 'asc';
    } else if (sortBy === 'price_desc') {
      orderBy.price = 'desc';
    } else if (sortBy === 'popular') {
      orderBy.sales = 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          seller: {
            include: {
              sellerProfile: true,
            },
          },
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: { position: 'asc' },
          },
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: string) {
    // Increment views
    await this.prisma.product.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async create(data: {
    title: string;
    description: string;
    price: number;
    salePrice?: number;
    stock: number;
    images: string;
    categoryId: string;
    sellerId: string;
    tags?: string;
    hasVariants?: boolean;
    variants?: Array<{
      name: string;
      price: number;
      salePrice?: number;
      stock: number;
      position?: number;
    }>;
  }) {
    const { variants, hasVariants, ...productData } = data;

    // Nếu có variants, tạo product với variants
    if (hasVariants && variants && variants.length > 0) {
      return this.prisma.product.create({
        data: {
          ...productData,
          hasVariants: true,
          variants: {
            create: variants.map((v, index) => ({
              name: v.name,
              price: v.price,
              salePrice: v.salePrice,
              stock: v.stock,
              position: v.position ?? index,
            })),
          },
        },
        include: {
          seller: {
            include: {
              sellerProfile: true,
            },
          },
          category: true,
          variants: {
            orderBy: { position: 'asc' },
          },
        },
      });
    }

    // Không có variants
    return this.prisma.product.create({
      data: productData,
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        category: true,
        variants: true,
      },
    });
  }

  async update(id: string, data: any) {
    const { variants, ...productData } = data;

    // Nếu có cập nhật variants
    if (variants !== undefined) {
      // Xóa tất cả variants cũ và tạo mới
      await this.prisma.productVariant.deleteMany({
        where: { productId: id },
      });

      if (variants && variants.length > 0) {
        await this.prisma.productVariant.createMany({
          data: variants.map((v: any, index: number) => ({
            productId: id,
            name: v.name,
            price: v.price,
            salePrice: v.salePrice,
            stock: v.stock,
            position: v.position ?? index,
          })),
        });
        productData.hasVariants = true;
      } else {
        productData.hasVariants = false;
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: productData,
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        category: true,
        variants: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }

  // Variant CRUD methods
  async addVariant(productId: string, data: {
    name: string;
    price: number;
    salePrice?: number;
    stock: number;
    position?: number;
  }) {
    // Cập nhật product hasVariants = true
    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });

    return this.prisma.productVariant.create({
      data: {
        ...data,
        productId,
      },
    });
  }

  async updateVariant(variantId: string, data: {
    name?: string;
    price?: number;
    salePrice?: number;
    stock?: number;
    position?: number;
    isActive?: boolean;
  }) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data,
    });
  }

  async deleteVariant(variantId: string) {
    const variant = await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    // Kiểm tra xem còn variant nào không
    const remainingVariants = await this.prisma.productVariant.count({
      where: { productId: variant.productId },
    });

    if (remainingVariants === 0) {
      await this.prisma.product.update({
        where: { id: variant.productId },
        data: { hasVariants: false },
      });
    }

    return variant;
  }

  async getFeatured() {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: [
        { sales: 'desc' },
        { views: 'desc' },
      ],
      take: 12,
    });
  }

  async getLatest() {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 12,
    });
  }
}
