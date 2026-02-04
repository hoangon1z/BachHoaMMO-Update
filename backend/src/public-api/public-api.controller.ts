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
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiResponseInterceptor } from './interceptors/api-response.interceptor';
import { ApiSeller, ApiSellerInfo, SkipApiKey } from './decorators/api-key.decorator';
import { PublicApiService } from './public-api.service';
import { WebhookService, CreateWebhookDto, UpdateWebhookDto } from '../webhook/webhook.service';
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
  UpdateVariantDto,
  CreateVariantDto,
} from './dto';

@Controller('api/v1')
@UseGuards(ApiKeyGuard)
@UseInterceptors(ApiResponseInterceptor)
export class PublicApiController {
  constructor(
    private readonly publicApiService: PublicApiService,
    private readonly webhookService: WebhookService,
  ) {}

  // ==================== HEALTH CHECK ====================

  @Get('health')
  @SkipApiKey()
  health() {
    return {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        info: ['GET /me', 'GET /stats'],
        categories: ['GET /categories'],
        products: ['GET /products', 'POST /products', 'PUT /products/:id', 'DELETE /products/:id'],
        variants: ['GET /products/:id/variants', 'POST /products/:id/variants', 'PUT /products/:id/variants/:variantId', 'DELETE /products/:id/variants/:variantId'],
        inventory: ['GET /inventory', 'POST /inventory', 'DELETE /inventory/:id', 'DELETE /inventory'],
        orders: ['GET /orders', 'GET /orders/:id', 'POST /orders/:id/deliver'],
        webhooks: ['GET /webhooks', 'POST /webhooks', 'PUT /webhooks/:id', 'DELETE /webhooks/:id', 'POST /webhooks/:id/test'],
      },
    };
  }

  // ==================== SELLER INFO ====================

  @Get('me')
  async getMe(@ApiSeller() seller: ApiSellerInfo) {
    return this.publicApiService.getSellerInfo(seller.id);
  }

  @Get('stats')
  async getStats(@ApiSeller() seller: ApiSellerInfo) {
    return this.publicApiService.getStats(seller.id);
  }

  // ==================== CATEGORIES ====================

  @Get('categories')
  async getCategories() {
    return this.publicApiService.getCategories();
  }

  // ==================== INVENTORY ====================

  @Get('inventory')
  async getInventory(
    @ApiSeller() seller: ApiSellerInfo,
    @Query() query: GetInventoryQueryDto,
  ) {
    return this.publicApiService.getInventory(seller.id, query);
  }

  @Get('inventory/count')
  async getInventoryCount(
    @ApiSeller() seller: ApiSellerInfo,
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.publicApiService.getInventoryCount(seller.id, productId, variantId);
  }

  @Post('inventory')
  async addInventory(
    @ApiSeller() seller: ApiSellerInfo,
    @Body() dto: AddInventoryDto,
  ) {
    return this.publicApiService.addInventory(seller.id, dto);
  }

  @Delete('inventory/:id')
  @HttpCode(HttpStatus.OK)
  async deleteInventoryItem(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
  ) {
    return this.publicApiService.deleteInventoryItem(seller.id, id);
  }

  @Delete('inventory')
  @HttpCode(HttpStatus.OK)
  async deleteMultipleInventory(
    @ApiSeller() seller: ApiSellerInfo,
    @Body() dto: DeleteMultipleInventoryDto,
  ) {
    return this.publicApiService.deleteMultipleInventory(seller.id, dto);
  }

  // ==================== PRODUCTS ====================

  @Get('products')
  async getProducts(
    @ApiSeller() seller: ApiSellerInfo,
    @Query() query: GetProductsQueryDto,
  ) {
    return this.publicApiService.getProducts(seller.id, query);
  }

  @Get('products/:id')
  async getProduct(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
  ) {
    return this.publicApiService.getProduct(seller.id, id);
  }

  @Get('products/:id/inventory')
  async getProductInventory(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') productId: string,
    @Query() query: GetInventoryQueryDto,
  ) {
    return this.publicApiService.getInventory(seller.id, { ...query, productId });
  }

  @Post('products')
  async createProduct(
    @ApiSeller() seller: ApiSellerInfo,
    @Body() dto: CreateProductDto,
  ) {
    return this.publicApiService.createProduct(seller.id, dto);
  }

  @Put('products/:id')
  async updateProduct(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.publicApiService.updateProduct(seller.id, id, dto);
  }

  @Put('products/:id/stock')
  async updateProductStock(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.publicApiService.setProductStock(seller.id, id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
  ) {
    return this.publicApiService.deleteProduct(seller.id, id);
  }

  // ==================== VARIANTS ====================

  @Get('products/:id/variants')
  async getVariants(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') productId: string,
  ) {
    return this.publicApiService.getVariants(seller.id, productId);
  }

  @Post('products/:id/variants')
  async createVariant(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.publicApiService.createVariant(seller.id, productId, dto);
  }

  @Put('products/:id/variants/:variantId')
  async updateVariant(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.publicApiService.updateVariant(seller.id, productId, variantId, dto);
  }

  @Delete('products/:id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  async deleteVariant(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.publicApiService.deleteVariant(seller.id, productId, variantId);
  }

  // ==================== ORDERS ====================

  @Get('orders')
  async getOrders(
    @ApiSeller() seller: ApiSellerInfo,
    @Query() query: GetOrdersQueryDto,
  ) {
    return this.publicApiService.getOrders(seller.id, query);
  }

  @Get('orders/:id')
  async getOrder(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
  ) {
    return this.publicApiService.getOrder(seller.id, id);
  }

  @Post('orders/:id/deliver')
  async manualDeliver(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
    @Body() dto: ManualDeliverDto,
  ) {
    return this.publicApiService.manualDeliver(seller.id, id, dto);
  }

  // ==================== WEBHOOKS ====================

  @Get('webhooks/events')
  getWebhookEvents() {
    return this.webhookService.getAvailableEvents();
  }

  @Get('webhooks')
  async getWebhooks(@ApiSeller() seller: ApiSellerInfo) {
    return this.webhookService.getWebhooks(seller.id);
  }

  @Post('webhooks')
  async createWebhook(
    @ApiSeller() seller: ApiSellerInfo,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.createWebhook(seller.id, dto);
  }

  @Put('webhooks/:id')
  async updateWebhook(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.updateWebhook(seller.id, id, dto);
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.OK)
  async deleteWebhook(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
  ) {
    return this.webhookService.deleteWebhook(seller.id, id);
  }

  @Post('webhooks/:id/regenerate-secret')
  async regenerateWebhookSecret(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
  ) {
    return this.webhookService.regenerateSecret(seller.id, id);
  }

  @Post('webhooks/:id/test')
  async testWebhook(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
  ) {
    return this.webhookService.testWebhook(seller.id, id);
  }

  @Get('webhooks/:id/logs')
  async getWebhookLogs(
    @ApiSeller() seller: ApiSellerInfo,
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.webhookService.getWebhookLogs(seller.id, id, limit, offset);
  }
}
