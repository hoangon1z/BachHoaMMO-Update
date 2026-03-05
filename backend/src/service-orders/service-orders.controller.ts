import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-orders')
@UseGuards(JwtAuthGuard)
export class ServiceOrdersController {
    constructor(private readonly serviceOrdersService: ServiceOrdersService) { }

    // ============================================
    // SELLER ENDPOINTS
    // ============================================

    // GET /service-orders/seller - Lấy danh sách đơn dịch vụ của seller
    @Get('seller')
    async getSellerServiceOrders(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.serviceOrdersService.getSellerServiceOrders(
            req.user.id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            status,
            search,
        );
    }

    // GET /service-orders/seller/stats - Thống kê dịch vụ
    @Get('seller/stats')
    async getSellerServiceStats(@Request() req) {
        return this.serviceOrdersService.getSellerServiceStats(req.user.id);
    }

    // GET /service-orders/seller/:id - Chi tiết đơn dịch vụ (seller)
    @Get('seller/:id')
    async getSellerServiceOrder(@Request() req, @Param('id') id: string) {
        return this.serviceOrdersService.getSellerServiceOrder(req.user.id, id);
    }

    // POST /service-orders/seller/:id/start - Bắt đầu xử lý
    @Post('seller/:id/start')
    async startProcessing(@Request() req, @Param('id') id: string) {
        return this.serviceOrdersService.startProcessing(req.user.id, id);
    }

    // PUT /service-orders/seller/:id/progress - Cập nhật tiến độ
    @Put('seller/:id/progress')
    async updateProgress(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { delivered: number; note?: string },
    ) {
        return this.serviceOrdersService.updateProgress(
            req.user.id,
            id,
            body.delivered,
            body.note,
        );
    }

    // POST /service-orders/seller/:id/partial - Hoàn thành 1 phần
    @Post('seller/:id/partial')
    async completePartial(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { delivered: number; note?: string },
    ) {
        return this.serviceOrdersService.completePartial(
            req.user.id,
            id,
            body.delivered,
            body.note,
        );
    }

    // POST /service-orders/seller/:id/cancel - Hủy đơn
    @Post('seller/:id/cancel')
    async cancelServiceOrder(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { reason: string },
    ) {
        return this.serviceOrdersService.cancelServiceOrder(req.user.id, id, body.reason);
    }

    // PUT /service-orders/seller/warranty/:id - Xử lý yêu cầu bảo hành
    @Put('seller/warranty/:id')
    async handleWarrantyRequest(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { action: 'APPROVED' | 'REJECTED'; deliveredCount?: number; sellerNote?: string },
    ) {
        return this.serviceOrdersService.handleWarrantyRequest(
            req.user.id,
            id,
            body.action,
            { deliveredCount: body.deliveredCount, sellerNote: body.sellerNote },
        );
    }

    // ============================================
    // BUYER ENDPOINTS
    // ============================================

    // GET /service-orders/buyer - Danh sách đơn dịch vụ (buyer)
    @Get('buyer')
    async getBuyerServiceOrders(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
    ) {
        return this.serviceOrdersService.getBuyerServiceOrders(
            req.user.id,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            status,
        );
    }

    // GET /service-orders/buyer/:id - Chi tiết đơn dịch vụ (buyer)
    @Get('buyer/:id')
    async getBuyerServiceOrder(@Request() req, @Param('id') id: string) {
        return this.serviceOrdersService.getBuyerServiceOrder(req.user.id, id);
    }

    // POST /service-orders/buyer/:id/warranty - Yêu cầu bảo hành
    @Post('buyer/:id/warranty')
    async requestWarranty(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { currentCount: number; evidence?: string; buyerNote?: string },
    ) {
        return this.serviceOrdersService.requestWarranty(req.user.id, id, body);
    }
}
