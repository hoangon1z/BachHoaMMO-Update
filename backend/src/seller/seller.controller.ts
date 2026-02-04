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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
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
  ManualDeliveryDto,
  ManualDeliveryBulkDto,
} from './dto/seller.dto';

// Ensure upload directory for shop logos exists
const shopLogoUploadDir = join(process.cwd(), 'uploads', 'shops');
if (!existsSync(shopLogoUploadDir)) {
  mkdirSync(shopLogoUploadDir, { recursive: true });
}

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

  @Post('store/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: shopLogoUploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `shop-logo-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = extname(file.originalname).toLowerCase().slice(1);
        const mimetype = file.mimetype.split('/')[1];
        
        if (allowedTypes.test(ext) && allowedTypes.test(mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'), false);
        }
      },
    }),
  )
  async uploadShopLogo(@Request() req, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh');
    }

    const logoUrl = `/uploads/shops/${file.filename}`;
    return this.sellerService.updateShopLogo(req.user.id, logoUrl);
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

  /**
   * Manual delivery - Seller giao tài khoản thủ công cho đơn hàng
   */
  @Post('orders/:id/deliver')
  async manualDeliver(
    @Request() req,
    @Param('id') orderId: string,
    @Body() dto: ManualDeliveryBulkDto,
  ) {
    return this.sellerService.manualDeliver(req.user.id, orderId, dto.deliveries);
  }

  /**
   * Manual delivery single item
   */
  @Post('orders/:orderId/items/:itemId/deliver')
  async manualDeliverItem(
    @Request() req,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ManualDeliveryDto,
  ) {
    return this.sellerService.manualDeliverItem(req.user.id, orderId, itemId, dto.accountData);
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

  // ==================== BANK INFORMATION ====================

  /**
   * Get seller's bank information
   */
  @Get('bank-info')
  async getBankInfo(@Request() req) {
    return this.sellerService.getBankInfo(req.user.id);
  }

  /**
   * Add bank information (can only be done once)
   */
  @Post('bank-info')
  async addBankInfo(
    @Request() req,
    @Body() dto: { bankName: string; bankAccount: string; bankHolder: string; bankBranch?: string },
  ) {
    return this.sellerService.addBankInfo(req.user.id, dto);
  }

  // ==================== WITHDRAWAL MANAGEMENT ====================

  /**
   * Get withdrawal fee preview
   * Shows current fee rate based on weekly withdrawal count
   */
  @Get('withdrawals/fee-preview')
  async getWithdrawalFeePreview(
    @Request() req,
    @Query('amount') amount: string,
  ) {
    const amountNum = amount ? parseInt(amount) : 0;
    const { feeRate, fee, freeWithdrawalsLeft } = await this.sellerService.calculateWithdrawalFee(req.user.id, amountNum);
    return {
      amount: amountNum,
      feeRate: feeRate * 100, // Return as percentage
      fee,
      netAmount: amountNum - fee,
      freeWithdrawalsLeftThisWeek: freeWithdrawalsLeft,
      message: freeWithdrawalsLeft > 0 
        ? `Bạn còn ${freeWithdrawalsLeft} lần rút tiền miễn phí trong tuần này` 
        : `Phí rút tiền: ${(feeRate * 100).toFixed(0)}%`,
    };
  }

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
    @Query('variantId') variantId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.sellerService.getProductInventory(req.user.id, productId, {
      status,
      variantId,
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
    return this.sellerService.uploadInventory(req.user.id, productId, dto.accountData, dto.variantId);
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
    return this.sellerService.addSingleInventory(req.user.id, productId, dto.accountData, dto.variantId);
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

  // ==================== API KEY MANAGEMENT ====================

  /**
   * Get seller's API keys
   */
  @Get('api-keys')
  async getApiKeys(@Request() req) {
    return this.sellerService.getApiKeys(req.user.id);
  }

  /**
   * Generate new API key
   */
  @Post('api-keys')
  async generateApiKey(
    @Request() req,
    @Body('name') name?: string,
  ) {
    return this.sellerService.generateApiKey(req.user.id, name);
  }

  /**
   * Revoke (delete) an API key
   */
  @Delete('api-keys/:id')
  async revokeApiKey(
    @Request() req,
    @Param('id') apiKeyId: string,
  ) {
    return this.sellerService.revokeApiKey(req.user.id, apiKeyId);
  }

  /**
   * Toggle API key active status
   */
  @Put('api-keys/:id/toggle')
  async toggleApiKeyStatus(
    @Request() req,
    @Param('id') apiKeyId: string,
  ) {
    return this.sellerService.toggleApiKeyStatus(req.user.id, apiKeyId);
  }

  /**
   * Regenerate API key secret
   */
  @Post('api-keys/:id/regenerate')
  async regenerateApiKeySecret(
    @Request() req,
    @Param('id') apiKeyId: string,
  ) {
    return this.sellerService.regenerateApiKeySecret(req.user.id, apiKeyId);
  }
}
