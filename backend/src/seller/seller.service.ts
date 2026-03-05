import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createUniqueSlug } from '../common/utils/slug.util';
import { randomBytes, createHash } from 'crypto';
import {
  CreateStoreDto,
  UpdateStoreDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  CreateWithdrawalDto,
  UpdateComplaintDto,
  SendComplaintMessageDto,
  UpdateOrderStatusDto,
  SetWithdrawalPinDto,
  ChangeWithdrawalPinDto,
} from './dto/seller.dto';

@Injectable()
export class SellerService {
  private readonly logger = new Logger(SellerService.name);

  constructor(private prisma: PrismaService) { }

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

  // ==================== STORE MANAGEMENT ====================

  async createStore(userId: string, dto: CreateStoreDto) {
    // Check if user already has a store
    const existingStore = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (existingStore) {
      throw new BadRequestException('Bạn đã có cửa hàng');
    }

    // Create seller profile and update user role
    const [sellerProfile] = await this.prisma.$transaction([
      this.prisma.sellerProfile.create({
        data: {
          userId,
          shopName: dto.shopName,
          shopDescription: dto.shopDescription,
          shopLogo: dto.shopLogo,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          role: 'SELLER',
          isSeller: true,
        },
      }),
    ]);

    return sellerProfile;
  }

  async getStore(userId: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            balance: true,
            createdAt: true,
            _count: {
              select: {
                sales: {
                  where: { status: 'COMPLETED' },
                },
              },
            },
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    // Get review count and average rating from reviews
    const reviewStats = await this.prisma.review.aggregate({
      where: {
        sellerId: userId,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Return store with computed real data
    return {
      ...store,
      totalSales: store.user._count.sales || store.totalSales || 0,
      rating: reviewStats._avg.rating || store.rating || 0,
      reviewCount: reviewStats._count.rating || 0,
      hasWithdrawalPin: !!store.withdrawalPin,
      contactPhone: store.contactPhone,
      contactTelegram: store.contactTelegram,
      storeStatus: store.storeStatus,
      statusMessage: store.statusMessage,
    };
  }

  // ==================== PROFILE COMPLETION CHECK ====================

  async getProfileCompletion(userId: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true, telegramLinkedAt: true },
    });

    const requirements = [
      {
        id: 'shopLogo',
        label: 'Ảnh đại diện cửa hàng (Logo)',
        completed: !!store.shopLogo,
        link: '/seller/settings',
      },
      {
        id: 'shopDescription',
        label: 'Mô tả cửa hàng',
        completed: !!store.shopDescription && store.shopDescription.length >= 10,
        link: '/seller/settings',
      },
      {
        id: 'contactPhone',
        label: 'Số điện thoại liên lạc',
        completed: !!store.contactPhone,
        link: '/seller/settings',
      },
      {
        id: 'contactTelegram',
        label: 'Telegram liên lạc',
        completed: !!store.contactTelegram,
        link: '/seller/settings',
      },
      {
        id: 'telegramNotification',
        label: 'Liên kết Telegram thông báo đơn hàng',
        completed: !!user?.telegramChatId && !!user?.telegramLinkedAt,
        link: '/seller/settings',
      },
    ];

    const completedCount = requirements.filter(r => r.completed).length;
    const isComplete = completedCount === requirements.length;

    return {
      isComplete,
      completedCount,
      totalCount: requirements.length,
      requirements,
    };
  }

  private async checkSellerProfileCompletion(userId: string) {
    const completion = await this.getProfileCompletion(userId);

    if (!completion.isComplete) {
      const missing = completion.requirements
        .filter(r => !r.completed)
        .map(r => r.label);

      throw new BadRequestException(
        `Vui lòng hoàn thiện thông tin cửa hàng trước khi upload kho hàng. Còn thiếu: ${missing.join(', ')}. Vào Cài đặt cửa hàng để cập nhật.`
      );
    }
  }

  async updateStore(userId: string, dto: UpdateStoreDto) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async updateShopLogo(userId: string, logoUrl: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    const updatedStore = await this.prisma.sellerProfile.update({
      where: { userId },
      data: { shopLogo: logoUrl },
    });

    return {
      success: true,
      shopLogo: logoUrl,
      store: updatedStore,
    };
  }

  // ==================== PRODUCT/INVENTORY MANAGEMENT ====================

  async createProduct(userId: string, dto: CreateProductDto) {
    // Verify seller has a store
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!store) {
      throw new ForbiddenException('Bạn cần tạo cửa hàng trước');
    }

    const { variants, hasVariants, ...productData } = dto;
    const { originalPrice, ...productDataForPrisma } = productData as any;

    // Generate SEO-friendly slug from title
    const slug = await this.generateProductSlug(dto.title);
    this.logger.log(`📝 Generated slug for new product: ${slug}`);

    let productPayload = { ...productDataForPrisma, slug, salePrice: originalPrice ?? null, sellerId: userId, status: 'ACTIVE' as const };

    // If product has variants, create product with variants
    if (hasVariants && variants && variants.length > 0) {
      const variantOriginalPrices = variants.map((v) => (v as any).originalPrice).filter((x): x is number => x != null && x > 0);
      const maxVariantOriginalPrice = variantOriginalPrices.length > 0 ? Math.max(...variantOriginalPrices) : null;
      if (maxVariantOriginalPrice != null && productPayload.salePrice == null) {
        productPayload = { ...productPayload, salePrice: maxVariantOriginalPrice };
      }
      return this.prisma.product.create({
        data: {
          ...productPayload,
          hasVariants: true,
          variants: {
            create: variants.map((v, index) => ({
              name: v.name,
              price: v.price,
              salePrice: (v as any).originalPrice ?? null,
              stock: v.stock,
              sku: (v as any).sku,
              attributes: (v as any).attributes,
              position: index,
            })),
          },
        },
        include: {
          category: true,
          variants: {
            orderBy: { position: 'asc' },
          },
        },
      });
    }

