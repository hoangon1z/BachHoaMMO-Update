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
} from './dto';

@Controller('api/v1')
@UseGuards(ApiKeyGuard)
@UseInterceptors(ApiResponseInterceptor)
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  // ==================== HEALTH CHECK ====================

  @Get('health')
  @SkipApiKey()
  health() {
    return {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
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

  // ==================== INVENTORY ====================

  @Get('inventory')
  async getInventory(
    @ApiSeller() seller: ApiSellerInfo,
    @Query() query: GetInventoryQueryDto,
  ) {
    return this.publicApiService.getInventory(seller.id, query);
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
}
