import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { DiscountCodesService } from './discount-codes.service';
import { CreateDiscountCodeDto, UpdateDiscountCodeDto, ValidateDiscountCodeDto } from './dto/discount-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('discount-codes')
export class DiscountCodesController {
  constructor(private readonly discountCodesService: DiscountCodesService) {}

  // ─── Seller: tạo mã giảm giá ───────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() dto: CreateDiscountCodeDto) {
    const user = req.user;
    const sellerId = user.id || user.userId;
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return { success: false, message: 'Chỉ seller mới có thể tạo mã giảm giá' };
    }
    const result = await this.discountCodesService.create(sellerId, dto);
    return { success: true, data: result };
  }

  // ─── Seller: danh sách mã của mình ─────────────────────────────
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyCodes(@Request() req: any) {
    const user = req.user;
    const sellerId = user.id || user.userId;
    const result = await this.discountCodesService.findAllBySeller(sellerId);
    return { success: true, data: result };
  }

  // ─── Buyer/Seller: validate mã giảm giá ────────────────────────
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validate(@Request() req: any, @Body() dto: ValidateDiscountCodeDto) {
    const user = req.user;
    const buyerId = user.id || user.userId;
    const { discountCode, discountAmount } = await this.discountCodesService.validateAndCalculate(
      dto.code,
      dto.orderTotal,
      dto.sellerId,
      buyerId,
      dto.productId,
    );
    return {
      success: true,
      data: {
        code: discountCode.code,
        type: discountCode.type,
        value: discountCode.value,
        discountAmount,
        description: discountCode.description,
      },
    };
  }

  // ─── Seller: cập nhật mã ───────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDiscountCodeDto,
  ) {
    const user = req.user;
    const sellerId = user.id || user.userId;
    const result = await this.discountCodesService.update(id, sellerId, dto);
    return { success: true, data: result };
  }

  // ─── Seller: xóa mã ────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Request() req: any, @Param('id') id: string) {
    const user = req.user;
    const sellerId = user.id || user.userId;
    const result = await this.discountCodesService.remove(id, sellerId);
    return { success: true, data: result };
  }

  // ─── Admin: tất cả mã ──────────────────────────────────────────
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const user = req.user;
    if (user.role !== 'ADMIN') {
      return { success: false, message: 'Không có quyền truy cập' };
    }
    const result = await this.discountCodesService.findAll(+page, +limit);
    return { success: true, ...result };
  }
}