    // No variants - create simple product
    return this.prisma.product.create({
      data: productPayload,
      include: {
        category: true,
        variants: true,
      },
    });
  }

  async getProducts(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { sellerId: userId };

    // Mặc định hiển thị tất cả sản phẩm của seller (bao gồm cả ngừng bán)
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['ACTIVE', 'OUT_OF_STOCK', 'INACTIVE'] };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Map salePrice -> originalPrice cho form edit (API/frontend dùng originalPrice)
    const variants = (product.variants || []).map((v: { salePrice?: number | null;[k: string]: any }) => ({
      ...v,
      originalPrice: v.salePrice ?? undefined,
    }));
    return {
      ...product,
      originalPrice: product.salePrice ?? undefined,
      variants,
    };
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const { variants: dtoVariants, hasVariants: dtoHasVariants, ...productData } = dto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Build update data: API dùng originalPrice, Prisma dùng salePrice
        const { originalPrice, ...rest } = productData as any;
        const updateData: any = { ...rest, ...(originalPrice !== undefined && { salePrice: originalPrice }) };
        if (dtoHasVariants !== undefined) {
          updateData.hasVariants = dtoHasVariants;
        }

        // Regenerate slug if title changed
        if (updateData.title && updateData.title !== product.title) {
          updateData.slug = await this.generateProductSlug(updateData.title, productId);
          this.logger.log(`📝 Regenerated slug for product ${productId}: ${updateData.slug}`);
        }

        const isDigital = updateData.isDigital !== undefined ? updateData.isDigital : product.isDigital;
        const autoDelivery = updateData.autoDelivery !== undefined ? updateData.autoDelivery : product.autoDelivery;

        // For digital products with auto delivery, stock MUST be calculated from inventory
        // Prevent manual stock update
        if (isDigital && autoDelivery) {
          delete updateData.stock;
        }

        // Update product fields (no variants - relation handled below)
        await tx.product.update({
          where: { id: productId },
          data: updateData,
        });

        // If digital & auto delivery, update stock from inventory count just to be safe
        if (isDigital && autoDelivery) {
          const availableCount = await tx.productInventory.count({
            where: { productId, status: 'AVAILABLE' },
          });
          await tx.product.update({
            where: { id: productId },
            data: { stock: availableCount },
          });
        }

        // Sync variants if provided
        if (dtoHasVariants === true && dtoVariants && dtoVariants.length > 0) {
          // Validate variants data
          for (const v of dtoVariants) {
            if (!v.name || v.name.trim().length === 0) {
              throw new BadRequestException('Tên phân loại không được để trống');
            }
            if (v.price === undefined || v.price < 0) {
              throw new BadRequestException('Giá phân loại không hợp lệ');
            }
            if (v.stock === undefined || v.stock < 0) {
              throw new BadRequestException('Số lượng phân loại không hợp lệ');
            }
          }

          const existingIds = product.variants.map((v) => v.id);
          const dtoIds = dtoVariants.filter((v) => v.id).map((v) => v.id!);

          // Update existing variants, create new ones
          for (let i = 0; i < dtoVariants.length; i++) {
            const v = dtoVariants[i];
            let variantStock = v.stock;

            // For digital & auto-delivery, calculate stock from inventory
            if (isDigital && autoDelivery) {
              if (v.id) {
                variantStock = await tx.productInventory.count({
                  where: { productId, variantId: v.id, status: 'AVAILABLE' },
                });
              } else {
                // New variant for auto-delivery has 0 stock initially (must upload inventory)
                variantStock = 0;
              }
            }

            const payload = {
              name: v.name,
              price: v.price,
              salePrice: (v as any).originalPrice ?? null,
              stock: variantStock,
              position: i,
            };

            if (v.id && existingIds.includes(v.id)) {
              await tx.productVariant.update({
                where: { id: v.id },
                data: payload,
              });
            } else {
              await tx.productVariant.create({
                data: {
                  productId,
                  ...payload,
                },
              });
            }
          }

          // Delete variants removed from list
          const toDelete = existingIds.filter((id) => !dtoIds.includes(id));
          if (toDelete.length > 0) {
            await tx.productVariant.deleteMany({
              where: { id: { in: toDelete }, productId },
            });
          }
          // Cập nhật product.salePrice = max(variant.salePrice) để card hiển thị giá gốc/giảm giá
          const variantsAfter = await tx.productVariant.findMany({
            where: { productId },
            select: { price: true, salePrice: true },
          });
          const minPrice = Math.min(...variantsAfter.map((v) => v.price));
          const variantSalePrices = variantsAfter.map((v) => v.salePrice).filter((x): x is number => x != null && x > 0);
          const maxSalePrice = variantSalePrices.length > 0 ? Math.max(...variantSalePrices) : null;
          await tx.product.update({
            where: { id: productId },
            data: { price: minPrice, salePrice: maxSalePrice },
          });
        } else if (dtoHasVariants === false || (dtoVariants !== undefined && dtoVariants.length === 0)) {
          // Remove all variants if hasVariants is explicitly set to false
          await tx.productVariant.deleteMany({ where: { productId } });
          await tx.product.update({
            where: { id: productId },
            data: { hasVariants: false },
          });
        }

        return tx.product.findUniqueOrThrow({
          where: { id: productId },
          include: { category: true, variants: { orderBy: { position: 'asc' } } },
        });
      });
    } catch (error) {
      // Log error for debugging
      console.error('Error updating product:', error);

      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      // Wrap other errors in BadRequestException
      throw new BadRequestException(
        error?.message || 'Không thể cập nhật sản phẩm. Vui lòng kiểm tra dữ liệu và thử lại.'
      );
    }
  }

  async updateStock(userId: string, productId: string, dto: UpdateStockDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const status = dto.stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE';

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        stock: dto.stock,
        status: product.status === 'INACTIVE' ? 'INACTIVE' : status,
      },
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
      include: {
        orderItems: { take: 1 },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Không cho xóa hẳn nếu sản phẩm đã có trong đơn hàng
    if (product.orderItems && product.orderItems.length > 0) {
      throw new BadRequestException(
        'Không thể xóa sản phẩm đã có đơn hàng. Vui lòng chọn "Ngừng bán" thay vì xóa.',
      );
    }

    // Xóa hẳn khỏi DB (cascade: variants, cart items, inventory)
    return this.prisma.product.delete({
      where: { id: productId },
    });
  }

  // ==================== ORDER MANAGEMENT ====================

  async getOrders(userId: string, page = 1, limit = 10, status?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {
      sellerId: userId,
      // Ẩn đơn hàng chỉ chứa sản phẩm SERVICE (quản lý qua trang Đơn dịch vụ)
      items: {
        some: {
          product: {
            productType: { not: 'SERVICE' },
          },
        },
      },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { buyer: { name: { contains: search, mode: 'insensitive' } } },
        { buyer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: true,
                  autoDelivery: true,
                  isDigital: true,
                  productType: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                },
              },
              deliveries: true,
            },
          },
          escrow: true,
          deliveries: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Map orders with delivery status info
    const ordersWithDeliveryInfo = orders.map(order => {
      const items = order.items.map(item => {
        const isAutoDelivery = item.product.autoDelivery;
        const isServiceProduct = item.product.productType === 'SERVICE' || item.productType === 'SERVICE';
        const deliveredQuantity = item.deliveries?.length || 0;
        // SERVICE products use service-orders progress system, not manual delivery
        // So they should never be flagged as needing manual delivery
        const needsManualDelivery = isServiceProduct ? false : (deliveredQuantity < item.quantity);

        return {
          ...item,
          isAutoDelivery: isServiceProduct ? true : isAutoDelivery,
          deliveredQuantity,
          needsManualDelivery,
          pendingDeliveryCount: isServiceProduct ? 0 : (item.quantity - deliveredQuantity),
        };
      });

      // Check if order needs manual delivery
      const needsManualDelivery = items.some(item => item.needsManualDelivery);
      const allDelivered = items.every(item => item.deliveredQuantity >= item.quantity);

      return {
        ...order,
        items,
        needsManualDelivery,
        allDelivered,
      };
    });

    return {
      orders: ordersWithDeliveryInfo,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: true,
                autoDelivery: true,
                isDigital: true,
                productType: true,
              },
            },
            deliveries: true,
          },
        },
        escrow: true,
        deliveries: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Map items with delivery info
    const items = order.items.map(item => {
      const isAutoDelivery = item.product.autoDelivery;
      const isServiceProduct = item.product.productType === 'SERVICE' || item.productType === 'SERVICE';
      const deliveredQuantity = item.deliveries?.length || 0;
      // SERVICE products use service-orders progress system, not manual delivery
      const needsManualDelivery = isServiceProduct ? false : (deliveredQuantity < item.quantity);

      return {
        ...item,
        isAutoDelivery: isServiceProduct ? true : isAutoDelivery,
        deliveredQuantity,
        needsManualDelivery,
        pendingDeliveryCount: isServiceProduct ? 0 : (item.quantity - deliveredQuantity),
      };
    });

    const needsManualDelivery = items.some(item => item.needsManualDelivery);
    const allDelivered = items.every(item => item.deliveredQuantity >= item.quantity);

    return {
      ...order,
      items,
      needsManualDelivery,
      allDelivered,
    };
  }

  async updateOrderStatus(userId: string, orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
      include: {
        buyer: true,
        escrow: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'COMPLETED', 'CANCELLED'],
      PROCESSING: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      REFUNDED: [],
    };

    if (!validTransitions[order.status]?.includes(dto.status)) {
      throw new BadRequestException(`Không thể chuyển từ ${order.status} sang ${dto.status}`);
    }

    // Require cancel reason when cancelling
    if (dto.status === 'CANCELLED' && !dto.cancelReason) {
      throw new BadRequestException('Vui lòng nhập lý do hủy đơn hàng');
    }

    // Handle cancellation with refund
    if (dto.status === 'CANCELLED') {
      return this.cancelOrderWithRefund(order, dto.cancelReason!, userId);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        notes: dto.notes || order.notes,
      },
      include: {
        items: true,
        escrow: true,
      },
    });
  }

  /**
   * Cancel order with refund and notification
   */
  private async cancelOrderWithRefund(order: any, cancelReason: string, sellerId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          notes: `Đã hủy bởi seller. Lý do: ${cancelReason}`,
        },
      });

      // 2. Refund buyer if escrow exists
      if (order.escrow && order.escrow.status === 'HOLDING') {
        // Update escrow status
        await tx.escrow.update({
          where: { id: order.escrow.id },
          data: { status: 'REFUNDED' },
        });

        // Refund to buyer's balance
        await tx.user.update({
          where: { id: order.buyerId },
          data: { balance: { increment: order.total } },
        });

        // Create refund transaction
        await tx.transaction.create({
          data: {
            userId: order.buyerId,
            type: 'REFUND',
            amount: order.total,
            status: 'COMPLETED',
            description: `Hoàn tiền đơn hàng #${order.orderNumber} - Seller hủy: ${cancelReason}`,
            orderId: order.id,
          },
        });
      }

      // 3. Restore inventory items that were sold for this order
      // Áp dụng cho tất cả sản phẩm (cả auto-delivery và manual-delivery có hàng trong kho)
      for (const item of order.items) {
        // Always try to restore inventory regardless of autoDelivery flag
        await tx.productInventory.updateMany({
          where: {
            orderId: order.id,
            orderItemId: item.id,
            status: 'SOLD',
          },
          data: {
            status: 'AVAILABLE',
            soldAt: null,
            soldToId: null,
            orderId: null,
            orderItemId: null,
          },
        });

        // Update product stock
        const availableCount = await tx.productInventory.count({
          where: { productId: item.productId, status: 'AVAILABLE' },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: availableCount },
        });

        // Decrement product sales count
        await tx.product.update({
          where: { id: item.productId },
          data: {
            sales: { decrement: item.quantity },
          },
        });
      }

      // Decrement seller's totalSales
      const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      await tx.sellerProfile.updateMany({
        where: { userId: sellerId },
        data: {
          totalSales: { decrement: totalQuantity },
        },
      });

      // 4. Delete order deliveries
      await tx.orderDelivery.deleteMany({
        where: { orderId: order.id },
      });

      // 5. Create notification for buyer
      await tx.notification.create({
        data: {
          userId: order.buyerId,
          type: 'ORDER',
          title: 'Đơn hàng đã bị hủy',
          message: `Đơn hàng #${order.orderNumber} đã bị seller hủy. Lý do: ${cancelReason}. Tiền đã được hoàn vào ví của bạn.`,
          link: `/orders/${order.id}`,
          icon: 'XCircle',
        },
      });

      return updatedOrder;
    });

    // 6. Send Telegram notification to buyer (async)
    this.sendCancelNotificationToBuyer(order, cancelReason).catch(err => {
      console.error('Failed to send cancel notification:', err.message);
    });

    return {
      ...result,
      message: 'Đã hủy đơn hàng và hoàn tiền cho khách hàng',
    };
  }

  /**
   * Send Telegram notification when order is cancelled
   */
  private async sendCancelNotificationToBuyer(order: any, cancelReason: string) {
    try {
      const buyer = await this.prisma.user.findUnique({
        where: { id: order.buyerId },
        select: { telegramChatId: true },
      });

      if (buyer?.telegramChatId) {
        const { TelegramService } = await import('../telegram/telegram.service');
        // Create inline telegram service call
        const message = `❌ *Đơn hàng đã bị hủy*

📦 Đơn hàng: \`#${order.orderNumber}\`
💰 Số tiền: *${order.total.toLocaleString('vi-VN')}đ*
📝 Lý do: ${cancelReason}

✅ Tiền đã được hoàn vào ví của bạn.

🔗 [Xem chi tiết đơn hàng](https://bachhoammo.store/orders/${order.id})`;

        // Use fetch to call Telegram API directly
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: buyer.telegramChatId,
              text: message,
              parse_mode: 'Markdown',
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error sending Telegram cancel notification:', error);
    }
  }

  /**
   * Manual delivery - Seller giao tài khoản thủ công
   */
  async manualDeliver(
    userId: string,
    orderId: string,
    deliveries: Array<{ orderItemId: string; accountData: string }>,
  ) {
    // Verify order belongs to seller
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
      include: {
        items: {
          include: {
            product: true,
            deliveries: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException('Không thể giao hàng cho đơn đã hủy hoặc hoàn tiền');
    }

    const results = [];

    for (const delivery of deliveries) {
      const result = await this.manualDeliverItem(
        userId,
        orderId,
        delivery.orderItemId,
        delivery.accountData,
      );
      results.push(result);
    }

    return {
      message: `Đã giao ${results.length} tài khoản thành công`,
      deliveries: results,
    };
  }

  /**
   * Manual delivery for single item
   */
  async manualDeliverItem(
    userId: string,
    orderId: string,
    orderItemId: string,
    accountData: string,
  ) {
    // Verify order and item
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
      include: {
        items: {
          where: { id: orderItemId },
          include: {
            product: true,
            deliveries: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const orderItem = order.items[0];
    if (!orderItem) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong đơn hàng');
    }

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException('Không thể giao hàng cho đơn đã hủy hoặc hoàn tiền');
    }

    // Check if item is already fully delivered
    const deliveredCount = orderItem.deliveries?.length || 0;
    if (deliveredCount >= orderItem.quantity) {
      throw new BadRequestException('Sản phẩm này đã được giao đủ số lượng');
    }

    // Create hash for the account data
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(accountData).digest('hex');

    // Create inventory record (for tracking) and delivery in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create a "virtual" inventory record for manual delivery
      const inventory = await tx.productInventory.create({
        data: {
          productId: orderItem.productId,
          variantId: orderItem.variantId,
          accountData: accountData,
          hash: `manual-${orderId}-${orderItemId}-${Date.now()}-${hash}`,
          status: 'SOLD',
          soldAt: new Date(),
          soldToId: order.buyerId,
          orderId: orderId,
          orderItemId: orderItemId,
        },
      });

      // Create delivery record
      const delivery = await tx.orderDelivery.create({
        data: {
          orderId: orderId,
          orderItemId: orderItemId,
          inventoryId: inventory.id,
          accountData: accountData,
        },
      });

      // Update delivered quantity
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          deliveredQuantity: { increment: 1 },
        },
      });

      // Check if all items are delivered
      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              deliveries: true,
            },
          },
        },
      });

      const allDelivered = updatedOrder?.items.every(
        item => (item.deliveries?.length || 0) >= item.quantity
      );

      // Update order status if all delivered
      if (allDelivered && order.status === 'PENDING') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'COMPLETED',
            deliveredAt: new Date(),
          },
        });
      }

      return delivery;
    });

    return {
      message: 'Giao tài khoản thành công',
      delivery: result,
    };
  }

  /**
   * Warranty replacement - Seller thay thế tài khoản lỗi cho buyer
   * Cho phép seller cập nhật lại accountData đã giao khi tài khoản bị lỗi
   */
  async warrantyReplacement(
    userId: string,
    orderId: string,
    deliveryId: string,
    newAccountData: string,
    reason?: string,
  ) {
    // Verify order belongs to seller
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: userId,
      },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Find the delivery record
    const delivery = await this.prisma.orderDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        inventory: true,
        orderItem: { include: { product: true } },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Không tìm thấy thông tin giao hàng');
    }

    if (delivery.orderId !== orderId) {
      throw new BadRequestException('Delivery không thuộc đơn hàng này');
    }

    // Create hash for new data
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(newAccountData).digest('hex');
    const oldAccountData = delivery.accountData;

    // Update in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create new inventory record for the replacement
      const newInventory = await tx.productInventory.create({
        data: {
          productId: delivery.orderItem.productId,
          variantId: delivery.orderItem.variantId,
          accountData: newAccountData,
          hash: `warranty-${orderId}-${deliveryId}-${Date.now()}-${hash}`,
          status: 'SOLD',
          soldAt: new Date(),
          soldToId: order.buyerId,
          orderId: orderId,
          orderItemId: delivery.orderItemId,
        },
      });

      // 2. Mark old inventory as replaced (DISABLED)
      if (delivery.inventoryId) {
        await tx.productInventory.update({
          where: { id: delivery.inventoryId },
          data: { status: 'DISABLED' },
        }).catch(() => {
          // Old inventory may not exist for manual deliveries
        });
      }

      // 3. Update the delivery record with new account data and new inventory
      const updatedDelivery = await tx.orderDelivery.update({
        where: { id: deliveryId },
        data: {
          accountData: newAccountData,
          inventoryId: newInventory.id,
          deliveredAt: new Date(), // Reset delivery time
          viewedAt: null, // Reset viewed status
          viewCount: 0,
        },
      });

      // 4. Create notification for buyer
      const productTitle = delivery.orderItem?.product?.title || 'sản phẩm';
      await tx.notification.create({
        data: {
          userId: order.buyerId,
          type: 'ORDER',
          title: '🔄 Tài khoản đã được thay thế (Bảo hành)',
          message: reason
            ? `Shop đã thay thế tài khoản cho "${productTitle}" trong đơn hàng #${order.orderNumber}. Lý do: ${reason}. Vui lòng kiểm tra lại.`
            : `Shop đã thay thế tài khoản cho "${productTitle}" trong đơn hàng #${order.orderNumber}. Vui lòng kiểm tra lại.`,
          link: `/orders/${order.id}`,
          icon: 'RefreshCw',
        },
      });

      return updatedDelivery;
    });

    return {
      success: true,
      message: 'Bảo hành thành công - Đã thay thế tài khoản mới cho buyer',
      delivery: result,
    };
  }

  // ==================== COMPLAINT MANAGEMENT ====================

  async getComplaints(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { sellerId: userId };

    if (status) {
      where.status = status;
    }

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          order: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getComplaint(userId: string, complaintId: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id: complaintId,
        sellerId: userId,
      },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    return complaint;
  }

  async updateComplaint(userId: string, complaintId: string, dto: UpdateComplaintDto) {
    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id: complaintId,
        sellerId: userId,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    const updateData: any = { ...dto };
    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
      updateData.resolvedAt = new Date();
    }

    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
    });
  }

  async sendComplaintMessage(userId: string, complaintId: string, dto: SendComplaintMessageDto) {
    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id: complaintId,
        sellerId: userId,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Không tìm thấy khiếu nại');
    }

    if (complaint.status === 'CLOSED') {
      throw new BadRequestException('Khiếu nại đã đóng');
    }

    return this.prisma.complaintMessage.create({
      data: {
        complaintId,
        senderId: userId,
        message: dto.message,
        attachments: dto.attachments,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // ==================== BANK INFORMATION ====================

  /**
   * Get seller's bank information
   */
  async getBankInfo(userId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: {
        bankName: true,
        bankAccount: true,
        bankHolder: true,
        bankBranch: true,
        bankInfoAddedAt: true,
      },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Không tìm thấy thông tin cửa hàng');
    }

    return {
      hasBankInfo: !!sellerProfile.bankInfoAddedAt,
      bankName: sellerProfile.bankName,
      bankAccount: sellerProfile.bankAccount,
      bankHolder: sellerProfile.bankHolder,
      bankBranch: sellerProfile.bankBranch,
      bankInfoAddedAt: sellerProfile.bankInfoAddedAt,
    };
  }

  /**
   * Add bank information (can only be done once)
   */
  async addBankInfo(
    userId: string,
    data: { bankName: string; bankAccount: string; bankHolder: string; bankBranch?: string },
  ) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Không tìm thấy thông tin cửa hàng');
    }

    // Check if bank info already exists
    if (sellerProfile.bankInfoAddedAt) {
      throw new BadRequestException(
        'Bạn đã thêm thông tin ngân hàng trước đó. Nếu cần thay đổi, vui lòng liên hệ hỗ trợ.',
      );
    }

    // Validate required fields
    if (!data.bankName || !data.bankAccount || !data.bankHolder) {
      throw new BadRequestException('Vui lòng điền đầy đủ thông tin ngân hàng');
    }

    // Update seller profile with bank info
    const updated = await this.prisma.sellerProfile.update({
      where: { userId },
      data: {
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        bankHolder: data.bankHolder.toUpperCase(),
        bankBranch: data.bankBranch || null,
        bankInfoAddedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Đã lưu thông tin ngân hàng thành công',
      bankName: updated.bankName,
      bankAccount: updated.bankAccount,
      bankHolder: updated.bankHolder,
      bankBranch: updated.bankBranch,
      bankInfoAddedAt: updated.bankInfoAddedAt,
    };
  }

  // ==================== WITHDRAWAL MANAGEMENT ====================

  /**
   * Get the start of the current week (Monday 00:00:00)
   */
  private getStartOfWeek(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Calculate withdrawal fee based on weekly withdrawal count
   * - Free for first 2 withdrawals per week
   * - 3% for 3rd, 6% for 4th, 9% for 5th, etc.
   */
  async calculateWithdrawalFee(userId: string, amount: number): Promise<{ feeRate: number; fee: number; freeWithdrawalsLeft: number }> {
    const startOfWeek = this.getStartOfWeek();

    // Count withdrawals this week (including pending ones)
    const withdrawalsThisWeek = await this.prisma.sellerWithdrawal.count({
      where: {
        sellerId: userId,
        createdAt: { gte: startOfWeek },
        status: { in: ['PENDING', 'COMPLETED'] }, // Count both pending and completed
      },
    });

    const FREE_WITHDRAWALS_PER_WEEK = 2;
    const freeWithdrawalsLeft = Math.max(0, FREE_WITHDRAWALS_PER_WEEK - withdrawalsThisWeek);

    let feeRate = 0;

    if (withdrawalsThisWeek >= FREE_WITHDRAWALS_PER_WEEK) {
      // Calculate fee: 3% for 3rd, 6% for 4th, 9% for 5th, etc.
      const extraWithdrawals = withdrawalsThisWeek - FREE_WITHDRAWALS_PER_WEEK + 1;
      feeRate = extraWithdrawals * 0.03; // 3% increase per withdrawal
    }

    const fee = Math.round(amount * feeRate);

    return { feeRate, fee, freeWithdrawalsLeft };
  }

  async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    // Get user balance and seller profile with bank info
    const [user, sellerProfile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
      }),
      this.prisma.sellerProfile.findUnique({
        where: { userId },
        select: {
          bankName: true,
          bankAccount: true,
          bankHolder: true,
          bankBranch: true,
          bankInfoAddedAt: true,
          withdrawalPin: true,
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (!sellerProfile) {
      throw new NotFoundException('Không tìm thấy thông tin cửa hàng');
    }

    // Check if bank info exists
    if (!sellerProfile.bankInfoAddedAt || !sellerProfile.bankName || !sellerProfile.bankAccount || !sellerProfile.bankHolder) {
      throw new BadRequestException(
        'Bạn cần thêm thông tin ngân hàng trước khi rút tiền. Vui lòng vào phần Cài đặt ngân hàng.',
      );
    }

    // Verify withdrawal PIN
    if (!sellerProfile.withdrawalPin) {
      throw new BadRequestException(
        'Bạn cần tạo mã PIN rút tiền trước. Vui lòng vào phần Cài đặt cửa hàng để tạo mã PIN.',
      );
    }

    if (!dto.pin || dto.pin.length !== 6) {
      throw new BadRequestException('Mã PIN phải gồm 6 chữ số');
    }

    const pinHash = createHash('sha256').update(dto.pin).digest('hex');
    if (pinHash !== sellerProfile.withdrawalPin) {
      throw new BadRequestException('Mã PIN rút tiền không chính xác');
    }

    if (user.balance < dto.amount) {
      throw new BadRequestException('Số dư không đủ');
    }

    // Calculate fee based on weekly withdrawal count
    const { feeRate, fee, freeWithdrawalsLeft } = await this.calculateWithdrawalFee(userId, dto.amount);
    const netAmount = dto.amount - fee;

    // Use saved bank info from seller profile
    const bankName = sellerProfile.bankName;
    const bankAccount = sellerProfile.bankAccount;
    const bankHolder = sellerProfile.bankHolder;

    // Build description
    let description = `Rút tiền về ${bankName} - ${bankAccount}`;
    if (feeRate > 0) {
      description += ` (Phí ${(feeRate * 100).toFixed(0)}%)`;
    }

    // Create withdrawal and deduct balance
    const [withdrawal] = await this.prisma.$transaction([
      this.prisma.sellerWithdrawal.create({
        data: {
          sellerId: userId,
          amount: dto.amount,
          fee,
          netAmount,
          bankName,
          bankAccount,
          bankHolder,
          status: 'PENDING',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: dto.amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
          amount: -dto.amount,
          status: 'PENDING',
          description,
        },
      }),
    ]);

    return {
      ...withdrawal,
      feeRate: feeRate * 100, // Return as percentage
      freeWithdrawalsLeftThisWeek: freeWithdrawalsLeft - 1, // After this withdrawal
    };
  }

  async getWithdrawals(userId: string, page = 1, limit = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { sellerId: userId };

    if (status) {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      this.prisma.sellerWithdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sellerWithdrawal.count({ where }),
    ]);

    return {
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelWithdrawal(userId: string, withdrawalId: string) {
    const withdrawal = await this.prisma.sellerWithdrawal.findFirst({
      where: {
        id: withdrawalId,
        sellerId: userId,
        status: 'PENDING',
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Không tìm thấy yêu cầu rút tiền hoặc đã được xử lý');
    }

    // Cancel withdrawal and refund balance
    await this.prisma.$transaction([
      this.prisma.sellerWithdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'REJECTED', rejectedReason: 'Người bán tự hủy' },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: { increment: withdrawal.amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount: withdrawal.amount,
          status: 'COMPLETED',
          description: `Hoàn tiền do hủy yêu cầu rút tiền`,
        },
      }),
    ]);

    return { message: 'Đã hủy yêu cầu rút tiền' };
  }

  // ==================== DASHBOARD/STATISTICS ====================

  async getDashboard(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get store info
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            balance: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    // Get statistics - wrap in try-catch for resilience
    let totalProducts = 0;
    let activeProducts = 0;
    let totalOrders = 0;
    let pendingOrders = 0;
    let completedOrdersThisMonth = 0;
    let completedOrdersLastMonth = 0;
    let revenueThisMonth = { _sum: { subtotal: 0 } };
    let revenueLastMonth = { _sum: { subtotal: 0 } };
    let openComplaints = 0;
    let pendingWithdrawals = { _sum: { amount: 0 } };

    try {
      [
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        completedOrdersThisMonth,
        completedOrdersLastMonth,
        revenueThisMonth,
        revenueLastMonth,
      ] = await Promise.all([
        // Products
        this.prisma.product.count({ where: { sellerId: userId } }),
        this.prisma.product.count({ where: { sellerId: userId, status: 'ACTIVE' } }),

        // Orders
        this.prisma.order.count({ where: { sellerId: userId } }),
        this.prisma.order.count({ where: { sellerId: userId, status: 'PENDING' } }),
        this.prisma.order.count({
          where: {
            sellerId: userId,
            status: 'COMPLETED',
            createdAt: { gte: startOfMonth },
          },
        }),
        this.prisma.order.count({
          where: {
            sellerId: userId,
            status: 'COMPLETED',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
        }),

        // Revenue
        this.prisma.order.aggregate({
          where: {
            sellerId: userId,
            status: 'COMPLETED',
            createdAt: { gte: startOfMonth },
          },
          _sum: { subtotal: true },
        }),
        this.prisma.order.aggregate({
          where: {
            sellerId: userId,
            status: 'COMPLETED',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
          _sum: { subtotal: true },
        }),
      ]);
    } catch (error) {
      console.error('Error fetching basic stats:', error);
    }

    // Fetch complaints count separately (table might not exist)
    try {
      openComplaints = await this.prisma.complaint.count({
        where: { sellerId: userId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      });
    } catch (error) {
      console.error('Error fetching complaints:', error);
      openComplaints = 0;
    }

    // Fetch withdrawals separately (table might not exist)
    try {
      pendingWithdrawals = await this.prisma.sellerWithdrawal.aggregate({
        where: { sellerId: userId, status: 'PENDING' },
        _sum: { amount: true },
      });
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      pendingWithdrawals = { _sum: { amount: 0 } };
    }

    // Calculate growth
    const revenueThisMonthValue = revenueThisMonth._sum.subtotal || 0;
    const revenueLastMonthValue = revenueLastMonth._sum.subtotal || 0;
    const revenueGrowth = revenueLastMonthValue > 0
      ? ((revenueThisMonthValue - revenueLastMonthValue) / revenueLastMonthValue) * 100
      : 0;

    const ordersGrowth = completedOrdersLastMonth > 0
      ? ((completedOrdersThisMonth - completedOrdersLastMonth) / completedOrdersLastMonth) * 100
      : 0;

    // Get recent orders
    const recentOrders = await this.prisma.order.findMany({
      where: { sellerId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: {
          select: { name: true, email: true },
        },
        items: {
          take: 1,
          include: {
            product: {
              select: { title: true },
            },
          },
        },
      },
    });

    // Get top products
    const topProducts = await this.prisma.product.findMany({
      where: { sellerId: userId },
      take: 5,
      orderBy: { sales: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        sales: true,
        stock: true,
        images: true,
      },
    });

    // === Extra stats: today, total, 7-day chart ===
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let todayRevenue = 0;
    let todayOrders = 0;
    let todayNewOrders = 0;
    let totalAllTimeRevenue = 0;
    let revenueChartData: { date: string; revenue: number; orders: number }[] = [];

    try {
      const [todayRevAgg, todayOrdCount, todayNewCount, allTimeRevAgg] = await Promise.all([
        this.prisma.order.aggregate({
          where: { sellerId: userId, status: 'COMPLETED', createdAt: { gte: todayStart } },
          _sum: { subtotal: true },
        }),
        this.prisma.order.count({
          where: { sellerId: userId, status: 'COMPLETED', createdAt: { gte: todayStart } },
        }),
        this.prisma.order.count({
          where: { sellerId: userId, createdAt: { gte: todayStart } },
        }),
        this.prisma.order.aggregate({
          where: { sellerId: userId, status: 'COMPLETED' },
          _sum: { subtotal: true },
        }),
      ]);
      todayRevenue = todayRevAgg._sum.subtotal || 0;
      todayOrders = todayOrdCount;
      todayNewOrders = todayNewCount;
      totalAllTimeRevenue = allTimeRevAgg._sum.subtotal || 0;
    } catch (e) { /* ignore */ }

    // 7-day chart
    try {
      const weekOrders = await this.prisma.order.findMany({
        where: { sellerId: userId, status: 'COMPLETED', createdAt: { gte: sevenDaysAgo } },
        select: { subtotal: true, createdAt: true },
      });
      const dayMap: Record<string, { revenue: number; orders: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0 };
      }
      weekOrders.forEach(o => {
        const ds = o.createdAt.toISOString().split('T')[0];
        if (dayMap[ds]) { dayMap[ds].revenue += o.subtotal; dayMap[ds].orders += 1; }
      });
      revenueChartData = Object.entries(dayMap).map(([date, d]) => ({ date, ...d }));
    } catch (e) { /* ignore */ }

    return {
      store: {
        id: store.id,
        shopName: store.shopName,
        rating: store.rating,
        totalSales: store.totalSales,
        isVerified: store.isVerified,
        balance: store.user.balance,
        walletBalance: store.user.balance,
      },
      stats: {
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completedThisMonth: completedOrdersThisMonth,
          growth: Math.round(ordersGrowth * 100) / 100,
        },
        revenue: {
          today: todayRevenue,
          thisMonth: revenueThisMonthValue,
          lastMonth: revenueLastMonthValue,
          total: totalAllTimeRevenue,
          growth: Math.round(revenueGrowth * 100) / 100,
        },
        today: {
          revenue: todayRevenue,
          completedOrders: todayOrders,
          newOrders: todayNewOrders,
        },
        complaints: {
          open: openComplaints,
        },
        withdrawals: {
          pending: pendingWithdrawals._sum.amount || 0,
        },
      },
      revenueChart: revenueChartData,
      recentOrders,
      topProducts,
    };
  }

  async getRevenueChart(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        sellerId: userId,
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      select: {
        subtotal: true,
        createdAt: true,
      },
    });

    // Group by date
    const revenueByDate: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      revenueByDate[dateStr] = 0;
    }

    orders.forEach((order) => {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += order.subtotal;
      }
    });

    return Object.entries(revenueByDate)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ==================== INVENTORY MANAGEMENT ====================

  /**
   * Generate hash for account data (for duplicate detection)
   */
  private generateAccountHash(accountData: string): string {
    const crypto = require('crypto');
    const normalized = accountData.trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get inventory for a product
   */
  async getProductInventory(
    userId: string,
    productId: string,
    params?: { status?: string; variantId?: string; limit?: number; offset?: number },
  ) {
    // Verify product belongs to seller and get variants
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
      include: { variants: { orderBy: { position: 'asc' } } },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    const { status, variantId, limit = 50, offset = 0 } = params || {};

    const where: any = { productId };
    if (status) where.status = status;
    if (variantId) where.variantId = variantId;

    const [inventory, total, stats] = await Promise.all([
      this.prisma.productInventory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          soldTo: { select: { id: true, name: true, email: true } },
          variant: { select: { id: true, name: true } },
        },
      }),
      this.prisma.productInventory.count({ where }),
      this.prisma.productInventory.groupBy({
        by: ['status'],
        where: { productId, ...(variantId ? { variantId } : {}) },
        _count: true,
      }),
    ]);

    // Parse stats
    const statusCounts = {
      AVAILABLE: 0,
      RESERVED: 0,
      SOLD: 0,
      DISABLED: 0,
    };
    stats.forEach((s) => {
      statusCounts[s.status as keyof typeof statusCounts] = s._count;
    });

    // Get variant-level stats if product has variants
    let variantStats: any[] = [];
    if (product.hasVariants && product.variants.length > 0) {
      variantStats = await Promise.all(
        product.variants.map(async (variant) => {
          const count = await this.prisma.productInventory.count({
            where: { productId, variantId: variant.id, status: 'AVAILABLE' },
          });
          return {
            variantId: variant.id,
            variantName: variant.name,
            availableCount: count,
          };
        })
      );
    }

    return {
      inventory,
      total,
      stats: statusCounts,
      variants: product.variants,
      variantStats,
      hasVariants: product.hasVariants,
      limit,
      offset,
    };
  }

  /**
   * Download all inventory data as text (for seller to review/export)
   */
  async downloadInventory(
    userId: string,
    productId: string,
    params?: { status?: string; variantId?: string },
  ): Promise<string> {
    // Verify product belongs to seller
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    const where: any = { productId };
    if (params?.status) where.status = params.status;
    if (params?.variantId) where.variantId = params.variantId;

    const items = await this.prisma.productInventory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { accountData: true },
    });

    return items.map(item => item.accountData).join('\n');
  }

  /**
   * Upload multiple accounts from text (bulk upload)
   */
  async uploadInventory(
    userId: string,
    productId: string,
    accountData: string,
    variantId?: string,
  ) {
    // Check seller profile completion
    await this.checkSellerProfileCompletion(userId);

    // Verify product belongs to seller
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    // If product has variants, variantId is required
    if (product.hasVariants && product.variants.length > 0 && !variantId) {
      throw new BadRequestException('Sản phẩm có phân loại, vui lòng chọn phân loại để thêm kho hàng');
    }

    // Verify variant belongs to product if provided
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (!variant) {
        throw new BadRequestException('Phân loại không hợp lệ');
      }
    }

    // Parse lines
    const lines = accountData
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new BadRequestException('Không có dữ liệu tài khoản hợp lệ');
    }

    const results = {
      success: 0,
      duplicates: 0,
      blacklisted: 0,
      errors: 0,
      details: [] as { line: number; status: string; message: string }[],
    };

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hash = this.generateAccountHash(line);

      try {
        // Check if already exists in this product (same product + variant combination)
        const existingInProduct = await this.prisma.productInventory.findFirst({
          where: {
            productId,
            hash,
            ...(variantId ? { variantId } : {}),
          },
        });

        if (existingInProduct) {
          results.duplicates++;
          results.details.push({
            line: i + 1,
            status: 'duplicate',
            message: 'Tài khoản đã tồn tại trong sản phẩm này',
          });
          continue;
        }

        // Check if in global blacklist
        const blacklisted = await this.prisma.accountBlacklist.findUnique({
          where: { hash },
        });

        if (blacklisted) {
          results.blacklisted++;
          results.details.push({
            line: i + 1,
            status: 'blacklisted',
            message: `Tài khoản trong blacklist: ${blacklisted.reason}`,
          });
          continue;
        }

        // Check if sold in another product (cross-product duplicate detection)
        const soldElsewhere = await this.prisma.productInventory.findFirst({
          where: { hash, status: 'SOLD' },
        });

        if (soldElsewhere) {
          results.duplicates++;
          results.details.push({
            line: i + 1,
            status: 'duplicate_sold',
            message: 'Tài khoản này đã được bán trước đó',
          });
          continue;
        }

        // Create inventory item with optional variantId
        await this.prisma.productInventory.create({
          data: {
            productId,
            variantId: variantId || null,
            accountData: line,
            hash,
            status: 'AVAILABLE',
          },
        });

        results.success++;
        results.details.push({
          line: i + 1,
          status: 'success',
          message: 'Thêm thành công',
        });
      } catch (error: any) {
        // Handle Prisma unique constraint error
        if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
          results.duplicates++;
          results.details.push({
            line: i + 1,
            status: 'duplicate',
            message: 'Tài khoản đã tồn tại trong kho',
          });
        } else {
          results.errors++;
          results.details.push({
            line: i + 1,
            status: 'error',
            message: 'Lỗi khi thêm tài khoản',
          });
        }
      }
    }

    // Update stock - for product or variant depending on whether variantId is provided
    if (variantId) {
      // Update variant stock
      const variantAvailableCount = await this.prisma.productInventory.count({
        where: { productId, variantId, status: 'AVAILABLE' },
      });

      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: variantAvailableCount },
      });

      // Also update total product stock (sum of all variants)
      const totalAvailableCount = await this.prisma.productInventory.count({
        where: { productId, status: 'AVAILABLE' },
      });

      await this.prisma.product.update({
        where: { id: productId },
        data: { stock: totalAvailableCount },
      });

      return {
        totalLines: lines.length,
        ...results,
        newStock: variantAvailableCount,
        totalProductStock: totalAvailableCount,
      };
    } else {
      // Update product stock
      const availableCount = await this.prisma.productInventory.count({
        where: { productId, status: 'AVAILABLE' },
      });

      await this.prisma.product.update({
        where: { id: productId },
        data: { stock: availableCount },
      });

      return {
        totalLines: lines.length,
        ...results,
        newStock: availableCount,
      };
    }
  }

  /**
   * Upload inventory files (ZIP containing account files)
   * Each file inside the ZIP = 1 inventory item
   * Files are stored individually and referenced via FILE: prefix in accountData
   */
  async uploadInventoryFiles(
    userId: string,
    productId: string,
    zipPath: string,
    originalZipName: string,
    variantId?: string,
  ) {
    const AdmZip = require('adm-zip');
    const crypto = require('crypto');
    const fs = require('fs');
    const path = require('path');

    // Check seller profile completion
    await this.checkSellerProfileCompletion(userId);

    // Verify product belongs to seller
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    // If product has variants, variantId is required
    if (product.hasVariants && product.variants.length > 0 && !variantId) {
      throw new BadRequestException('Sản phẩm có phân loại, vui lòng chọn phân loại để thêm kho hàng');
    }

    // Verify variant belongs to product if provided
    if (variantId) {
      const variant = product.variants.find(v => v.id === variantId);
      if (!variant) {
        throw new BadRequestException('Phân loại không hợp lệ');
      }
    }

    // Create product-specific inventory directory
    const inventoryDir = path.join(process.cwd(), 'uploads', 'inventory', productId);
    if (!fs.existsSync(inventoryDir)) {
      fs.mkdirSync(inventoryDir, { recursive: true });
    }

    // Extract ZIP file
    let zip: any;
    try {
      zip = new AdmZip(zipPath);
    } catch (error: any) {
      // Clean up uploaded ZIP
      try { fs.unlinkSync(zipPath); } catch { }
      throw new BadRequestException('File ZIP không hợp lệ hoặc bị hỏng');
    }

    const entries = zip.getEntries();

    // Filter out directories and system files (like __MACOSX, .DS_Store)
    const fileEntries = entries.filter((entry: any) => {
      if (entry.isDirectory) return false;
      const name = entry.entryName;
      if (name.startsWith('__MACOSX/')) return false;
      if (name.startsWith('.')) return false;
      if (name.includes('/.')) return false;
      if (name === 'Thumbs.db') return false;
      return true;
    });

    if (fileEntries.length === 0) {
      // Clean up uploaded ZIP
      try { fs.unlinkSync(zipPath); } catch { }
      throw new BadRequestException('File ZIP trống hoặc không chứa file hợp lệ');
    }

    const results = {
      success: 0,
      duplicates: 0,
      blacklisted: 0,
      errors: 0,
      totalFiles: fileEntries.length,
      details: [] as { fileName: string; status: string; message: string }[],
    };

    // Process each file in ZIP
    for (const entry of fileEntries) {
      const fileName = path.basename(entry.entryName);

      try {
        // Get file content as buffer
        const fileBuffer = entry.getData();

        // Generate hash from file content
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Check if already exists in this product
        const existingInProduct = await this.prisma.productInventory.findFirst({
          where: {
            productId,
            hash,
            ...(variantId ? { variantId } : {}),
          },
        });

        if (existingInProduct) {
          results.duplicates++;
          results.details.push({
            fileName,
            status: 'duplicate',
            message: 'File đã tồn tại trong sản phẩm này',
          });
          continue;
        }

        // Check if in global blacklist
        const blacklisted = await this.prisma.accountBlacklist.findUnique({
          where: { hash },
        });

        if (blacklisted) {
          results.blacklisted++;
          results.details.push({
            fileName,
            status: 'blacklisted',
            message: `File trong blacklist: ${blacklisted.reason}`,
          });
          continue;
        }

        // Check if sold in another product
        const soldElsewhere = await this.prisma.productInventory.findFirst({
          where: { hash, status: 'SOLD' },
        });

        if (soldElsewhere) {
          results.duplicates++;
          results.details.push({
            fileName,
            status: 'duplicate_sold',
            message: 'File này đã được bán trước đó',
          });
          continue;
        }

        // Save file individually to disk
        const storedFileName = `${hash}${path.extname(fileName) || '.bin'}`;
        const storedFilePath = path.join(inventoryDir, storedFileName);

        // Write file to disk
        fs.writeFileSync(storedFilePath, fileBuffer);

        // Store relative path with FILE: prefix in accountData
        const relativePath = `uploads/inventory/${productId}/${storedFileName}`;

        // Create inventory item
        await this.prisma.productInventory.create({
          data: {
            productId,
            variantId: variantId || null,
            accountData: `FILE:${relativePath}`,
            hash,
            status: 'AVAILABLE',
          },
        });

        results.success++;
        results.details.push({
          fileName,
          status: 'success',
          message: 'Thêm thành công',
        });
      } catch (error: any) {
        if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
          results.duplicates++;
          results.details.push({
            fileName,
            status: 'duplicate',
            message: 'File đã tồn tại trong kho',
          });
        } else {
          results.errors++;
          results.details.push({
            fileName,
            status: 'error',
            message: `Lỗi: ${error.message || 'Không xác định'}`,
          });
        }
      }
    }

    // Clean up the original uploaded ZIP file
    try { fs.unlinkSync(zipPath); } catch { }

    // Update stock
    if (variantId) {
      const variantAvailableCount = await this.prisma.productInventory.count({
        where: { productId, variantId, status: 'AVAILABLE' },
      });
      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: variantAvailableCount },
      });

      const totalAvailableCount = await this.prisma.productInventory.count({
        where: { productId, status: 'AVAILABLE' },
      });
      await this.prisma.product.update({
        where: { id: productId },
        data: { stock: totalAvailableCount },
      });

      return {
        ...results,
        newStock: variantAvailableCount,
        totalProductStock: totalAvailableCount,
      };
    } else {
      const availableCount = await this.prisma.productInventory.count({
        where: { productId, status: 'AVAILABLE' },
      });
      await this.prisma.product.update({
        where: { id: productId },
        data: { stock: availableCount },
      });

      return {
        ...results,
        newStock: availableCount,
      };
    }
  }

  /**
   * Add single account to inventory
   */
  async addSingleInventory(
    userId: string,
    productId: string,
    accountData: string,
    variantId?: string,
  ) {
    const result = await this.uploadInventory(userId, productId, accountData, variantId);

    if (result.success === 0) {
      const detail = result.details[0];
      throw new BadRequestException(detail?.message || 'Không thể thêm tài khoản');
    }

    return { message: 'Thêm tài khoản thành công', newStock: result.newStock };
  }

  /**
   * Update inventory item
   */
  async updateInventoryItem(
    userId: string,
    inventoryId: string,
    data: { accountData?: string; status?: string },
  ) {
    // Get inventory with product to verify ownership
    const inventory = await this.prisma.productInventory.findUnique({
      where: { id: inventoryId },
      include: { product: true },
    });

    if (!inventory) {
      throw new NotFoundException('Không tìm thấy item');
    }

    if (inventory.product.sellerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa item này');
    }

    if (inventory.status === 'SOLD') {
      throw new BadRequestException('Không thể chỉnh sửa tài khoản đã bán');
    }

    const updateData: any = {};

    if (data.accountData) {
      updateData.accountData = data.accountData;
      updateData.hash = this.generateAccountHash(data.accountData);
    }

    if (data.status && ['AVAILABLE', 'DISABLED'].includes(data.status)) {
      updateData.status = data.status;
    }

    const updated = await this.prisma.productInventory.update({
      where: { id: inventoryId },
      data: updateData,
    });

    // Update product stock
    const availableCount = await this.prisma.productInventory.count({
      where: { productId: inventory.productId, status: 'AVAILABLE' },
    });

    await this.prisma.product.update({
      where: { id: inventory.productId },
      data: { stock: availableCount },
    });

    return updated;
  }

  /**
   * Delete inventory item
   */
  async deleteInventoryItem(userId: string, inventoryId: string) {
    const inventory = await this.prisma.productInventory.findUnique({
      where: { id: inventoryId },
      include: { product: true },
    });

    if (!inventory) {
      throw new NotFoundException('Không tìm thấy item');
    }

    if (inventory.product.sellerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa item này');
    }

    if (inventory.status === 'SOLD') {
      throw new BadRequestException('Không thể xóa tài khoản đã bán');
    }

    await this.prisma.productInventory.delete({
      where: { id: inventoryId },
    });

    // Update product stock
    const availableCount = await this.prisma.productInventory.count({
      where: { productId: inventory.productId, status: 'AVAILABLE' },
    });

    await this.prisma.product.update({
      where: { id: inventory.productId },
      data: { stock: availableCount },
    });

    // Update variant stock if applicable
    if (inventory.variantId) {
      const variantAvailableCount = await this.prisma.productInventory.count({
        where: { productId: inventory.productId, variantId: inventory.variantId, status: 'AVAILABLE' },
      });

      await this.prisma.productVariant.update({
        where: { id: inventory.variantId },
        data: { stock: variantAvailableCount },
      });
    }

    return { message: 'Xóa thành công', newStock: availableCount };
  }

  /**
   * Delete multiple inventory items
   */
  async deleteMultipleInventory(
    userId: string,
    productId: string,
    inventoryIds: string[],
  ) {
    // Verify product belongs to seller
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    // Only delete AVAILABLE or DISABLED items
    const result = await this.prisma.productInventory.deleteMany({
      where: {
        id: { in: inventoryIds },
        productId,
        status: { in: ['AVAILABLE', 'DISABLED'] },
      },
    });

    // Update product stock
    const availableCount = await this.prisma.productInventory.count({
      where: { productId, status: 'AVAILABLE' },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: availableCount },
    });

    // Update all variants stock
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
    });

    // Use Promise.all for parallel updates
    await Promise.all(variants.map(async (variant) => {
      const variantStock = await this.prisma.productInventory.count({
        where: { productId, variantId: variant.id, status: 'AVAILABLE' },
      });
      return this.prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: variantStock },
      });
    }));

    return {
      deleted: result.count,
      newStock: availableCount,
    };
  }

  /**
   * Delete ALL inventory items by status filter (no IDs needed)
   * Only allows deleting AVAILABLE or DISABLED items
   */
  async deleteAllInventoryByStatus(
    userId: string,
    productId: string,
    status: string,
    variantId?: string,
  ) {
    // Verify product belongs to seller
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc không thuộc về bạn');
    }

    // Only allow deleting AVAILABLE or DISABLED items
    const allowedStatuses = ['AVAILABLE', 'DISABLED'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Chỉ có thể xóa tài khoản có trạng thái Sẵn sàng hoặc Vô hiệu');
    }

    const where: any = {
      productId,
      status,
    };
    if (variantId) {
      where.variantId = variantId;
    }

    // Delete all matching items
    const result = await this.prisma.productInventory.deleteMany({ where });

    // Update product stock
    const availableCount = await this.prisma.productInventory.count({
      where: { productId, status: 'AVAILABLE' },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: availableCount },
    });

    // Update all variants stock
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
    });

    await Promise.all(variants.map(async (variant) => {
      const variantStock = await this.prisma.productInventory.count({
        where: { productId, variantId: variant.id, status: 'AVAILABLE' },
      });
      return this.prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: variantStock },
      });
    }));

    return {
      deleted: result.count,
      newStock: availableCount,
    };
  }

  /**
   * Get account templates
   */
  async getAccountTemplates() {
    return this.prisma.accountTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ==================== API KEY MANAGEMENT ====================

  /**
   * Get seller's API keys (without secrets)
   */
  async getApiKeys(userId: string) {
    const keys = await this.prisma.sellerApiKey.findMany({
      where: { sellerId: userId },
      select: {
        id: true,
        apiKey: true,
        name: true,
        isActive: true,
        rateLimit: true,
        lastUsedAt: true,
        lastUsedIp: true,
        totalCalls: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask API keys (show only first 12 chars)
    return keys.map((key) => ({
      ...key,
      apiKey: key.apiKey.substring(0, 12) + '...',
    }));
  }

  /**
   * Generate new API key for seller
   * Returns the full API key and secret (secret shown only once!)
   */
  async generateApiKey(userId: string, name?: string) {
    // Check if seller has store
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!store) {
      throw new BadRequestException('Bạn cần có cửa hàng để sử dụng API');
    }

    // Limit to 3 API keys per seller
    const existingCount = await this.prisma.sellerApiKey.count({
      where: { sellerId: userId },
    });

    if (existingCount >= 3) {
      throw new BadRequestException('Bạn chỉ có thể tạo tối đa 3 API key. Vui lòng xóa key cũ trước.');
    }

    // Generate API key: bhmmo_ + 32 random chars
    const apiKey = 'bhmmo_' + randomBytes(24).toString('base64url');

    // Generate secret: random hex string (this IS the secret used for HMAC)
    // We store this directly - client will use this same value to compute signatures
    const secretKey = randomBytes(32).toString('hex');

    // Create API key record
    const record = await this.prisma.sellerApiKey.create({
      data: {
        sellerId: userId,
        apiKey,
        secretHash: secretKey, // Store the secret key directly (used for HMAC verification)
        name: name || 'Default API Key',
        isActive: true,
        rateLimit: 100,
      },
    });

    // Return full credentials (secret shown only once!)
    return {
      id: record.id,
      apiKey: record.apiKey,
      secret: secretKey, // ⚠️ Secret is shown only once! Client uses this for HMAC
      name: record.name,
      rateLimit: record.rateLimit,
      createdAt: record.createdAt,
      message: 'Lưu ý: Secret chỉ hiển thị một lần duy nhất. Hãy lưu lại ngay!',
    };
  }

  /**
   * Revoke (delete) an API key
   */
  async revokeApiKey(userId: string, apiKeyId: string) {
    // Find and verify ownership
    const apiKey = await this.prisma.sellerApiKey.findFirst({
      where: { id: apiKeyId, sellerId: userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key không tồn tại');
    }

    await this.prisma.sellerApiKey.delete({
      where: { id: apiKeyId },
    });

    return { message: 'Đã xóa API key thành công' };
  }

  /**
   * Toggle API key active status
   */
  async toggleApiKeyStatus(userId: string, apiKeyId: string) {
    // Find and verify ownership
    const apiKey = await this.prisma.sellerApiKey.findFirst({
      where: { id: apiKeyId, sellerId: userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key không tồn tại');
    }

    const updated = await this.prisma.sellerApiKey.update({
      where: { id: apiKeyId },
      data: { isActive: !apiKey.isActive },
    });

    return {
      id: updated.id,
      isActive: updated.isActive,
      message: updated.isActive ? 'Đã bật API key' : 'Đã tắt API key',
    };
  }

  /**
   * Regenerate API key secret (keeps same API key, new secret)
   */
  async regenerateApiKeySecret(userId: string, apiKeyId: string) {
    // Find and verify ownership
    const apiKey = await this.prisma.sellerApiKey.findFirst({
      where: { id: apiKeyId, sellerId: userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key không tồn tại');
    }

    // Generate new secret key (used directly for HMAC)
    const secretKey = randomBytes(32).toString('hex');

    await this.prisma.sellerApiKey.update({
      where: { id: apiKeyId },
      data: { secretHash: secretKey },
    });

    return {
      id: apiKey.id,
      apiKey: apiKey.apiKey,
      secret: secretKey, // ⚠️ Secret is shown only once!
      message: 'Đã tạo secret mới. Lưu ý: Secret chỉ hiển thị một lần duy nhất!',
    };
  }

  // ==================== WITHDRAWAL PIN MANAGEMENT ====================

  async setWithdrawalPin(userId: string, dto: SetWithdrawalPinDto) {
    if (!dto.pin || dto.pin.length !== 6 || !/^\d{6}$/.test(dto.pin)) {
      throw new BadRequestException('Mã PIN phải gồm 6 chữ số');
    }

    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { withdrawalPin: true },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    if (store.withdrawalPin) {
      throw new BadRequestException('Bạn đã có mã PIN. Vui lòng sử dụng chức năng đổi mã PIN.');
    }

    const pinHash = createHash('sha256').update(dto.pin).digest('hex');

    await this.prisma.sellerProfile.update({
      where: { userId },
      data: { withdrawalPin: pinHash },
    });

    return { success: true, message: 'Đã tạo mã PIN rút tiền thành công' };
  }

  async changeWithdrawalPin(userId: string, dto: ChangeWithdrawalPinDto) {
    if (!dto.newPin || dto.newPin.length !== 6 || !/^\d{6}$/.test(dto.newPin)) {
      throw new BadRequestException('Mã PIN mới phải gồm 6 chữ số');
    }

    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { withdrawalPin: true },
    });

    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    if (!store.withdrawalPin) {
      throw new BadRequestException('Bạn chưa có mã PIN. Vui lòng tạo mã PIN trước.');
    }

    const oldPinHash = createHash('sha256').update(dto.oldPin).digest('hex');
    if (oldPinHash !== store.withdrawalPin) {
      throw new BadRequestException('Mã PIN cũ không chính xác');
    }

    const newPinHash = createHash('sha256').update(dto.newPin).digest('hex');

    await this.prisma.sellerProfile.update({
      where: { userId },
      data: { withdrawalPin: newPinHash },
    });

    return { success: true, message: 'Đã thay đổi mã PIN thành công' };
  }

  async hasWithdrawalPin(userId: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { withdrawalPin: true },
    });

    return { hasPin: !!store?.withdrawalPin };
  }

  // ==================== INSURANCE FUND MANAGEMENT ====================

  // Tier configuration
  private readonly INSURANCE_TIERS: Record<string, {
    level: number;
    deposit: number;
    maxCoverage: number;
    annualFee: number;
    label: string;
  }> = {
      BRONZE: { level: 1, deposit: 500000, maxCoverage: 200000, annualFee: 100000, label: 'Đồng' },
      SILVER: { level: 2, deposit: 2000000, maxCoverage: 1000000, annualFee: 200000, label: 'Bạc' },
      GOLD: { level: 3, deposit: 5000000, maxCoverage: 3000000, annualFee: 300000, label: 'Vàng' },
      DIAMOND: { level: 4, deposit: 10000000, maxCoverage: 5000000, annualFee: 500000, label: 'Kim Cương' },
      VIP: { level: 5, deposit: 20000000, maxCoverage: 10000000, annualFee: 1000000, label: 'VIP' },
    };

  private readonly INFO_UPDATE_FEE = 50000; // 50,000đ per info update

  /**
   * Get seller's insurance status
   */
  async getInsuranceStatus(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: {
        insuranceTier: true,
        insuranceLevel: true,
        isVerified: true,
        insuranceFund: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    const fund = profile.insuranceFund;

    return {
      hasInsurance: !!fund && fund.status === 'ACTIVE',
      tier: fund?.tier || null,
      level: profile.insuranceLevel || 0,
      tierLabel: fund?.tier ? this.INSURANCE_TIERS[fund.tier]?.label : null,
      fund: fund ? {
        id: fund.id,
        depositAmount: fund.depositAmount,
        currentBalance: fund.currentBalance,
        maxCoverage: fund.maxCoverage,
        annualFee: fund.annualFee,
        status: fund.status,
        activatedAt: fund.activatedAt,
        nextRenewalAt: fund.nextRenewalAt,
        canWithdrawFull: fund.canWithdrawFull,
      } : null,
      availableTiers: Object.entries(this.INSURANCE_TIERS).map(([key, config]) => ({
        tier: key,
        ...config,
      })),
    };
  }

  /**
   * Register / activate insurance fund
   * Deducts deposit from seller's wallet balance
   */
  async registerInsurance(userId: string, tier: string) {
    const tierConfig = this.INSURANCE_TIERS[tier];
    if (!tierConfig) {
      throw new BadRequestException('Gói bảo hiểm không hợp lệ');
    }

    // Check seller profile exists
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { insuranceFund: true },
    });

    if (!profile) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }

    // Check if already has active insurance
    if (profile.insuranceFund && profile.insuranceFund.status === 'ACTIVE') {
      throw new BadRequestException('Bạn đã có gói bảo hiểm đang hoạt động. Hãy nâng cấp thay vì đăng ký mới.');
    }

    // Check wallet balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user || user.balance < tierConfig.deposit) {
      throw new BadRequestException(
        `Số dư không đủ. Cần ${tierConfig.deposit.toLocaleString('vi-VN')}đ, hiện có ${(user?.balance || 0).toLocaleString('vi-VN')}đ`
      );
    }

    const nextRenewal = new Date();
    nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);

    // Transaction: deduct balance + create fund + update profile
    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: tierConfig.deposit } },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
          amount: tierConfig.deposit,
          status: 'COMPLETED',
          description: `Đóng quỹ bảo hiểm gói ${tierConfig.label}`,
        },
      });

      // Create or update insurance fund
      let fund;
      if (profile.insuranceFund) {
        // Reactivate existing fund
        fund = await tx.insuranceFund.update({
          where: { id: profile.insuranceFund.id },
          data: {
            tier,
            level: tierConfig.level,
            depositAmount: tierConfig.deposit,
            currentBalance: tierConfig.deposit,
            maxCoverage: tierConfig.maxCoverage,
            annualFee: tierConfig.annualFee,
            status: 'ACTIVE',
            activatedAt: new Date(),
            nextRenewalAt: nextRenewal,
            withdrawnAt: null,
            revokedAt: null,
            canWithdrawFull: false,
          },
        });
      } else {
        // Create new fund
        fund = await tx.insuranceFund.create({
          data: {
            sellerId: userId,
            tier,
            level: tierConfig.level,
            depositAmount: tierConfig.deposit,
            currentBalance: tierConfig.deposit,
            maxCoverage: tierConfig.maxCoverage,
            annualFee: tierConfig.annualFee,
            status: 'ACTIVE',
            nextRenewalAt: nextRenewal,
          },
        });
      }

      // Create history record
      await tx.insuranceFundHistory.create({
        data: {
          fundId: fund.id,
          type: 'DEPOSIT',
          amount: tierConfig.deposit,
          balanceBefore: 0,
          balanceAfter: tierConfig.deposit,
          description: `Đăng ký gói bảo hiểm ${tierConfig.label} — Cọc ${tierConfig.deposit.toLocaleString('vi-VN')}đ`,
        },
      });

      // Update seller profile
      await tx.sellerProfile.update({
        where: { userId },
        data: {
          insuranceTier: tier,
          insuranceLevel: tierConfig.level,
          isVerified: true,
        },
      });

      return fund;
    });

    return {
      success: true,
      message: `Đã đăng ký gói bảo hiểm ${tierConfig.label} thành công`,
      fund: result,
    };
  }

  /**
   * Upgrade insurance tier (pay difference)
   */
  async upgradeInsurance(userId: string, newTier: string) {
    const newTierConfig = this.INSURANCE_TIERS[newTier];
    if (!newTierConfig) {
      throw new BadRequestException('Gói bảo hiểm không hợp lệ');
    }

    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { insuranceFund: true },
    });

    if (!profile || !profile.insuranceFund || profile.insuranceFund.status !== 'ACTIVE') {
      throw new BadRequestException('Bạn chưa có gói bảo hiểm đang hoạt động');
    }

    const currentFund = profile.insuranceFund;
    const currentTierConfig = this.INSURANCE_TIERS[currentFund.tier];

    if (!currentTierConfig || newTierConfig.level <= currentTierConfig.level) {
      throw new BadRequestException('Chỉ có thể nâng cấp lên gói cao hơn');
    }

    // Calculate difference to pay
    const difference = newTierConfig.deposit - currentFund.currentBalance;

    if (difference > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      if (!user || user.balance < difference) {
        throw new BadRequestException(
          `Số dư không đủ. Cần thêm ${difference.toLocaleString('vi-VN')}đ, hiện có ${(user?.balance || 0).toLocaleString('vi-VN')}đ`
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct difference from wallet
      if (difference > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { decrement: difference } },
        });

        await tx.transaction.create({
          data: {
            userId,
            type: 'WITHDRAW',
            amount: difference,
            status: 'COMPLETED',
            description: `Nâng cấp BH từ ${currentTierConfig.label} → ${newTierConfig.label}`,
          },
        });
      }

      const oldBalance = currentFund.currentBalance;
      const newBalance = newTierConfig.deposit;

      // Update fund
      const fund = await tx.insuranceFund.update({
        where: { id: currentFund.id },
        data: {
          tier: newTier,
          level: newTierConfig.level,
          depositAmount: newTierConfig.deposit,
          currentBalance: newBalance,
          maxCoverage: newTierConfig.maxCoverage,
          annualFee: newTierConfig.annualFee,
        },
      });

      // History
      await tx.insuranceFundHistory.create({
        data: {
          fundId: fund.id,
          type: 'UPGRADE',
          amount: difference,
          balanceBefore: oldBalance,
          balanceAfter: newBalance,
          description: `Nâng cấp từ ${currentTierConfig.label} → ${newTierConfig.label}`,
        },
      });

      // Update profile
      await tx.sellerProfile.update({
        where: { userId },
        data: {
          insuranceTier: newTier,
          insuranceLevel: newTierConfig.level,
        },
      });

      return fund;
    });

    return {
      success: true,
      message: `Đã nâng cấp lên gói ${newTierConfig.label}`,
      fund: result,
    };
  }

  /**
   * Withdraw insurance fund
   * Before 5 months: refund 50%
   * After 5 months: refund 100%
   */
  async withdrawInsurance(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { insuranceFund: true },
    });

    if (!profile || !profile.insuranceFund || profile.insuranceFund.status !== 'ACTIVE') {
      throw new BadRequestException('Bạn không có gói bảo hiểm đang hoạt động');
    }

    const fund = profile.insuranceFund;
    const monthsSinceActivation = Math.floor(
      (Date.now() - new Date(fund.activatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const isEarlyWithdrawal = monthsSinceActivation < 5;
    const refundRate = isEarlyWithdrawal ? 0.5 : 1.0;
    const refundAmount = Math.floor(fund.currentBalance * refundRate);
    const penaltyAmount = fund.currentBalance - refundAmount;

    const result = await this.prisma.$transaction(async (tx) => {
      // Refund to wallet
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: refundAmount } },
      });

      // Transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount: refundAmount,
          status: 'COMPLETED',
          description: isEarlyWithdrawal
            ? `Rút BH sớm (${monthsSinceActivation} tháng) — Hoàn 50%: ${refundAmount.toLocaleString('vi-VN')}đ`
            : `Rút BH — Hoàn 100%: ${refundAmount.toLocaleString('vi-VN')}đ`,
        },
      });

      // Update fund status
      const updatedFund = await tx.insuranceFund.update({
        where: { id: fund.id },
        data: {
          status: 'WITHDRAWN',
          currentBalance: 0,
          withdrawnAt: new Date(),
        },
      });

      // History
      await tx.insuranceFundHistory.create({
        data: {
          fundId: fund.id,
          type: 'WITHDRAW',
          amount: -fund.currentBalance,
          balanceBefore: fund.currentBalance,
          balanceAfter: 0,
          description: isEarlyWithdrawal
            ? `Rút BH sớm (${monthsSinceActivation}/5 tháng) — Hoàn ${refundAmount.toLocaleString('vi-VN')}đ, mất ${penaltyAmount.toLocaleString('vi-VN')}đ`
            : `Rút BH đủ hạn — Hoàn ${refundAmount.toLocaleString('vi-VN')}đ`,
          metadata: JSON.stringify({ monthsSinceActivation, refundRate, penaltyAmount }),
        },
      });

      // Remove verification
      await tx.sellerProfile.update({
        where: { userId },
        data: {
          insuranceTier: null,
          insuranceLevel: 0,
          isVerified: false,
        },
      });

      return updatedFund;
    });

    return {
      success: true,
      message: isEarlyWithdrawal
        ? `Đã rút BH sớm. Hoàn ${refundAmount.toLocaleString('vi-VN')}đ (50%). Mất ${penaltyAmount.toLocaleString('vi-VN')}đ phí rút sớm.`
        : `Đã rút BH. Hoàn ${refundAmount.toLocaleString('vi-VN')}đ (100%).`,
      refundAmount,
      penaltyAmount,
      isEarlyWithdrawal,
      monthsSinceActivation,
    };
  }

  /**
   * Get insurance history
   */
  async getInsuranceHistory(userId: string, limit: number, offset: number) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { insuranceFund: true },
    });

    if (!profile?.insuranceFund) {
      return { history: [], total: 0 };
    }

    const [history, total] = await Promise.all([
      this.prisma.insuranceFundHistory.findMany({
        where: { fundId: profile.insuranceFund.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.insuranceFundHistory.count({
        where: { fundId: profile.insuranceFund.id },
      }),
    ]);

    return { history, total };
  }

  /**
   * Update insurance info (costs 50,000đ per change)
   */
  async updateInsuranceInfo(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { insuranceFund: true },
    });

    if (!profile?.insuranceFund || profile.insuranceFund.status !== 'ACTIVE') {
      throw new BadRequestException('Bạn chưa có gói bảo hiểm đang hoạt động');
    }

    const fund = profile.insuranceFund;

    if (fund.currentBalance < this.INFO_UPDATE_FEE) {
      throw new BadRequestException(
        `Quỹ BH không đủ phí cập nhật thông tin (${this.INFO_UPDATE_FEE.toLocaleString('vi-VN')}đ)`
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const oldBalance = fund.currentBalance;
      const newBalance = oldBalance - this.INFO_UPDATE_FEE;

      // Deduct from insurance fund
      const updatedFund = await tx.insuranceFund.update({
        where: { id: fund.id },
        data: { currentBalance: newBalance },
      });

      // History
      await tx.insuranceFundHistory.create({
        data: {
          fundId: fund.id,
          type: 'INFO_CHANGE',
          amount: -this.INFO_UPDATE_FEE,
          balanceBefore: oldBalance,
          balanceAfter: newBalance,
          description: `Phí cập nhật thông tin hồ sơ BH: ${this.INFO_UPDATE_FEE.toLocaleString('vi-VN')}đ`,
        },
      });

      return updatedFund;
    });

    return {
      success: true,
      message: `Đã trừ ${this.INFO_UPDATE_FEE.toLocaleString('vi-VN')}đ phí cập nhật thông tin`,
      newBalance: result.currentBalance,
    };
  }
}
