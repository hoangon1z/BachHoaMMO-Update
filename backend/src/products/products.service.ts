import { Injectable, NotFoundException } from '@nestjs/common';
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
      // Check if this is a parent category (has children)
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true },
      });
      
      if (childCategories.length > 0) {
        // Parent category selected - include products from all child categories
        const categoryIds = [categoryId, ...childCategories.map(c => c.id)];
        where.categoryId = { in: categoryIds };
      } else {
        // Child category or no children - exact match
        where.categoryId = categoryId;
      }
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
    // Find first - avoid "Record to update not found" when id is invalid (e.g. slug)
    const product = await this.prisma.product.findUnique({
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

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Increment views (fire-and-forget, don't block response)
    this.prisma.product
      .update({
        where: { id },
        data: { views: { increment: 1 } },
      })
      .catch(() => {});

    return product;
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

  /**
   * Track product view by logged-in user
   */
  async trackView(productId: string, userId: string) {
    // Don't count view from product owner
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId === userId) {
      return { success: true, message: 'Own product view not counted' };
    }

    // Increment view count
    await this.prisma.product.update({
      where: { id: productId },
      data: { views: { increment: 1 } },
    });

    return { success: true };
  }

  /**
   * Get product reviews
   */
  async getProductReviews(productId: string, params: { skip: number; take: number }) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    // Get buyer info for all reviews (always show name)
    const reviewsWithBuyer = await Promise.all(
      reviews.map(async (review) => {
        const buyer = await this.prisma.user.findUnique({
          where: { id: review.buyerId },
          select: { name: true, avatar: true },
        });
        return { ...review, buyer };
      }),
    );

    // Calculate rating stats
    const allReviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const ratingStats = {
      average: allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0,
      total: allReviews.length,
      breakdown: [5, 4, 3, 2, 1].map(star => ({
        star,
        count: allReviews.filter(r => r.rating === star).length,
      })),
    };

    return {
      reviews: reviewsWithBuyer,
      total,
      ratingStats,
    };
  }
}
