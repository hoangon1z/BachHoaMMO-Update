import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../security/decorators/security.decorators';

@Controller('shop')
@Public() // All shop endpoints are public
export class PublicSellerController {
  constructor(private prisma: PrismaService) {}

  /**
   * Get public shop/seller profile
   * GET /shop/:id
   */
  @Get(':id')
  async getShopProfile(@Param('id') id: string) {
    // Get seller user info
    const seller = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        sellerProfile: {
          select: {
            id: true,
            shopName: true,
            shopDescription: true,
            shopLogo: true,
            rating: true,
            totalSales: true,
            isVerified: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            products: {
              where: { status: 'ACTIVE' },
            },
            sales: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
    });

    if (!seller) {
      return { error: 'Shop not found', statusCode: 404 };
    }

    return {
      id: seller.id,
      name: seller.sellerProfile?.shopName || seller.name || 'Shop',
      description: seller.sellerProfile?.shopDescription || '',
      logo: seller.sellerProfile?.shopLogo || seller.avatar,
      rating: seller.sellerProfile?.rating || 0,
      totalSales: seller.sellerProfile?.totalSales || seller._count.sales || 0,
      totalProducts: seller._count.products || 0,
      isVerified: seller.sellerProfile?.isVerified || false,
      joinDate: seller.createdAt,
    };
  }

  /**
   * Get shop products
   * GET /shop/:id/products
   */
  @Get(':id/products')
  async getShopProducts(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '12');
    const skip = (pageNum - 1) * limitNum;

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'best_selling') orderBy = { sales: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          sellerId: id,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          salePrice: true,
          images: true,
          stock: true,
          sales: true,
          rating: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      this.prisma.product.count({
        where: {
          sellerId: id,
          status: 'ACTIVE',
        },
      }),
    ]);

    return {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get shop categories (categories that have products from this seller)
   * GET /shop/:id/categories
   */
  @Get(':id/categories')
  async getShopCategories(@Param('id') id: string) {
    const categories = await this.prisma.category.findMany({
      where: {
        products: {
          some: {
            sellerId: id,
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: {
              where: {
                sellerId: id,
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      productCount: cat._count.products,
    }));
  }
}
