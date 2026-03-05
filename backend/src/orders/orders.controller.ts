import { Controller, Get, Post, Body, Param, UseGuards, Request, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response } from 'express';
import { existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) { }

  /**
   * Create order
   * POST /orders/create
   * Body: { items: [{ productId, quantity, price }], total: number }
   */
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createOrder(
    @Body() body: {
      items: Array<{ productId: string; quantity: number; price: number; variantId?: string; variantName?: string; buyerProvidedData?: string; serviceLink?: string; serviceQuantity?: number }>;
      total: number;
      discountCode?: string;
      notes?: string;
    },
    @Request() req,
  ) {
    const buyerId = req.user.id;
    return this.ordersService.createOrder(buyerId, body.items, body.total, body.discountCode);
  }

  /**
   * Get my orders (as buyer)
   * GET /orders/my-orders
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  async getMyOrders(@Request() req) {
    return this.ordersService.getUserOrders(req.user.id);
  }

  /**
   * Get my sales (as seller)
   * GET /orders/my-sales
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-sales')
  async getMySales(@Request() req) {
    return this.ordersService.getSellerOrders(req.user.id);
  }

  /**
   * Get order details
   * GET /orders/:orderId
   */
  @UseGuards(JwtAuthGuard)
  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string, @Request() req) {
    return this.ordersService.getOrderById(orderId, req.user.id);
  }

  /**
   * Download delivery file
   * GET /orders/:orderId/deliveries/:deliveryId/download
   * For FILE: type → serve the actual file
   * For text type → auto-generate .txt file
   */
  @UseGuards(JwtAuthGuard)
  @Get(':orderId/deliveries/:deliveryId/download')
  async downloadDelivery(
    @Param('orderId') orderId: string,
    @Param('deliveryId') deliveryId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    // Verify buyer owns this order
    const delivery = await this.ordersService.getDeliveryForDownload(orderId, deliveryId, req.user.id);

    if (delivery.accountData.startsWith('FILE:')) {
      // File-based delivery - serve the actual file
      const filePath = join(process.cwd(), delivery.accountData.replace('FILE:', ''));

      if (!existsSync(filePath)) {
        throw new NotFoundException('File không tồn tại trên server');
      }

      const fileName = delivery.originalFileName || basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.sendFile(filePath);
    } else {
      // Text-based delivery - auto-generate .txt file
      const content = delivery.accountData;
      const fileName = `account-${deliveryId.slice(0, 8)}.txt`;

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(content);
    }
  }

  /**
   * Buyer confirms receipt of order (releases escrow early)
   * POST /orders/:orderId/confirm
   */
  @UseGuards(JwtAuthGuard)
  @Post(':orderId/confirm')
  async confirmOrder(@Param('orderId') orderId: string, @Request() req) {
    return this.ordersService.confirmOrder(orderId, req.user.id);
  }

  /**
   * Get releasable escrows (for cron job or manual check)
   * GET /orders/escrow/releasable
   */
  @UseGuards(JwtAuthGuard)
  @Get('escrow/releasable')
  async getReleasableEscrows() {
    return this.ordersService.getReleasableEscrows();
  }

  /**
   * Release escrow manually (admin or automated)
   * POST /orders/escrow/:escrowId/release
   */
  @UseGuards(JwtAuthGuard)
  @Post('escrow/:escrowId/release')
  async releaseEscrow(@Param('escrowId') escrowId: string) {
    return this.ordersService.releaseEscrow(escrowId);
  }

  /**
   * Submit review for order
   * POST /orders/:orderId/review
   */
  @UseGuards(JwtAuthGuard)
  @Post(':orderId/review')
  async submitReview(
    @Param('orderId') orderId: string,
    @Body() body: {
      rating: number;
      comment?: string;
      isAnonymous?: boolean;
    },
    @Request() req,
  ) {
    return this.ordersService.submitReview(orderId, req.user.id, body);
  }

  /**
   * Get review for order
   * GET /orders/:orderId/review
   */
  @UseGuards(JwtAuthGuard)
  @Get(':orderId/review')
  async getReview(@Param('orderId') orderId: string, @Request() req) {
    return this.ordersService.getOrderReview(orderId, req.user.id);
  }
}
