import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Public } from '../security/decorators/security.decorators';

@Controller('public')
export class PublicController {
  constructor(private readonly adminService: AdminService) { }

  /**
   * Get active banners - Public endpoint (no auth required)
   * GET /public/banners
   */
  @Get('banners')
  @Public()
  async getActiveBanners() {
    return this.adminService.getActiveBanners();
  }

  /**
   * Get active category showcases - Public endpoint (no auth required)
   * GET /public/category-showcases
   */
  @Get('category-showcases')
  @Public()
  async getActiveCategoryShowcases() {
    return this.adminService.getActiveCategoryShowcases();
  }
}

