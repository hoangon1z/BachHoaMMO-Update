import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug, createUniqueSlug } from '../common/utils/slug.util';
import { SeoService } from '../seo/seo.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SeoService))
    private seoService: SeoService,
  ) { }

  /**
   * Check if a product slug already exists
   */
  private async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    return existing !== null && existing.id !== excludeId;
  }

  /**
   * Generate unique slug for product
   */
  private async generateProductSlug(title: string, excludeId?: string): Promise<string> {
    return createUniqueSlug(title, (slug) => this.slugExists(slug, excludeId));
  }

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
      seller: { isBanned: false },
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
    } else if (sortBy === 'popular' || sortBy === 'best_selling') {
      orderBy.sales = 'desc';
    } else if (sortBy === 'rating') {
      orderBy.rating = 'desc';
    } else if (sortBy === 'newest') {
      orderBy.createdAt = 'desc';
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
        take: take + 10, // Fetch extra for boost reordering
      }),
      this.prisma.product.count({ where }),
    ]);

    // === AUCTION WINNER SEARCH BOOST (4 days) ===
    // Only boost on first page and default/popular sort
    if (skip === 0 && (sortBy === 'createdAt' || sortBy === 'popular')) {
      try {
        const fourDaysAgo = new Date(Date.now() - 4 * 86400000);
        const recentWinners = await this.prisma.auctionBid.findMany({
          where: {
            status: 'WON',
            createdAt: { gte: fourDaysAgo },
          },
          select: { sellerId: true, position: true },
        });

        // Build map: sellerId → best position (1 = highest priority)
        const winnerPositions = new Map<string, number>();
        for (const w of recentWinners) {
          const existing = winnerPositions.get(w.sellerId) || 99;
          if (w.position < existing) winnerPositions.set(w.sellerId, w.position);
        }

        if (winnerPositions.size > 0) {
          // Separate winner products and regular products
          const winnerProducts = products
            .filter(p => winnerPositions.has(p.sellerId))
            .sort((a, b) => (winnerPositions.get(a.sellerId) || 99) - (winnerPositions.get(b.sellerId) || 99));
          const regularProducts = products.filter(p => !winnerPositions.has(p.sellerId));

          // Winner products go first (sorted by position), then regular
          const boosted = [...winnerProducts, ...regularProducts].slice(0, take);
          return {
            products: boosted,
            total,
            page: Math.floor(skip / take) + 1,
            totalPages: Math.ceil(total / take),
          };
        }
      } catch {
        // Silently fail boost — return normal results
      }
    }

    return {
      products: products.slice(0, take),
      total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Find product by ID or slug
   * Automatically detects if the identifier is a UUID or slug
   */
  async findOne(idOrSlug: string) {
    // UUID pattern detection (standard UUID format)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let product;

    if (isUuid) {
      // Query by ID
      product = await this.prisma.product.findUnique({
        where: { id: idOrSlug },
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
    } else {
      // Query by slug (SEO-friendly URL)
      product = await this.prisma.product.findUnique({
        where: { slug: idOrSlug },
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

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Hide products from banned sellers
    if (product.seller?.isBanned) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Hide INACTIVE products from public view
    if (product.status === 'INACTIVE') {
      throw new NotFoundException('Sản phẩm đang tạm ngừng bán');
    }

    // Increment views (fire-and-forget, don't block response)
    this.prisma.product
      .update({
        where: { id: product.id },
        data: { views: { increment: 1 } },
      })
      .catch(() => { });

    return product;
  }

  /**
   * Find product by SEO-friendly slug
   */
  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
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

    // Hide products from banned sellers
    if (product.seller?.isBanned) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Hide INACTIVE products from public view
    if (product.status === 'INACTIVE') {
      throw new NotFoundException('Sản phẩm đang tạm ngừng bán');
    }

    // Increment views (fire-and-forget, don't block response)
    this.prisma.product
      .update({
        where: { slug },
        data: { views: { increment: 1 } },
      })
      .catch(() => { });

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

    // Generate SEO-friendly slug from title
    const slug = await this.generateProductSlug(data.title);

    let product;

    // Nếu có variants, tạo product với variants
    if (hasVariants && variants && variants.length > 0) {
      product = await this.prisma.product.create({
        data: {
          ...productData,
          slug,
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
    } else {
      // Không có variants
      product = await this.prisma.product.create({
        data: {
          ...productData,
          slug,
        },
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

    // 🚀 AUTO-NOTIFY GOOGLE: Sản phẩm mới được tạo
    this.logger.log(`🔔 Notifying Google about new product: ${product.slug}`);
    this.seoService.notifyProductCreated(product.id, product.slug).catch((err) => {
      this.logger.error(`Failed to notify Google for product ${product.slug}:`, err);
    });

    return product;
  }

  async update(id: string, data: any) {
    const { variants, ...productData } = data;

    let slugChanged = false;

    // If title is being updated, regenerate slug
    if (productData.title) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
        select: { title: true },
      });
      // Only regenerate slug if title actually changed
      if (existingProduct && existingProduct.title !== productData.title) {
        productData.slug = await this.generateProductSlug(productData.title, id);
        slugChanged = true;
      }
    }

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

    const updatedProduct = await this.prisma.product.update({
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

    // 🚀 AUTO-NOTIFY GOOGLE: Sản phẩm được cập nhật (chỉ khi slug thay đổi/nội dung quan trọng)
    if (slugChanged || data.description || data.price) {
      this.logger.log(`🔔 Notifying Google about updated product: ${updatedProduct.slug}`);
      this.seoService.notifyProductCreated(updatedProduct.id, updatedProduct.slug).catch((err) => {
        this.logger.error(`Failed to notify Google:`, err);
      });
    }

    return updatedProduct;
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

  /**
   * Simple seeded random number generator (deterministic per seed)
   * Returns a function that generates numbers between 0 and 1
   */
  private seededRandom(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Get daily seed - same value for the whole day (Vietnam timezone)
   * Changes at midnight VN time → products rotate daily
   */
  private getDailySeed(): number {
    const now = new Date();
    // Vietnam is UTC+7
    const vnDay = new Date(now.getTime() + 7 * 3600000);
    const dayStr = vnDay.toISOString().split('T')[0]; // "2026-03-02"
    let hash = 0;
    for (let i = 0; i < dayStr.length; i++) {
      hash = ((hash << 5) - hash) + dayStr.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Sản phẩm nổi bật - Thuật toán ƯU TIÊN UY TÍN + CHUYỂN ĐỔI
   * 
   * 1. Mỗi seller tối đa 2 sản phẩm
   * 2. Score = sales(×5) + rating(×20) + insurance + completionRate + views(×0.3) + freshness + auction
   * 3. Random chỉ chiếm ~5-10% tổng score (0-5 điểm)
   * 4. Auction winners: TOP1 +200, TOP2 +150, TOP3 +100
   */
  async getFeatured() {
    const MAX_PER_SELLER = 2;
    const CANDIDATE_POOL = 80;
    const RESULT_COUNT = 12;

    const candidates = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        stock: { gt: 0 },
        seller: { isBanned: false },
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
      take: CANDIDATE_POOL,
    });

    const now = Date.now();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

    // Daily seeded random - same result all day, changes at midnight VN
    const dailyRng = this.seededRandom(this.getDailySeed());

    // Fetch recent auction winners (last 4 days) with position info
    const winnerBoosts = new Map<string, number>();
    try {
      const fourDaysAgo = new Date(Date.now() - 4 * 86400000);
      const recentWinners = await this.prisma.auctionBid.findMany({
        where: { status: 'WON', createdAt: { gte: fourDaysAgo } },
        select: { sellerId: true, position: true },
      });
      for (const w of recentWinners) {
        const boost = w.position === 1 ? 200 : w.position === 2 ? 150 : 100;
        const existing = winnerBoosts.get(w.sellerId) || 0;
        if (boost > existing) winnerBoosts.set(w.sellerId, boost);
      }
    } catch { }

    const scored = candidates.map((product) => {
      const ageMs = now - new Date(product.createdAt).getTime();
      const updateAgeMs = now - new Date(product.updatedAt).getTime();

      // Freshness bonus (giảm dần theo tuổi)
      const freshnessBonus = ageMs < ONE_WEEK ? 10
        : ageMs < ONE_MONTH ? 5
          : 1;
      const updateBonus = updateAgeMs < ONE_WEEK ? 3 : 0;

      // Insurance tier bonus (shop uy tín)
      const insuranceLevel = product.seller?.sellerProfile?.insuranceLevel || 0;
      const insuranceBonus = insuranceLevel >= 3 ? 30
        : insuranceLevel >= 2 ? 20
          : insuranceLevel >= 1 ? 10
            : 0;

      // Seller verification bonus
      const isVerified = product.seller?.sellerProfile?.isVerified || false;
      const verifiedBonus = isVerified ? 15 : 0;

      // Seller rating bonus (tỷ lệ đánh giá shop)
      const sellerRating = product.seller?.sellerProfile?.rating || 0;
      const sellerRatingBonus = sellerRating * 5; // Max ~25đ cho rating 5.0

      // Auction winner boost
      const auctionBoost = winnerBoosts.get(product.sellerId) || 0;

      // Daily random: CHỈ 0-5 điểm (~5-10% tổng score)
      const dailyJitter = dailyRng() * 5;

      const score = (product.sales * 5)           // Doanh số (trọng số cao nhất)
        + (product.rating * 20)                     // Đánh giá sản phẩm
        + (product.views * 0.3)                     // Lượt xem (trọng số thấp)
        + freshnessBonus                            // Sản phẩm mới
        + updateBonus                               // Mới cập nhật
        + insuranceBonus                            // Gói bảo hiểm shop
        + verifiedBonus                             // Shop đã xác minh
        + sellerRatingBonus                         // Rating shop
        + dailyJitter                               // Random nhỏ (~5%)
        + auctionBoost;                             // Đấu giá

      return { ...product, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    // Giới hạn mỗi seller tối đa MAX_PER_SELLER sản phẩm
    const sellerCount: Record<string, number> = {};
    const result: typeof scored = [];

    for (const product of scored) {
      if (result.length >= RESULT_COUNT) break;

      const sellerId = product.sellerId;
      const currentCount = sellerCount[sellerId] || 0;

      if (currentCount < MAX_PER_SELLER) {
        sellerCount[sellerId] = currentCount + 1;
        result.push(product);
      }
    }

    return result.map(({ _score, ...product }) => product);
  }

  /**
   * Bán chạy nhất tuần - Sản phẩm có nhiều đơn hoàn tất trong 7 ngày qua
   * 
   * 1. Lọc OrderItem COMPLETED trong 7 ngày
   * 2. Tổng quantity mỗi product → xếp hạng
   * 3. Mỗi seller tối đa 2 sản phẩm
   */
  async getBestSellersWeekly() {
    const MAX_PER_SELLER = 2;
    const RESULT_COUNT = 12;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Lấy top products theo đơn hàng hoàn tất trong tuần
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { in: ['COMPLETED', 'PROCESSING'] },
          createdAt: { gte: sevenDaysAgo },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 40,
    });

    if (topProducts.length === 0) {
      // Fallback: trả về sản phẩm có sales cao nhất
      return this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          stock: { gt: 0 },
          seller: { isBanned: false },
          sales: { gt: 0 },
        },
        include: {
          seller: { include: { sellerProfile: true } },
          category: true,
          variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
        },
        orderBy: { sales: 'desc' },
        take: RESULT_COUNT,
      });
    }

    const productIds = topProducts.map(p => p.productId);
    const salesMap = new Map(topProducts.map(p => [p.productId, p._sum.quantity || 0]));

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: 'ACTIVE',
        stock: { gt: 0 },
        seller: { isBanned: false },
      },
      include: {
        seller: { include: { sellerProfile: true } },
        category: true,
        variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
      },
    });

    // Sort by weekly sales
    products.sort((a, b) => (salesMap.get(b.id) || 0) - (salesMap.get(a.id) || 0));

    // Giới hạn mỗi seller tối đa MAX_PER_SELLER
    const sellerCount: Record<string, number> = {};
    const result: typeof products = [];

    for (const product of products) {
      if (result.length >= RESULT_COUNT) break;
      const currentCount = sellerCount[product.sellerId] || 0;
      if (currentCount < MAX_PER_SELLER) {
        sellerCount[product.sellerId] = currentCount + 1;
        result.push(product);
      }
    }

    return result;
  }

  /**
   * Shop uy tín - Sản phẩm từ sellers có bảo hiểm + rating cao
   * 
   * 1. Seller phải có insuranceLevel >= 1 HOẶC isVerified
   * 2. Ưu tiên theo insuranceLevel → rating → sales
   * 3. Mỗi seller tối đa 2 sản phẩm
   */
  async getTrustedShopProducts() {
    const MAX_PER_SELLER = 2;
    const RESULT_COUNT = 12;

    const candidates = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        stock: { gt: 0 },
        seller: {
          isBanned: false,
          sellerProfile: {
            OR: [
              { insuranceLevel: { gte: 1 } },
              { isVerified: true },
            ],
          },
        },
      },
      include: {
        seller: { include: { sellerProfile: true } },
        category: true,
        variants: { where: { isActive: true }, orderBy: { position: 'asc' } },
      },
      take: 60,
    });

    // Daily seeded random for variety
    const dailyRng = this.seededRandom(this.getDailySeed() + 7777);

    const scored = candidates.map(product => {
      const insuranceLevel = product.seller?.sellerProfile?.insuranceLevel || 0;
      const sellerRating = product.seller?.sellerProfile?.rating || 0;
      const isVerified = product.seller?.sellerProfile?.isVerified ? 1 : 0;

      const score = (insuranceLevel * 50)       // Bảo hiểm cao = uy tín cao
        + (sellerRating * 15)                    // Rating shop
        + (isVerified * 20)                      // Đã xác minh
        + (product.sales * 2)                    // Doanh số
        + (product.rating * 10)                  // Rating sản phẩm
        + (dailyRng() * 5);                      // Random nhỏ

      return { ...product, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    const sellerCount: Record<string, number> = {};
    const result: typeof scored = [];

    for (const product of scored) {
      if (result.length >= RESULT_COUNT) break;
      const currentCount = sellerCount[product.sellerId] || 0;
      if (currentCount < MAX_PER_SELLER) {
        sellerCount[product.sellerId] = currentCount + 1;
        result.push(product);
      }
    }

    return result.map(({ _score, ...product }) => product);
  }

  /**
   * Sản phẩm mới nhất - Thuật toán CÔNG BẰNG + XOAY VÒNG HÀNG NGÀY
   * 
   * 1. Mỗi seller tối đa 2 sản phẩm
   * 2. Ưu tiên sản phẩm mới nhất
   * 3. Daily seed random: cùng ngày = cùng thứ tự, ngày mới = thứ tự mới
   */
  async getLatest() {
    const MAX_PER_SELLER = 2;
    const CANDIDATE_POOL = 40;
    const RESULT_COUNT = 12;

    const candidates = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        seller: { isBanned: false },
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
      take: CANDIDATE_POOL,
    });

    // Daily seeded jitter: same all day, shuffles at midnight VN
    const dailyRng = this.seededRandom(this.getDailySeed() + 9999); // Different seed from featured

    const withJitter = candidates.map(product => ({
      ...product,
      _sortKey: new Date(product.createdAt).getTime() + (dailyRng() * 3600000), // ±1 giờ jitter (seeded)
    }));
    withJitter.sort((a, b) => b._sortKey - a._sortKey);

    // Giới hạn mỗi seller tối đa MAX_PER_SELLER
    const sellerCount: Record<string, number> = {};
    const result: typeof withJitter = [];

    for (const product of withJitter) {
      if (result.length >= RESULT_COUNT) break;

      const sellerId = product.sellerId;
      const currentCount = sellerCount[sellerId] || 0;

      if (currentCount < MAX_PER_SELLER) {
        sellerCount[sellerId] = currentCount + 1;
        result.push(product);
      }
    }

    return result.map(({ _sortKey, ...product }) => product);
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
