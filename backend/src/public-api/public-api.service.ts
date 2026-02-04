import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import {
  GetInventoryQueryDto,
  AddInventoryDto,
  DeleteMultipleInventoryDto,
  GetProductsQueryDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  GetOrdersQueryDto,
  ManualDeliverDto,
  CreateVariantDto,
  UpdateVariantDto,
} from './dto';

@Injectable()
export class PublicApiService {
  private readonly logger = new Logger(PublicApiService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== CATEGORIES ====================

  async getCategories() {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      productCount: c._count.products,
    }));
  }

  // ==================== INVENTORY ====================

  async getInventoryCount(sellerId: string, productId?: string, variantId?: string) {
    const where: any = { product: { sellerId } };
    
    if (productId) {
      // Verify product belongs to seller
      const product = await this.prisma.product.findFirst({
        where: { id: productId, sellerId },
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      where.productId = productId;
    }
    
    if (variantId) {
      where.variantId = variantId;
    }

    const stats = await this.prisma.productInventory.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const result = {
      total: 0,
      available: 0,
      reserved: 0,
      sold: 0,
      disabled: 0,
    };

    stats.forEach((s) => {
      result.total += s._count.status;
      const key = s.status.toLowerCase() as keyof typeof result;
      if (key in result && key !== 'total') {
        result[key] = s._count.status;
      }
    });

    return result;
  }

  async getInventory(sellerId: string, query: GetInventoryQueryDto) {
    const { productId, variantId, status, limit = 50, offset = 0 } = query;

    // Build where clause
    const where: any = {};
    
    if (productId) {
      // Verify product belongs to seller
      const product = await this.prisma.product.findFirst({
        where: { id: productId, sellerId },
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      where.productId = productId;
    } else {
      // Get all products of seller
      where.product = { sellerId };
    }

    if (variantId) {
      where.variantId = variantId;
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.productInventory.findMany({
        where,
        select: {
          id: true,
          productId: true,
          variantId: true,
          status: true,
          createdAt: true,
          // Note: accountData is NOT returned for security
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.productInventory.count({ where }),
    ]);

    // Get stats
    const stats = await this.prisma.productInventory.groupBy({
      by: ['status'],
      where: productId ? { productId } : { product: { sellerId } },
      _count: { status: true },
    });

    const statsMap = {
      total,
      available: 0,
      reserved: 0,
      sold: 0,
      disabled: 0,
    };

    stats.forEach((s) => {
      const key = s.status.toLowerCase() as keyof typeof statsMap;
      if (key in statsMap) {
        statsMap[key] = s._count.status;
      }
    });

    return {
      items,
      stats: statsMap,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + items.length < total,
      },
    };
  }

  async addInventory(sellerId: string, dto: AddInventoryDto) {
    const { productId, variantId, items } = dto;

    // Verify product belongs to seller
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify variant if provided
    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        throw new NotFoundException('Variant not found');
      }
    }

    // Process items
    const results = {
      added: 0,
      duplicates: 0,
      errors: [] as string[],
    };

    for (const accountData of items) {
      const trimmed = accountData.trim();
      if (!trimmed) continue;

      // Generate hash for duplicate detection
      const hash = createHash('sha256').update(trimmed).digest('hex');

      try {
        await this.prisma.productInventory.create({
          data: {
            productId,
            variantId: variantId || null,
            accountData: trimmed,
            hash,
            status: 'AVAILABLE',
          },
        });
        results.added++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint violation (duplicate)
          results.duplicates++;
        } else {
          results.errors.push(`Failed to add item: ${error.message}`);
        }
      }
    }

    // Update product stock
    await this.updateProductStock(productId, variantId);

    return results;
  }

  async deleteInventoryItem(sellerId: string, inventoryId: string) {
    // Find inventory and verify ownership
    const inventory = await this.prisma.productInventory.findFirst({
      where: { id: inventoryId },
      include: { product: true },
    });

    if (!inventory || inventory.product.sellerId !== sellerId) {
      throw new NotFoundException('Inventory item not found');
    }

    if (inventory.status === 'SOLD') {
      throw new BadRequestException('Cannot delete sold inventory item');
    }

    await this.prisma.productInventory.delete({
      where: { id: inventoryId },
    });

    // Update product stock
    await this.updateProductStock(inventory.productId, inventory.variantId);

    return { deleted: true };
  }

  async deleteMultipleInventory(sellerId: string, dto: DeleteMultipleInventoryDto) {
    const { ids } = dto;

    // Find all items and verify ownership
    const items = await this.prisma.productInventory.findMany({
      where: { id: { in: ids } },
      include: { product: true },
    });

    // Filter to only items owned by seller and not sold
    const validIds = items
      .filter((item) => item.product.sellerId === sellerId && item.status !== 'SOLD')
      .map((item) => item.id);

    if (validIds.length === 0) {
      return { deleted: 0, skipped: ids.length };
    }

    // Delete items
    const result = await this.prisma.productInventory.deleteMany({
      where: { id: { in: validIds } },
    });

    // Update stock for affected products
    const productIds = [...new Set(items.filter((i) => validIds.includes(i.id)).map((i) => i.productId))];
    for (const productId of productIds) {
      await this.updateProductStock(productId, null);
    }

    return {
      deleted: result.count,
      skipped: ids.length - result.count,
    };
  }

  // ==================== PRODUCTS ====================

  async getProducts(sellerId: string, query: GetProductsQueryDto) {
    const { categoryId, search, status, limit = 20, offset = 0 } = query;

    const where: any = { sellerId };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    } else {
      // Default: show active and out of stock
      where.status = { in: ['ACTIVE', 'OUT_OF_STOCK'] };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          variants: {
            where: { isActive: true },
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Transform response
    const items = products.map((p) => this.transformProduct(p));

    return {
      items,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + items.length < total,
      },
    };
  }

  async getProduct(sellerId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.transformProduct(product);
  }

  async createProduct(sellerId: string, dto: CreateProductDto) {
    const {
      title,
      description,
      price,
      originalPrice,
      stock,
      categoryId,
      images,
      tags,
      autoDelivery,
      productType,
      requiredBuyerFields,
      hasVariants,
      variants,
    } = dto;

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Create product
    const product = await this.prisma.product.create({
      data: {
        title,
        description,
        price,
        salePrice: originalPrice || null,
        stock: stock || 0,
        categoryId,
        sellerId,
        images: JSON.stringify(images),
        tags: tags ? JSON.stringify(tags) : null,
        autoDelivery: autoDelivery ?? true,
        productType: productType || 'STANDARD',
        requiredBuyerFields: requiredBuyerFields ? JSON.stringify(requiredBuyerFields) : null,
        hasVariants: hasVariants || false,
        status: 'ACTIVE',
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    // Create variants if provided
    if (hasVariants && variants && variants.length > 0) {
      await this.prisma.productVariant.createMany({
        data: variants.map((v, index) => ({
          productId: product.id,
          name: v.name,
          price: v.price,
          salePrice: v.originalPrice || null,
          stock: v.stock || 0,
          position: index,
          isActive: true,
        })),
      });
    }

    // Fetch complete product
    const fullProduct = await this.prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: { select: { id: true, name: true } },
        variants: { orderBy: { position: 'asc' } },
      },
    });

    return this.transformProduct(fullProduct!);
  }

  async updateProduct(sellerId: string, productId: string, dto: UpdateProductDto) {
    // Verify ownership
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { originalPrice, images, tags, ...rest } = dto;

    const updateData: any = { ...rest };

    if (originalPrice !== undefined) {
      updateData.salePrice = originalPrice;
    }

    if (images !== undefined) {
      updateData.images = JSON.stringify(images);
    }

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(tags);
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    return this.transformProduct(updated);
  }

  async updateProductStock(productId: string, variantId?: string | null) {
    if (variantId) {
      // Update variant stock
      const count = await this.prisma.productInventory.count({
        where: { variantId, status: 'AVAILABLE' },
      });
      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: count },
      });
    }

    // Update product stock (total available)
    const totalCount = await this.prisma.productInventory.count({
      where: { productId, status: 'AVAILABLE' },
    });

    const newStatus = totalCount > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        stock: totalCount,
        status: newStatus,
      },
    });

    return { stock: totalCount, status: newStatus };
  }

  async setProductStock(sellerId: string, productId: string, dto: UpdateStockDto) {
    // Verify ownership
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const newStatus = dto.stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        stock: dto.stock,
        status: newStatus,
      },
    });

    return { stock: updated.stock, status: updated.status };
  }

  async deleteProduct(sellerId: string, productId: string) {
    // Verify ownership
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Soft delete by setting status to INACTIVE
    await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'INACTIVE' },
    });

    return { deleted: true };
  }

  // ==================== VARIANTS ====================

  async getVariants(sellerId: string, productId: string) {
    // Verify ownership
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
      include: {
        variants: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      originalPrice: v.salePrice || undefined,
      stock: v.stock,
      isActive: v.isActive,
      position: v.position,
    }));
  }

  async createVariant(sellerId: string, productId: string, dto: CreateVariantDto) {
    // Verify ownership
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get max position
    const maxPosition = product.variants.length > 0
      ? Math.max(...product.variants.map((v) => v.position))
      : -1;

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        price: dto.price,
        salePrice: dto.originalPrice || null,
        stock: dto.stock || 0,
        position: dto.position ?? maxPosition + 1,
        isActive: true,
      },
    });

    // Update product to have variants
    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });

    return {
      id: variant.id,
      name: variant.name,
      price: variant.price,
      originalPrice: variant.salePrice || undefined,
      stock: variant.stock,
      isActive: variant.isActive,
      position: variant.position,
    };
  }

  async updateVariant(sellerId: string, productId: string, variantId: string, dto: UpdateVariantDto) {
    // Verify ownership
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify variant exists and belongs to product
    const existingVariant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!existingVariant) {
      throw new NotFoundException('Variant not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.originalPrice !== undefined) updateData.salePrice = dto.originalPrice;
    if (dto.stock !== undefined) updateData.stock = dto.stock;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.position !== undefined) updateData.position = dto.position;

    const variant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });

    return {
      id: variant.id,
      name: variant.name,
      price: variant.price,
      originalPrice: variant.salePrice || undefined,
      stock: variant.stock,
      isActive: variant.isActive,
      position: variant.position,
    };
  }

  async deleteVariant(sellerId: string, productId: string, variantId: string) {
    // Verify ownership
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify variant exists and belongs to product
    const existingVariant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!existingVariant) {
      throw new NotFoundException('Variant not found');
    }

    // Delete variant (or soft delete by setting isActive to false)
    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    // Check if product still has variants
    const remainingVariants = await this.prisma.productVariant.count({
      where: { productId },
    });

    if (remainingVariants === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { hasVariants: false },
      });
    }

    return { deleted: true };
  }

  // ==================== ORDERS ====================

  async getOrders(sellerId: string, query: GetOrdersQueryDto) {
    const { status, productId, fromDate, toDate, limit = 20, offset = 0 } = query;

    const where: any = { sellerId };

    if (status) {
      where.status = status;
    }

    if (productId) {
      where.items = { some: { productId } };
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, title: true } },
              variant: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.order.count({ where }),
    ]);

    const items = orders.map((order) => this.transformOrder(order));

    return {
      items,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + items.length < total,
      },
    };
  }

  async getOrder(sellerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, title: true } },
            variant: { select: { id: true, name: true } },
            deliveries: true,
          },
        },
        deliveries: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.transformOrderDetail(order);
  }

  async manualDeliver(sellerId: string, orderId: string, dto: ManualDeliverDto) {
    const { orderItemId, accountData } = dto;

    // Verify order ownership
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId },
      include: {
        items: {
          where: { id: orderItemId },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.items.length === 0) {
      throw new NotFoundException('Order item not found');
    }

    const orderItem = order.items[0];
    const remainingQuantity = orderItem.quantity - orderItem.deliveredQuantity;

    if (remainingQuantity <= 0) {
      throw new BadRequestException('All items have been delivered');
    }

    if (accountData.length > remainingQuantity) {
      throw new BadRequestException(`Can only deliver ${remainingQuantity} more items`);
    }

    // Create deliveries
    const deliveries = [];
    for (const data of accountData) {
      const delivery = await this.prisma.orderDelivery.create({
        data: {
          orderId,
          orderItemId,
          inventoryId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          accountData: data,
          deliveredAt: new Date(),
        },
      });
      deliveries.push(delivery);
    }

    // Update delivered quantity
    await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        deliveredQuantity: { increment: accountData.length },
      },
    });

    // Check if order is fully delivered
    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    const allDelivered = updatedOrder?.items.every(
      (item) => item.deliveredQuantity >= item.quantity,
    );

    if (allDelivered) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          deliveredAt: new Date(),
        },
      });
    }

    return {
      delivered: accountData.length,
      remaining: remainingQuantity - accountData.length,
      orderStatus: allDelivered ? 'COMPLETED' : order.status,
    };
  }

  // ==================== UTILITY ====================

  async getSellerInfo(sellerId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerProfile: true,
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return {
      id: seller.id,
      email: seller.email,
      name: seller.name,
      balance: seller.balance,
      shop: seller.sellerProfile
        ? {
            name: seller.sellerProfile.shopName,
            description: seller.sellerProfile.shopDescription,
            logo: seller.sellerProfile.shopLogo,
            rating: seller.sellerProfile.rating,
            totalSales: seller.sellerProfile.totalSales,
            isVerified: seller.sellerProfile.isVerified,
          }
        : null,
    };
  }

  async getStats(sellerId: string) {
    const [
      productCount,
      orderStats,
      inventoryStats,
      recentOrders,
    ] = await Promise.all([
      // Product count
      this.prisma.product.count({
        where: { sellerId, status: { in: ['ACTIVE', 'OUT_OF_STOCK'] } },
      }),
      // Order stats
      this.prisma.order.groupBy({
        by: ['status'],
        where: { sellerId },
        _count: { status: true },
        _sum: { total: true },
      }),
      // Inventory stats
      this.prisma.productInventory.groupBy({
        by: ['status'],
        where: { product: { sellerId } },
        _count: { status: true },
      }),
      // Recent orders (last 7 days)
      this.prisma.order.count({
        where: {
          sellerId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Process order stats
    const orders = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    };

    orderStats.forEach((s) => {
      orders.total += s._count.status;
      orders.revenue += s._sum.total || 0;
      const key = s.status.toLowerCase() as keyof typeof orders;
      if (typeof orders[key] === 'number') {
        (orders[key] as number) = s._count.status;
      }
    });

    // Process inventory stats
    const inventory = {
      total: 0,
      available: 0,
      sold: 0,
    };

    inventoryStats.forEach((s) => {
      inventory.total += s._count.status;
      if (s.status === 'AVAILABLE') inventory.available = s._count.status;
      if (s.status === 'SOLD') inventory.sold = s._count.status;
    });

    return {
      products: productCount,
      orders,
      inventory,
      recentOrders,
    };
  }

  // ==================== HELPERS ====================

  private transformProduct(product: any) {
    let images: string[] = [];
    let tags: string[] = [];

    try {
      images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images || [];
    } catch {}

    try {
      tags = product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : [];
    } catch {}

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      originalPrice: product.salePrice || undefined,
      stock: product.stock,
      status: product.status,
      images,
      tags,
      categoryId: product.categoryId,
      categoryName: product.category?.name,
      views: product.views,
      sales: product.sales,
      rating: product.rating,
      autoDelivery: product.autoDelivery,
      productType: product.productType,
      hasVariants: product.hasVariants,
      variants: product.variants?.map((v: any) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        originalPrice: v.salePrice || undefined,
        stock: v.stock,
        isActive: v.isActive,
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private transformOrder(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal,
      commission: order.commission,
      total: order.total,
      buyerName: order.buyer?.name || order.buyer?.email || 'Unknown',
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.product?.title,
        variantId: item.variantId,
        variantName: item.variantName || item.variant?.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        deliveredQuantity: item.deliveredQuantity,
        productType: item.productType,
        buyerProvidedData: item.buyerProvidedData ? JSON.parse(item.buyerProvidedData) : undefined,
      })),
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
    };
  }

  private transformOrderDetail(order: any) {
    const base = this.transformOrder(order);
    return {
      ...base,
      deliveries: order.deliveries?.map((d: any) => ({
        id: d.id,
        orderItemId: d.orderItemId,
        accountData: d.accountData,
        deliveredAt: d.deliveredAt,
      })) || [],
    };
  }
}
