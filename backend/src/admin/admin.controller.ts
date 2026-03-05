import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import sharp from 'sharp';
import * as fs from 'fs';
import { AdminService } from './admin.service';
import { BlogService } from '../blog/blog.service';
import { TelegramService } from '../telegram/telegram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private blogService: BlogService,
    private telegramService: TelegramService,
  ) { }

  /**
   * Get dashboard statistics
   * GET /admin/dashboard
   */
  @Get('dashboard')
  async getDashboard(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getDashboardStats();
  }

  /**
   * Get pending recharge requests
   * GET /admin/recharges/pending
   */
  @Get('recharges/pending')
  async getPendingRecharges(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getPendingRecharges();
  }

  /**
   * Approve recharge request
   * POST /admin/recharges/:id/approve
   */
  @Post('recharges/:id/approve')
  async approveRecharge(@Param('id') id: string, @Request() req) {
    return this.adminService.approveRecharge(id, req.user.id);
  }

  /**
   * Reject recharge request
   * POST /admin/recharges/:id/reject
   */
  @Post('recharges/:id/reject')
  async rejectRecharge(@Param('id') id: string, @Request() req) {
    return this.adminService.rejectRecharge(id, req.user.id);
  }

  /**
   * Get all transactions
   * GET /admin/transactions?type=DEPOSIT&status=PENDING&limit=50&offset=0
   */
  @Get('transactions')
  async getAllTransactions(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Request() req?,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getAllTransactions({
      type,
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search: search || undefined,
    });
  }

  /**
   * Get all escrows
   * GET /admin/escrows?status=HOLDING
   */
  @Get('escrows')
  async getAllEscrows(@Query('status') status?: string, @Request() req?) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getAllEscrows(status);
  }

  /**
   * Get releasable escrows
   * GET /admin/escrows/releasable
   */
  @Get('escrows/releasable')
  async getReleasableEscrows(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getReleasableEscrows();
  }

  /**
   * Release escrow manually
   * POST /admin/escrows/:id/release
   */
  @Post('escrows/:id/release')
  async releaseEscrow(@Param('id') id: string, @Request() req) {
    return this.adminService.releaseEscrow(id, req.user.id);
  }

  /**
   * Get all users
   * GET /admin/users?role=BUYER&limit=50&offset=0
   */
  @Get('users')
  async getAllUsers(
    @Query('role') role?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('isSeller') isSeller?: string,
    @Query('search') search?: string,
    @Request() req?,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getAllUsers({
      role,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      isSeller: isSeller !== undefined ? isSeller === 'true' : undefined,
      search: search || undefined,
    });
  }

  /**
   * Get user detail by ID (includes password hash for admin)
   * GET /admin/users/:id
   */
  @Get('users/:id')
  async getUserDetail(@Param('id') id: string, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getUserDetail(id);
  }

  /**
   * Update user information and permissions
   * PUT /admin/users/:id
   */
  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      isSeller?: boolean;
      balance?: number;
      phone?: string;
      address?: string;
    },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updateUser(id, body);
  }

  /**
   * Reset user password
   * POST /admin/users/:id/reset-password
   */
  @Post('users/:id/reset-password')
  async resetUserPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.resetUserPassword(id, newPassword);
  }

  /**
   * Ban a user
   * POST /admin/users/:id/ban
   */
  @Post('users/:id/ban')
  async banUser(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.banUser(id, reason || 'Vi phạm quy định');
  }

  /**
   * Unban a user
   * POST /admin/users/:id/unban
   */
  @Post('users/:id/unban')
  async unbanUser(
    @Param('id') id: string,
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.unbanUser(id);
  }

  /**
   * Get all orders
   * GET /admin/orders?status=PENDING&limit=50&offset=0
   */
  @Get('orders')
  async getAllOrders(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Request() req?,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getAllOrders({
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search: search || undefined,
    });
  }

  /**
   * Refund order (admin only)
   * POST /admin/orders/:id/refund
   * Body: { reason?: string }
   */
  @Post('orders/:id/refund')
  async refundOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    return this.adminService.refundOrder(id, req.user.id, body.reason);
  }

  // ==================== FILE UPLOAD ====================

  @Post('upload/banner')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/banners',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `banner-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadBannerImage(@UploadedFile() file: any, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);

    if (!file) {
      return { success: false, message: 'No file uploaded' };
    }

    try {
      // Auto resize banner image
      const BANNER_MAX_WIDTH = 1200;
      const BANNER_QUALITY = 85;

      const originalPath = file.path;
      const fileNameWithoutExt = file.filename.replace(/\.[^.]+$/, '');
      const outputFileName = `${fileNameWithoutExt}-optimized.webp`;
      const outputPath = join('./uploads/banners', outputFileName);

      // Get image metadata
      const metadata = await sharp(originalPath).metadata();

      // Resize if width > max, keep aspect ratio
      let sharpInstance = sharp(originalPath);

      if (metadata.width && metadata.width > BANNER_MAX_WIDTH) {
        sharpInstance = sharpInstance.resize(BANNER_MAX_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to WebP for better compression
      await sharpInstance
        .webp({ quality: BANNER_QUALITY })
        .toFile(outputPath);

      // Delete original file
      fs.unlinkSync(originalPath);

      return {
        success: true,
        url: `/uploads/banners/${outputFileName}`,
        filename: outputFileName,
        originalWidth: metadata.width,
        originalHeight: metadata.height,
      };
    } catch (error) {
      console.error('Error processing banner image:', error);
      // If processing fails, return original file
      return {
        success: true,
        url: `/uploads/banners/${file.filename}`,
        filename: file.filename,
        warning: 'Image optimization failed, using original',
      };
    }
  }

  // ==================== BANNER MANAGEMENT ====================

  @Get('banners/active')
  async getActiveBanners() {
    // Public endpoint - no auth required
    return this.adminService.getActiveBanners();
  }

  @Get('banners')
  async getBanners(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getBanners();
  }

  @Post('banners')
  async createBanner(@Body() body: any, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.createBanner(body);
  }

  @Put('banners/:id')
  async updateBanner(@Param('id') id: string, @Body() body: any, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updateBanner(id, body);
  }

  @Delete('banners/:id')
  async deleteBanner(@Param('id') id: string, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.deleteBanner(id);
  }

  // ==================== CATEGORY SHOWCASE MANAGEMENT ====================

  @Get('category-showcases/active')
  async getActiveCategoryShowcases() {
    // Public endpoint - no auth required
    return this.adminService.getActiveCategoryShowcases();
  }

  @Get('category-showcases')
  async getCategoryShowcases(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getCategoryShowcases();
  }

  @Post('category-showcases')
  async createCategoryShowcase(@Body() body: any, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.createCategoryShowcase(body);
  }

  @Put('category-showcases/:id')
  async updateCategoryShowcase(@Param('id') id: string, @Body() body: any, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updateCategoryShowcase(id, body);
  }

  @Delete('category-showcases/:id')
  async deleteCategoryShowcase(@Param('id') id: string, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.deleteCategoryShowcase(id);
  }

  @Post('upload/showcase')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/showcases',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `showcase-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadShowcaseImage(@UploadedFile() file: any, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    if (!file) {
      return { success: false, message: 'No file uploaded' };
    }
    try {
      const originalPath = file.path;
      const fileNameWithoutExt = file.filename.replace(/\.[^.]+$/, '');
      const outputFileName = `${fileNameWithoutExt}-optimized.webp`;
      const outputPath = join('./uploads/showcases', outputFileName);

      await sharp(originalPath)
        .resize(568, 296, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(outputPath);

      fs.unlinkSync(originalPath);

      return {
        success: true,
        url: `/uploads/showcases/${outputFileName}`,
        filename: outputFileName,
      };
    } catch (error) {
      console.error('Error processing showcase image:', error);
      return {
        success: true,
        url: `/uploads/showcases/${file.filename}`,
        filename: file.filename,
        warning: 'Image optimization failed, using original',
      };
    }
  }

  // ==================== CATEGORY MANAGEMENT ====================

  @Get('categories')
  async getCategories(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getCategories();
  }

  @Post('categories')
  async createCategory(@Body() body: any, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.createCategory(body);
  }

  @Put('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() body: any, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.deleteCategory(id);
  }

  // ==================== PRODUCT MANAGEMENT ====================

  @Get('products')
  async getProducts(
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getProducts({
      status,
      categoryId,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Put('products/:id/status')
  async updateProductStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updateProductStatus(id, status);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.deleteProduct(id);
  }

  /**
   * Update product statistics (sales, rating)
   * PUT /admin/products/:id/stats
   */
  @Put('products/:id/stats')
  async updateProductStats(
    @Param('id') id: string,
    @Body() body: { sales?: number; rating?: number },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updateProductStats(id, body);
  }

  // ==================== SELLER MANAGEMENT ====================

  @Get('sellers')
  async getSellers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Request() req?,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getSellers({
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search: search || undefined,
    });
  }

  @Put('sellers/:id/status')
  async updateSellerStatus(
    @Param('id') id: string,
    @Body() body: { isSeller?: boolean; role?: string },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updateSellerStatus(id, body);
  }

  /**
   * Verify/Unverify seller (legacy - kept for compatibility)
   * POST /admin/sellers/:id/verify
   */
  @Post('sellers/:id/verify')
  async verifySeller(
    @Param('id') id: string,
    @Body() body: { isVerified: boolean },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.verifySeller(id, body.isVerified);
  }

  /**
   * Revoke ALL old verify badges (transition to insurance system)
   * POST /admin/sellers/revoke-all-badges
   */
  @Post('sellers/revoke-all-badges')
  async revokeAllBadges(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.revokeAllVerifyBadges();
  }

  // ==================== INSURANCE MANAGEMENT ====================

  /**
   * Get all insurance funds with seller details
   * GET /admin/insurance
   */
  @Get('insurance')
  async getInsuranceFunds(
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Request() req?,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getInsuranceFunds({
      status, tier,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search,
    });
  }

  /**
   * Get insurance fund detail for a specific seller
   * GET /admin/insurance/:sellerId
   */
  @Get('insurance/:sellerId')
  async getSellerInsuranceDetail(
    @Param('sellerId') sellerId: string,
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getSellerInsuranceDetail(sellerId);
  }

  /**
   * Confiscate/seize insurance fund (for serious violations)
   * POST /admin/insurance/:fundId/confiscate
   */
  @Post('insurance/:fundId/confiscate')
  async confiscateInsuranceFund(
    @Param('fundId') fundId: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.confiscateInsuranceFund(fundId, body.reason, req.user.id);
  }

  /**
   * Adjust insurance fund balance (dispute deduction or top-up)
   * POST /admin/insurance/:fundId/adjust
   */
  @Post('insurance/:fundId/adjust')
  async adjustInsuranceFund(
    @Param('fundId') fundId: string,
    @Body() body: { amount: number; reason: string; type: 'DEDUCT' | 'TOPUP' },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.adjustInsuranceFund(fundId, body.amount, body.reason, body.type, req.user.id);
  }

  /**
   * Admin set insurance tier for a seller (free, no deposit required)
   * POST /admin/insurance/set-tier
   * Body: { sellerId: string, tier: string | null }
   */
  @Post('insurance/set-tier')
  async setSellerInsuranceTier(
    @Body() body: { sellerId: string; tier: string | null },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.setSellerInsuranceTier(body.sellerId, body.tier, req.user.id);
  }

  // ==================== WITHDRAWAL MANAGEMENT ====================

  /**
   * Get all withdrawal requests
   * GET /admin/withdrawals?status=PENDING&limit=50&offset=0
   */
  @Get('withdrawals')
  async getWithdrawals(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Request() req?,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getWithdrawals({
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search: search || undefined,
    });
  }

  /**
   * Get pending withdrawals count for dashboard
   * GET /admin/withdrawals/pending-count
   */
  @Get('withdrawals/pending-count')
  async getPendingWithdrawalsCount(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getPendingWithdrawalsCount();
  }

  /**
   * Approve withdrawal request
   * POST /admin/withdrawals/:id/approve
   */
  @Post('withdrawals/:id/approve')
  async approveWithdrawal(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.approveWithdrawal(id, req.user.id, body.note);
  }

  /**
   * Reject withdrawal request
   * POST /admin/withdrawals/:id/reject
   */
  @Post('withdrawals/:id/reject')
  async rejectWithdrawal(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.rejectWithdrawal(id, req.user.id, body.reason);
  }

  // ==================== SELLER APPLICATIONS ====================

  /**
   * Get seller applications
   * GET /admin/seller-applications
   */
  @Get('seller-applications')
  async getSellerApplications(
    @Request() req,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getSellerApplications({
      status,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
      search: search || undefined,
    });
  }

  /**
   * Get pending seller applications count
   * GET /admin/seller-applications/pending-count
   */
  @Get('seller-applications/pending-count')
  async getPendingSellerApplicationsCount(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getPendingSellerApplicationsCount();
  }

  /**
   * Approve seller application
   * POST /admin/seller-applications/:id/approve
   */
  @Post('seller-applications/:id/approve')
  async approveSellerApplication(
    @Param('id') id: string,
    @Body() body: { note?: string },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.approveSellerApplication(id, req.user.id, body.note);
  }

  /**
   * Reject seller application
   * POST /admin/seller-applications/:id/reject
   */
  @Post('seller-applications/:id/reject')
  async rejectSellerApplication(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.rejectSellerApplication(id, req.user.id, body.reason);
  }

  // ==================== BLOG MANAGEMENT ====================

  /**
   * Get all blog posts (admin)
   * GET /admin/blogs?status=DRAFT&search=keyword&page=1&limit=20
   */
  @Get('blogs')
  async getAllBlogs(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.blogService.getAllPostsAdmin({
      status,
      search,
      page,
      limit,
    });
  }

  /**
   * Update blog post status (admin)
   * PUT /admin/blogs/:id/status
   */
  @Put('blogs/:id/status')
  async updateBlogStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.blogService.updatePostStatusAdmin(id, status);
  }

  /**
   * Delete blog post (admin)
   * DELETE /admin/blogs/:id
   */
  @Delete('blogs/:id')
  async deleteBlog(@Param('id') id: string, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.blogService.deletePostAdmin(id);
  }

  // ==================== TELEGRAM DEPOSIT NOTIFICATION MANAGEMENT ====================

  /**
   * Get all Telegram deposit notification recipients
   * GET /admin/telegram/deposit-recipients
   */
  @Get('telegram/deposit-recipients')
  async getDepositRecipients(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    const recipients = await this.telegramService.getDepositRecipients();
    return {
      success: true,
      recipients,
      maxRecipients: 5,
      currentCount: recipients.length,
    };
  }

  /**
   * Add a Telegram deposit notification recipient
   * POST /admin/telegram/deposit-recipients
   * Body: { telegramId: string, name?: string }
   */
  @Post('telegram/deposit-recipients')
  async addDepositRecipient(
    @Body() body: { telegramId: string; name?: string },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);

    if (!body.telegramId) {
      return { success: false, message: 'Telegram ID là bắt buộc' };
    }

    return this.telegramService.addDepositRecipient(body.telegramId, body.name);
  }

  /**
   * Update a Telegram deposit notification recipient
   * PUT /admin/telegram/deposit-recipients/:id
   * Body: { name?: string, isActive?: boolean }
   */
  @Put('telegram/deposit-recipients/:id')
  async updateDepositRecipient(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
    @Request() req,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.telegramService.updateDepositRecipient(id, body);
  }

  /**
   * Remove a Telegram deposit notification recipient
   * DELETE /admin/telegram/deposit-recipients/:id
   */
  @Delete('telegram/deposit-recipients/:id')
  async removeDepositRecipient(@Param('id') id: string, @Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.telegramService.removeDepositRecipient(id);
  }

  /**
   * Test deposit notification (sends test message to channel and all recipients)
   * POST /admin/telegram/deposit-test
   */
  @Post('telegram/deposit-test')
  async testDepositNotification(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.telegramService.testDepositNotification();
  }
}

