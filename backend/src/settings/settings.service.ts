import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Default settings
const DEFAULT_SETTINGS = {
  // Auction settings
  auction_start_price: '100000',
  auction_min_increment: '10000',
  auction_end_day: '0', // 0 = Sunday
  auction_end_hour: '19', // 7 PM
  
  // Social links
  social_facebook: '',
  social_telegram: 'https://t.me/bachhoammobot',
  social_zalo: '',
  
  // Contact info
  contact_email: 'support@bachhoammo.store',
  contact_phone: '',
  contact_address: '',
  
  // Site info
  site_name: 'BachHoaMMO',
  site_description: 'Chợ MMO uy tín #1 Việt Nam',
  site_telegram_bot: '@bachhoammobot',
};

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Initialize default settings if not exists
    await this.initializeDefaultSettings();
  }

  private async initializeDefaultSettings() {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await this.prisma.systemSettings.findUnique({
        where: { key },
      });
      
      if (!existing) {
        await this.prisma.systemSettings.create({
          data: { key, value },
        });
      }
    }
  }

  /**
   * Get a single setting by key
   */
  async get(key: string): Promise<string | null> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key },
    });
    return setting?.value ?? DEFAULT_SETTINGS[key] ?? null;
  }

  /**
   * Get a setting as number
   */
  async getNumber(key: string): Promise<number> {
    const value = await this.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Set a setting value
   */
  async set(key: string, value: string): Promise<void> {
    await this.prisma.systemSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  /**
   * Get all settings
   */
  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.systemSettings.findMany();
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    
    return result;
  }

  /**
   * Update multiple settings at once
   */
  async updateMany(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key, value);
    }
  }

  /**
   * Get auction settings
   */
  async getAuctionSettings() {
    return {
      startPrice: await this.getNumber('auction_start_price'),
      minIncrement: await this.getNumber('auction_min_increment'),
      endDay: await this.getNumber('auction_end_day'),
      endHour: await this.getNumber('auction_end_hour'),
    };
  }

  /**
   * Get site settings (social links, contact info)
   */
  async getSiteSettings() {
    return {
      social: {
        facebook: await this.get('social_facebook') || '',
        telegram: await this.get('social_telegram') || '',
        zalo: await this.get('social_zalo') || '',
      },
      contact: {
        email: await this.get('contact_email') || '',
        phone: await this.get('contact_phone') || '',
        address: await this.get('contact_address') || '',
      },
      site: {
        name: await this.get('site_name') || 'BachHoaMMO',
        description: await this.get('site_description') || '',
        telegramBot: await this.get('site_telegram_bot') || '',
      },
    };
  }

  /**
   * Update site settings
   */
  async updateSiteSettings(settings: {
    social?: { facebook?: string; telegram?: string; zalo?: string };
    contact?: { email?: string; phone?: string; address?: string };
    site?: { name?: string; description?: string; telegramBot?: string };
  }) {
    if (settings.social) {
      if (settings.social.facebook !== undefined) await this.set('social_facebook', settings.social.facebook);
      if (settings.social.telegram !== undefined) await this.set('social_telegram', settings.social.telegram);
      if (settings.social.zalo !== undefined) await this.set('social_zalo', settings.social.zalo);
    }
    if (settings.contact) {
      if (settings.contact.email !== undefined) await this.set('contact_email', settings.contact.email);
      if (settings.contact.phone !== undefined) await this.set('contact_phone', settings.contact.phone);
      if (settings.contact.address !== undefined) await this.set('contact_address', settings.contact.address);
    }
    if (settings.site) {
      if (settings.site.name !== undefined) await this.set('site_name', settings.site.name);
      if (settings.site.description !== undefined) await this.set('site_description', settings.site.description);
      if (settings.site.telegramBot !== undefined) await this.set('site_telegram_bot', settings.site.telegramBot);
    }
    return this.getSiteSettings();
  }
}
