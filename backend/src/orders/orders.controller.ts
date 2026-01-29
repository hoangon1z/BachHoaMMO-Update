import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  /**
   * Create order
   * POST /orders/create
   * Body: { items: [{ productId, quantity, price }], total: number }
   */
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createOrder(
    @Body() body: {
      items: Array<{ productId: string; quantity: number; price: number }>;
      total: number;
    },
    @Request() req,
  ) {
    const buyerId = req.user.id;
    return this.ordersService.createOrder(buyerId, body.items, body.total);
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
}
