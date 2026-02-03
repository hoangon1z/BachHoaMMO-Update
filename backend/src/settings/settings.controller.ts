import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../security/decorators/security.decorators';

// Public controller for site settings (no auth required)
@Controller('settings')
@Public()
export class PublicSettingsController {
  constructor(private settingsService: SettingsService) {}

  /**
   * Get public site settings (social links, contact info)
   * GET /settings/site
   */
  @Get('site')
  async getSiteSettings() {
    const settings = await this.settingsService.getSiteSettings();
    return { success: true, settings };
  }
}

@Controller('admin/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  /**
   * Get all settings
   * GET /admin/settings
   */
  @Get()
  async getAll() {
    const settings = await this.settingsService.getAll();
    return { success: true, settings };
  }

  /**
   * Get auction settings
   * GET /admin/settings/auction
   */
  @Get('auction')
  async getAuctionSettings() {
    const settings = await this.settingsService.getAuctionSettings();
    return { success: true, settings };
  }

  /**
   * Update settings
   * PUT /admin/settings
   */
  @Put()
  async updateSettings(@Body() body: Record<string, string>) {
    await this.settingsService.updateMany(body);
    const settings = await this.settingsService.getAll();
    return { success: true, settings };
  }

  /**
   * Update auction settings
   * PUT /admin/settings/auction
   */
  @Put('auction')
  async updateAuctionSettings(
    @Body() body: {
      startPrice?: number;
      minIncrement?: number;
      endDay?: number;
      endHour?: number;
    },
  ) {
    const updates: Record<string, string> = {};
    
    if (body.startPrice !== undefined) {
      updates['auction_start_price'] = body.startPrice.toString();
    }
    if (body.minIncrement !== undefined) {
      updates['auction_min_increment'] = body.minIncrement.toString();
    }
    if (body.endDay !== undefined) {
      updates['auction_end_day'] = body.endDay.toString();
    }
    if (body.endHour !== undefined) {
      updates['auction_end_hour'] = body.endHour.toString();
    }
    
    await this.settingsService.updateMany(updates);
    const settings = await this.settingsService.getAuctionSettings();
    return { success: true, settings };
  }

  /**
   * Get site settings (social links, contact info)
   * GET /admin/settings/site
   */
  @Get('site')
  async getSiteSettings() {
    const settings = await this.settingsService.getSiteSettings();
    return { success: true, settings };
  }

  /**
   * Update site settings
   * PUT /admin/settings/site
   */
  @Put('site')
  async updateSiteSettings(
    @Body() body: {
      social?: { facebook?: string; telegram?: string; zalo?: string };
      contact?: { email?: string; phone?: string; address?: string };
      site?: { name?: string; description?: string; telegramBot?: string };
    },
  ) {
    const settings = await this.settingsService.updateSiteSettings(body);
    return { success: true, settings };
  }
}
