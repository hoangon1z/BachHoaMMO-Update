import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ServiceOrdersService {
    private readonly logger = new Logger(ServiceOrdersService.name);

    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
        private notificationsService: NotificationsService,
    ) { }

    // ============================================
    // SELLER: Lấy danh sách đơn dịch vụ
    // ============================================
    async getSellerServiceOrders(
        sellerId: string,
        page = 1,
        limit = 20,
        status?: string,
        search?: string,
    ) {
        const where: any = { sellerId };
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { serviceLink: { contains: search } },
                { orderItem: { order: { orderNumber: { contains: search } } } },
            ];
        }

        const [serviceOrders, total] = await Promise.all([
            this.prisma.serviceOrder.findMany({
                where,
                include: {
                    product: { select: { id: true, title: true, images: true, servicePlatform: true, serviceType: true } },
                    buyer: { select: { id: true, name: true, email: true } },
                    orderItem: {
                        select: {
                            id: true,
                            orderId: true,
                            price: true,
                            total: true,
                            order: { select: { orderNumber: true } },
                        },
                    },
                    warrantyRequests: {
                        where: { status: 'PENDING' },
                        select: { id: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.serviceOrder.count({ where }),
        ]);

        return {
            serviceOrders,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    // ============================================
    // SELLER: Xem chi tiết đơn dịch vụ
    // ============================================
    async getSellerServiceOrder(sellerId: string, serviceOrderId: string) {
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            include: {
                product: { select: { id: true, title: true, images: true, servicePlatform: true, serviceType: true, warrantyDays: true } },
                buyer: { select: { id: true, name: true, email: true } },
                orderItem: {
                    select: {
                        id: true,
                        orderId: true,
                        price: true,
                        total: true,
                        quantity: true,
                        order: { select: { id: true, orderNumber: true, status: true } },
                    },
                },
                warrantyRequests: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!serviceOrder) throw new NotFoundException('Đơn dịch vụ không tìm thấy');
        if (serviceOrder.sellerId !== sellerId) throw new ForbiddenException('Không có quyền xem đơn này');

        return serviceOrder;
    }

    // ============================================
    // SELLER: Bắt đầu xử lý đơn dịch vụ
    // ============================================
    async startProcessing(sellerId: string, serviceOrderId: string) {
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            include: { buyer: { select: { id: true, name: true } } },
        });

        if (!serviceOrder) throw new NotFoundException('Đơn dịch vụ không tìm thấy');
        if (serviceOrder.sellerId !== sellerId) throw new ForbiddenException('Không có quyền');
        if (serviceOrder.status !== 'PENDING') throw new BadRequestException('Chỉ có thể bắt đầu xử lý đơn ở trạng thái chờ');

        const updated = await this.prisma.serviceOrder.update({
            where: { id: serviceOrderId },
            data: {
                status: 'PROCESSING',
                startedAt: new Date(),
            },
        });

        // Thông báo cho buyer
        await this.notificationsService.create({
            userId: serviceOrder.buyerId,
            type: 'ORDER',
            title: 'Đơn dịch vụ đang được xử lý',
            message: `Seller đã bắt đầu xử lý đơn dịch vụ ${serviceOrder.serviceType} cho link của bạn.`,
            link: `/orders`,
        });

        this.logger.log(`Service order ${serviceOrderId} started processing by seller ${sellerId}`);
        return updated;
    }

    // ============================================
    // SELLER: Cập nhật tiến độ
    // ============================================
    async updateProgress(
        sellerId: string,
        serviceOrderId: string,
        delivered: number,
        note?: string,
    ) {
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
        });

        if (!serviceOrder) throw new NotFoundException('Đơn dịch vụ không tìm thấy');
        if (serviceOrder.sellerId !== sellerId) throw new ForbiddenException('Không có quyền');
        if (!['PROCESSING', 'PENDING'].includes(serviceOrder.status)) {
            throw new BadRequestException('Chỉ có thể cập nhật tiến độ cho đơn đang xử lý');
        }

        if (delivered < 0) throw new BadRequestException('Số lượng không hợp lệ');
        if (delivered > serviceOrder.quantity) throw new BadRequestException('Số lượng đã giao không thể vượt quá số lượng đặt');

        const progress = Math.round((delivered / serviceOrder.quantity) * 100);
        const isCompleted = delivered >= serviceOrder.quantity;

        const updateData: any = {
            delivered,
            progress,
            sellerNote: note || serviceOrder.sellerNote,
        };

        // Tự động chuyển sang PROCESSING nếu đang PENDING
        if (serviceOrder.status === 'PENDING' && delivered > 0) {
            updateData.status = 'PROCESSING';
            updateData.startedAt = new Date();
        }

        // Tự động hoàn thành nếu đủ số lượng
        if (isCompleted) {
            updateData.status = 'COMPLETED';
            updateData.completedAt = new Date();
            // Tính warranty expiry
            if (serviceOrder.warrantyDays > 0) {
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + serviceOrder.warrantyDays);
                updateData.warrantyExpiry = expiry;
            }
        }

        const updated = await this.prisma.serviceOrder.update({
            where: { id: serviceOrderId },
            data: updateData,
        });

        // Thông báo buyer nếu hoàn thành
        if (isCompleted) {
            await this.notificationsService.create({
                userId: serviceOrder.buyerId,
                type: 'ORDER',
                title: 'Đơn dịch vụ đã hoàn thành!',
                message: `Đơn ${serviceOrder.serviceType} đã hoàn thành: ${delivered}/${serviceOrder.quantity}. ${serviceOrder.warrantyDays > 0 ? `Bảo hành ${serviceOrder.warrantyDays} ngày.` : ''}`,
                link: `/orders`,
            });

            // Cập nhật order item + order status + release escrow
            await this.completeParentOrder(serviceOrder.orderItemId);
        }

        this.logger.log(`Service order ${serviceOrderId} progress: ${delivered}/${serviceOrder.quantity} (${progress}%)`);
        return updated;
    }

    // ============================================
    // SELLER: Hoàn thành 1 phần (partial) + hoàn tiền
    // ============================================
    async completePartial(
        sellerId: string,
        serviceOrderId: string,
        delivered: number,
        note?: string,
    ) {
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            include: {
                orderItem: {
                    select: { price: true, total: true, orderId: true },
                },
            },
        });

        if (!serviceOrder) throw new NotFoundException('Đơn dịch vụ không tìm thấy');
        if (serviceOrder.sellerId !== sellerId) throw new ForbiddenException('Không có quyền');
        if (!['PROCESSING', 'PENDING'].includes(serviceOrder.status)) {
            throw new BadRequestException('Không thể hoàn thành partial cho đơn này');
        }
        if (delivered <= 0) throw new BadRequestException('Số lượng phải lớn hơn 0');
        if (delivered >= serviceOrder.quantity) throw new BadRequestException('Dùng cập nhật tiến độ để hoàn thành toàn bộ');

        // Tính số tiền hoàn trả
        const pricePerUnit = serviceOrder.orderItem.total / serviceOrder.quantity;
        const remainingQuantity = serviceOrder.quantity - delivered;
        const refundAmount = Math.round(pricePerUnit * remainingQuantity);

        const progress = Math.round((delivered / serviceOrder.quantity) * 100);

        // Transaction: update service order + refund buyer
        await this.prisma.$transaction(async (tx) => {
            // Update service order
            await tx.serviceOrder.update({
                where: { id: serviceOrderId },
                data: {
                    status: 'PARTIAL',
                    delivered,
                    progress,
                    completedAt: new Date(),
                    refundedAmount: refundAmount,
                    sellerNote: note || serviceOrder.sellerNote,
                    warrantyExpiry: serviceOrder.warrantyDays > 0
                        ? new Date(Date.now() + serviceOrder.warrantyDays * 24 * 60 * 60 * 1000)
                        : null,
                },
            });

            // Hoàn tiền cho buyer
            await tx.user.update({
                where: { id: serviceOrder.buyerId },
                data: { balance: { increment: refundAmount } },
            });

            // Tạo transaction record
            await tx.transaction.create({
                data: {
                    userId: serviceOrder.buyerId,
                    type: 'REFUND',
                    amount: refundAmount,
                    status: 'COMPLETED',
                    description: `Hoàn tiền ${remainingQuantity} ${serviceOrder.serviceType} chưa giao (đơn dịch vụ partial)`,
                    orderId: serviceOrder.orderItem.orderId,
                },
            });

            // Update order item + order status + release escrow
            await this.completeParentOrder(serviceOrder.orderItemId, tx);
        });

        // Thông báo buyer
        await this.notificationsService.create({
            userId: serviceOrder.buyerId,
            type: 'ORDER',
            title: 'Đơn dịch vụ hoàn thành 1 phần',
            message: `Đã giao ${delivered}/${serviceOrder.quantity} ${serviceOrder.serviceType}. Hoàn tiền ${refundAmount.toLocaleString('vi-VN')}đ cho phần còn lại.`,
            link: `/orders`,
        });

        this.logger.log(`Service order ${serviceOrderId} partial complete: ${delivered}/${serviceOrder.quantity}, refund: ${refundAmount}`);
        return { delivered, refundAmount, progress };
    }

    // ============================================
    // SELLER: Hủy đơn dịch vụ
    // ============================================
    async cancelServiceOrder(
        sellerId: string,
        serviceOrderId: string,
        reason: string,
    ) {
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            include: {
                orderItem: {
                    select: { total: true, orderId: true },
                },
            },
        });

        if (!serviceOrder) throw new NotFoundException('Đơn dịch vụ không tìm thấy');
        if (serviceOrder.sellerId !== sellerId) throw new ForbiddenException('Không có quyền');
        if (['COMPLETED', 'CANCELLED'].includes(serviceOrder.status)) {
            throw new BadRequestException('Không thể hủy đơn đã hoàn thành hoặc đã hủy');
        }

        const refundAmount = serviceOrder.orderItem.total;

        await this.prisma.$transaction(async (tx) => {
            // Update service order
            await tx.serviceOrder.update({
                where: { id: serviceOrderId },
                data: {
                    status: 'CANCELLED',
                    cancelReason: reason,
                    refundedAmount: refundAmount,
                    completedAt: new Date(),
                },
            });

            // Hoàn tiền buyer
            await tx.user.update({
                where: { id: serviceOrder.buyerId },
                data: { balance: { increment: refundAmount } },
            });

            // Transaction record
            await tx.transaction.create({
                data: {
                    userId: serviceOrder.buyerId,
                    type: 'REFUND',
                    amount: refundAmount,
                    status: 'COMPLETED',
                    description: `Hoàn tiền đơn dịch vụ bị hủy: ${reason}`,
                    orderId: serviceOrder.orderItem.orderId,
                },
            });

            // Update order status
            await tx.order.update({
                where: { id: serviceOrder.orderItem.orderId },
                data: { status: 'CANCELLED' },
            });
        });

        // Thông báo buyer
        await this.notificationsService.create({
            userId: serviceOrder.buyerId,
            type: 'ORDER',
            title: 'Đơn dịch vụ đã bị hủy',
            message: `Đơn ${serviceOrder.serviceType} đã bị hủy. Lý do: ${reason}. Đã hoàn ${refundAmount.toLocaleString('vi-VN')}đ vào ví.`,
            link: `/orders`,
        });

        this.logger.log(`Service order ${serviceOrderId} cancelled by seller ${sellerId}, refund: ${refundAmount}`);
        return { refundAmount };
    }

    // ============================================
    // BUYER: Lấy danh sách đơn dịch vụ
    // ============================================
    async getBuyerServiceOrders(
        buyerId: string,
        page = 1,
        limit = 20,
        status?: string,
    ) {
        const where: any = { buyerId };
        if (status) where.status = status;

        const [serviceOrders, total] = await Promise.all([
            this.prisma.serviceOrder.findMany({
                where,
                include: {
                    product: { select: { id: true, title: true, images: true, servicePlatform: true, serviceType: true } },
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            sellerProfile: { select: { shopName: true, shopLogo: true } },
                        },
                    },
                    orderItem: {
                        select: {
                            orderId: true,
                            price: true,
                            total: true,
                            order: { select: { orderNumber: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.serviceOrder.count({ where }),
        ]);

        return { serviceOrders, total, page, totalPages: Math.ceil(total / limit) };
    }

    // ============================================
    // BUYER: Xem chi tiết đơn dịch vụ
    // ============================================
    async getBuyerServiceOrder(buyerId: string, serviceOrderId: string) {
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
            include: {
                product: { select: { id: true, title: true, images: true, servicePlatform: true, serviceType: true, warrantyDays: true } },
                seller: {
                    select: {
                        id: true,
                        name: true,
                        sellerProfile: { select: { shopName: true, shopLogo: true } },
                    },
                },
                orderItem: {
                    select: {
                        orderId: true,
                        price: true,
                        total: true,
                        quantity: true,
                        order: { select: { id: true, orderNumber: true, status: true } },
                    },
                },
                warrantyRequests: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!serviceOrder) throw new NotFoundException('Đơn dịch vụ không tìm thấy');
        if (serviceOrder.buyerId !== buyerId) throw new ForbiddenException('Không có quyền xem đơn này');

        return serviceOrder;
    }

    // ============================================
    // BUYER: Yêu cầu bảo hành
    // ============================================
    async requestWarranty(
        buyerId: string,
        serviceOrderId: string,
        data: { currentCount: number; evidence?: string; buyerNote?: string },
    ) {
        const serviceOrder = await this.prisma.serviceOrder.findUnique({
            where: { id: serviceOrderId },
        });

        if (!serviceOrder) throw new NotFoundException('Đơn dịch vụ không tìm thấy');
        if (serviceOrder.buyerId !== buyerId) throw new ForbiddenException('Không có quyền');
        if (!['COMPLETED', 'PARTIAL'].includes(serviceOrder.status)) {
            throw new BadRequestException('Chỉ có thể yêu cầu bảo hành cho đơn đã hoàn thành');
        }
        if (serviceOrder.warrantyDays === 0) {
            throw new BadRequestException('Đơn dịch vụ này không có bảo hành');
        }
        if (serviceOrder.warrantyExpiry && new Date() > serviceOrder.warrantyExpiry) {
            throw new BadRequestException('Đã hết thời hạn bảo hành');
        }

        // Check xem có request đang pending không
        const pendingRequest = await this.prisma.serviceWarrantyRequest.findFirst({
            where: { serviceOrderId, status: 'PENDING' },
        });
        if (pendingRequest) {
            throw new BadRequestException('Bạn đã có yêu cầu bảo hành đang chờ xử lý');
        }

        const requestedCount = serviceOrder.delivered - data.currentCount;
        if (requestedCount <= 0) {
            throw new BadRequestException('Số lượng hiện tại phải nhỏ hơn số lượng đã giao');
        }

        const warrantyRequest = await this.prisma.serviceWarrantyRequest.create({
            data: {
                serviceOrderId,
                currentCount: data.currentCount,
                requestedCount,
                evidence: data.evidence,
                buyerNote: data.buyerNote,
            },
        });

        // Thông báo seller
        await this.notificationsService.create({
            userId: serviceOrder.sellerId,
            type: 'ORDER',
            title: 'Yêu cầu bảo hành dịch vụ',
            message: `Buyer yêu cầu bù ${requestedCount} ${serviceOrder.serviceType} (hiện còn ${data.currentCount}/${serviceOrder.delivered})`,
            link: `/seller/orders`,
        });

        this.logger.log(`Warranty request created for service order ${serviceOrderId}: need ${requestedCount} more`);
        return warrantyRequest;
    }

    // ============================================
    // SELLER: Xử lý yêu cầu bảo hành
    // ============================================
    async handleWarrantyRequest(
        sellerId: string,
        warrantyRequestId: string,
        action: 'APPROVED' | 'REJECTED',
        data?: { deliveredCount?: number; sellerNote?: string },
    ) {
        const request = await this.prisma.serviceWarrantyRequest.findUnique({
            where: { id: warrantyRequestId },
            include: {
                serviceOrder: true,
            },
        });

        if (!request) throw new NotFoundException('Yêu cầu bảo hành không tìm thấy');
        if (request.serviceOrder.sellerId !== sellerId) throw new ForbiddenException('Không có quyền');
        if (request.status !== 'PENDING') throw new BadRequestException('Yêu cầu đã được xử lý');

        if (action === 'APPROVED') {
            const deliveredCount = data?.deliveredCount || request.requestedCount;

            await this.prisma.$transaction(async (tx) => {
                await tx.serviceWarrantyRequest.update({
                    where: { id: warrantyRequestId },
                    data: {
                        status: 'COMPLETED',
                        deliveredCount,
                        sellerNote: data?.sellerNote,
                    },
                });

                // Cập nhật delivered trong service order
                await tx.serviceOrder.update({
                    where: { id: request.serviceOrderId },
                    data: {
                        delivered: { increment: deliveredCount },
                    },
                });
            });

            // Thông báo buyer
            await this.notificationsService.create({
                userId: request.serviceOrder.buyerId,
                type: 'ORDER',
                title: 'Bảo hành đã được xử lý',
                message: `Seller đã bù ${deliveredCount} ${request.serviceOrder.serviceType} cho đơn bảo hành.`,
                link: `/orders`,
            });
        } else {
            await this.prisma.serviceWarrantyRequest.update({
                where: { id: warrantyRequestId },
                data: {
                    status: 'REJECTED',
                    sellerNote: data?.sellerNote || 'Từ chối bảo hành',
                },
            });

            // Thông báo buyer
            await this.notificationsService.create({
                userId: request.serviceOrder.buyerId,
                type: 'ORDER',
                title: 'Yêu cầu bảo hành bị từ chối',
                message: `Seller đã từ chối yêu cầu bảo hành. ${data?.sellerNote ? `Lý do: ${data.sellerNote}` : ''}`,
                link: `/orders`,
            });
        }

        this.logger.log(`Warranty request ${warrantyRequestId} ${action} by seller ${sellerId}`);
        return { success: true, action };
    }

    // ============================================
    // DASHBOARD: Thống kê dịch vụ cho seller
    // ============================================
    async getSellerServiceStats(sellerId: string) {
        const [pending, processing, completed, partial, cancelled, totalRevenue] = await Promise.all([
            this.prisma.serviceOrder.count({ where: { sellerId, status: 'PENDING' } }),
            this.prisma.serviceOrder.count({ where: { sellerId, status: 'PROCESSING' } }),
            this.prisma.serviceOrder.count({ where: { sellerId, status: 'COMPLETED' } }),
            this.prisma.serviceOrder.count({ where: { sellerId, status: 'PARTIAL' } }),
            this.prisma.serviceOrder.count({ where: { sellerId, status: 'CANCELLED' } }),
            this.prisma.serviceOrder.aggregate({
                where: { sellerId, status: { in: ['COMPLETED', 'PARTIAL'] } },
                _sum: { quantity: true },
            }),
        ]);

        const pendingWarranties = await this.prisma.serviceWarrantyRequest.count({
            where: {
                serviceOrder: { sellerId },
                status: 'PENDING',
            },
        });

        return {
            pending,
            processing,
            completed,
            partial,
            cancelled,
            total: pending + processing + completed + partial + cancelled,
            totalDelivered: totalRevenue._sum.quantity || 0,
            pendingWarranties,
        };
    }

    // ============================================
    // PRIVATE: Cập nhật parent Order khi service order hoàn thành
    // Escrow sẽ được release bởi cron job sau 3 ngày (holdUntil)
    // ============================================
    private async completeParentOrder(orderItemId: string, existingTx?: any) {
        const run = async (tx: any) => {
            // Lấy order item + order
            const orderItem = await tx.orderItem.findUnique({
                where: { id: orderItemId },
                include: {
                    order: {
                        include: {
                            items: true,
                        },
                    },
                },
            });

            if (!orderItem) return;

            // Cập nhật deliveredQuantity cho order item
            await tx.orderItem.update({
                where: { id: orderItemId },
                data: { deliveredQuantity: orderItem.quantity },
            });

            const order = orderItem.order;

            // Kiểm tra xem TẤT CẢ items trong order đã giao đủ chưa
            const allItems = order.items;
            const allDelivered = allItems.every((item: any) => {
                if (item.id === orderItemId) return true; // item vừa update
                return item.deliveredQuantity >= item.quantity;
            });

            if (allDelivered && order.status !== 'COMPLETED') {
                // Cập nhật order → COMPLETED
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: 'COMPLETED',
                        deliveredAt: new Date(),
                    },
                });

                // NOTE: Escrow KHÔNG release ở đây
                // Cron job sẽ tự release khi holdUntil hết hạn (3 ngày)
                this.logger.log(`Order ${order.orderNumber} auto-completed (all service orders done). Escrow will be released by cron after holdUntil.`);
            }
        };

        if (existingTx) {
            await run(existingTx);
        } else {
            await this.prisma.$transaction(run);
        }
    }
}
