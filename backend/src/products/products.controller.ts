import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../security/decorators/security.decorators';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) { }

  @Get()
  @Public()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    // Support both page/limit and skip/take
    // Priority: page/limit over skip/take
    let finalSkip: number | undefined;
    let finalTake: number | undefined;

    if (page) {
      const pageNum = parseInt(page) || 1;
      const limitNum = limit ? parseInt(limit) : 20;
      finalSkip = (pageNum - 1) * limitNum;
      finalTake = limitNum;
    } else {
      finalSkip = skip ? parseInt(skip) : undefined;
      finalTake = take ? parseInt(take) : undefined;
    }

    return this.productsService.findAll({
      skip: finalSkip,
      take: finalTake,
      categoryId,
      search,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
    });
  }

  @Get('featured')
  @Public()
  getFeatured() {
    return this.productsService.getFeatured();
  }

  @Get('latest')
  @Public()
  getLatest() {
    return this.productsService.getLatest();
  }

  /**
   * Get product by SEO-friendly slug
   * GET /products/slug/:slug
   */
  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // Track view when logged-in user views product
  @UseGuards(JwtAuthGuard)
  @Post(':id/view')
  trackView(@Param('id') id: string, @Request() req) {
    return this.productsService.trackView(id, req.user.id);
  }

  // Get product reviews
  @Get(':id/reviews')
  @Public()
  getReviews(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.productsService.getProductReviews(id, {
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 10,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() data: any, @Request() req) {
    return this.productsService.create({
      ...data,
      sellerId: req.user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  // Variant endpoints
  @UseGuards(JwtAuthGuard)
  @Post(':id/variants')
  addVariant(@Param('id') productId: string, @Body() data: any) {
    return this.productsService.addVariant(productId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/variants/:variantId')
  updateVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() data: any,
  ) {
    return this.productsService.updateVariant(variantId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/variants/:variantId')
  deleteVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.deleteVariant(variantId);
  }
}
