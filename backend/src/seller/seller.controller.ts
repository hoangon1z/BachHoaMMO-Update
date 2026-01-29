import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SellerService } from './seller.service';
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
  UploadInventoryDto,
  AddSingleInventoryDto,
  UpdateInventoryDto,
} from './dto/seller.dto';

@Controller('seller')
@UseGuards(JwtAuthGuard)
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  // ==================== STORE MANAGEMENT ====================

  @Post('store')
  async createStore(@Request() req, @Body() dto: CreateStoreDto) {
    return this.sellerService.createStore(req.user.id, dto);
  }

  @Get('store')
  async getStore(@Request() req) {
    return this.sellerService.getStore(req.user.id);
  }

  @Put('store')
  async updateStore(@Request() req, @Body() dto: UpdateStoreDto) {
    return this.sellerService.updateStore(req.user.id, dto);
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  async getDashboard(@Request() req) {
    return this.sellerService.getDashboard(req.user.id);
  }

  @Get('dashboard/revenue-chart')
  async getRevenueChart(
    @Request() req,
    @Query('days') days?: string,
  ) {
    return this.sellerService.getRevenueChart(req.user.id, days ? parseInt(days) : 30);
  }

  // ==================== PRODUCT/INVENTORY MANAGEMENT ====================

  @Post('products')
  async createProduct(@Request() req, @Body() dto: CreateProductDto) {
    return this.sellerService.createProduct(req.user.id, dto);
  }

  @Get('products')
  async getProducts(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.sellerService.getProducts(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
    );
  }

  @Get('products/:id')
  async getProduct(@Request() req, @Param('id') id: string) {
    return this.sellerService.getProduct(req.user.id, id);
  }

  @Put('products/:id')
  async updateProduct(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.sellerService.updateProduct(req.user.id, id, dto);
  }

  @Put('products/:id/stock')
  async updateStock(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.sellerService.updateStock(req.user.id, id, dto);
  }

  @Delete('products/:id')
  async deleteProduct(@Request() req, @Param('id') id: string) {
    return this.sellerService.deleteProduct(req.user.id, id);
  }

  // ==================== ORDER MANAGEMENT ====================

  @Get('orders')
  async getOrders(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.sellerService.getOrders(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
    );
  }

  @Get('orders/:id')
  async getOrder(@Request() req, @Param('id') id: string) {
    return this.sellerService.getOrder(req.user.id, id);
  }

  @Put('orders/:id/status')
  async updateOrderStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.sellerService.updateOrderStatus(req.user.id, id, dto);
  }

  // ==================== COMPLAINT MANAGEMENT ====================

  @Get('complaints')
  async getComplaints(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.sellerService.getComplaints(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
    );
  }

  @Get('complaints/:id')
  async getComplaint(@Request() req, @Param('id') id: string) {
    return this.sellerService.getComplaint(req.user.id, id);
  }

  @Put('complaints/:id')
  async updateComplaint(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    return this.sellerService.updateComplaint(req.user.id, id, dto);
  }

  @Post('complaints/:id/messages')
  async sendComplaintMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SendComplaintMessageDto,
  ) {
    return this.sellerService.sendComplaintMessage(req.user.id, id, dto);
  }

  // ==================== WITHDRAWAL MANAGEMENT ====================

  @Post('withdrawals')
  async createWithdrawal(@Request() req, @Body() dto: CreateWithdrawalDto) {
    return this.sellerService.createWithdrawal(req.user.id, dto);
  }

  @Get('withdrawals')
  async getWithdrawals(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.sellerService.getWithdrawals(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
    );
  }

  @Delete('withdrawals/:id')
  async cancelWithdrawal(@Request() req, @Param('id') id: string) {
    return this.sellerService.cancelWithdrawal(req.user.id, id);
  }

  // ==================== INVENTORY MANAGEMENT ====================

  /**
   * Get account templates list
   */
  @Get('templates')
  async getAccountTemplates() {
    return this.sellerService.getAccountTemplates();
  }

  /**
   * Get inventory for a product
   */
  @Get('products/:id/inventory')
  async getProductInventory(
    @Request() req,
    @Param('id') productId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.sellerService.getProductInventory(req.user.id, productId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  /**
   * Upload multiple accounts (bulk upload from text)
   */
  @Post('products/:id/inventory/upload')
  async uploadInventory(
    @Request() req,
    @Param('id') productId: string,
    @Body() dto: UploadInventoryDto,
  ) {
    return this.sellerService.uploadInventory(req.user.id, productId, dto.accountData);
  }

  /**
   * Add single account to inventory
   */
  @Post('products/:id/inventory')
  async addSingleInventory(
    @Request() req,
    @Param('id') productId: string,
    @Body() dto: AddSingleInventoryDto,
  ) {
    return this.sellerService.addSingleInventory(req.user.id, productId, dto.accountData);
  }

  /**
   * Update inventory item
   */
  @Put('inventory/:inventoryId')
  async updateInventoryItem(
    @Request() req,
    @Param('inventoryId') inventoryId: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.sellerService.updateInventoryItem(req.user.id, inventoryId, dto);
  }

  /**
   * Delete single inventory item
   */
  @Delete('inventory/:inventoryId')
  async deleteInventoryItem(
    @Request() req,
    @Param('inventoryId') inventoryId: string,
  ) {
    return this.sellerService.deleteInventoryItem(req.user.id, inventoryId);
  }

  /**
   * Delete multiple inventory items
   */
  @Delete('products/:id/inventory')
  async deleteMultipleInventory(
    @Request() req,
    @Param('id') productId: string,
    @Body('inventoryIds') inventoryIds: string[],
  ) {
    return this.sellerService.deleteMultipleInventory(req.user.id, productId, inventoryIds);
  }
}
