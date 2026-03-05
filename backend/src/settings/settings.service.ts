import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Default settings
const DEFAULT_SETTINGS = {
  // Auction settings
  auction_start_price: '100000',
  auction_min_increment: '10000',
  auction_start_hour: '8',    // 8 AM Vietnam time
  auction_start_minute: '0',
  auction_end_hour: '20',     // 8 PM Vietnam time
  auction_end_minute: '0',
  auction_cooldown_minutes: '10', // Gia hạn 10 phút khi có bid gần cuối (0 = tắt)
  auction_auto_create: 'true',    // Tự động tạo phiên hàng ngày

  // USDT deposit settings
  usdt_enabled: 'false',
  usdt_exchange_rate: '25000', // 1 USDT = 25,000 VND
  usdt_networks: '[]', // JSON array: [{network: "TRC20", address: "T..."}]

  // Social links
  social_facebook: '',
  social_telegram: 'https://t.me/bachhoammobot',
  social_zalo: '',
  social_zalo_display: '',

  // Announcement bar
  announcement_enabled: 'false',
  announcement_text: '',
  announcement_link: '',
  announcement_type: 'info',

  // Contact info
  contact_email: 'support@bachhoammo.store',
  contact_phone: '',
  contact_address: '',

  // Site info
  site_name: 'BachHoaMMO',
  site_description: 'Chợ MMO uy tín #1 Việt Nam',
  site_telegram_bot: '@bachhoammobot',

  // Footer links (JSON arrays)
  footer_quick_links: JSON.stringify([
    { label: 'Trang chủ', href: '/' },
    { label: 'Sản phẩm', href: '/explore' },
    { label: 'Đấu giá', href: '/auction' },
  ]),
  footer_policy_links: JSON.stringify([
    { label: 'Điều khoản', href: '/terms' },
    { label: 'Bảo mật', href: '/privacy' },
    { label: 'Đổi trả', href: '/refund-policy' },
    { label: 'Thanh toán', href: '/payment-guide' },
    { label: 'Mua hàng', href: '/shopping-guide' },
  ]),
  footer_description: 'Nền tảng mua bán tài khoản, dịch vụ game uy tín hàng đầu Việt Nam. Giao dịch an toàn, nhanh chóng và bảo mật.',
};

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) { }

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
      startHour: await this.getNumber('auction_start_hour'),
      startMinute: await this.getNumber('auction_start_minute'),
      endHour: await this.getNumber('auction_end_hour'),
      endMinute: await this.getNumber('auction_end_minute'),
      cooldownMinutes: await this.getNumber('auction_cooldown_minutes'),
      autoCreate: (await this.get('auction_auto_create')) === 'true',
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
        zaloDisplay: await this.get('social_zalo_display') || '',
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
      footer: {
        quickLinks: JSON.parse(await this.get('footer_quick_links') || '[]'),
        policyLinks: JSON.parse(await this.get('footer_policy_links') || '[]'),
        description: await this.get('footer_description') || '',
      },
      announcement: {
        enabled: (await this.get('announcement_enabled')) === 'true',
        text: await this.get('announcement_text') || '',
        link: await this.get('announcement_link') || '',
        type: await this.get('announcement_type') || 'info',
      },
    };
  }

  /**
   * Update site settings
   */
  async updateSiteSettings(settings: {
    social?: { facebook?: string; telegram?: string; zalo?: string; zaloDisplay?: string };
    contact?: { email?: string; phone?: string; address?: string };
    site?: { name?: string; description?: string; telegramBot?: string };
    announcement?: { enabled?: boolean; text?: string; link?: string; type?: string };
    footer?: { quickLinks?: { label: string; href: string }[]; policyLinks?: { label: string; href: string }[]; description?: string };
  }) {
    if (settings.social) {
      if (settings.social.facebook !== undefined) await this.set('social_facebook', settings.social.facebook);
      if (settings.social.telegram !== undefined) await this.set('social_telegram', settings.social.telegram);
      if (settings.social.zalo !== undefined) await this.set('social_zalo', settings.social.zalo);
      if (settings.social.zaloDisplay !== undefined) await this.set('social_zalo_display', settings.social.zaloDisplay);
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
    if (settings.footer) {
      if (settings.footer.quickLinks !== undefined) await this.set('footer_quick_links', JSON.stringify(settings.footer.quickLinks));
      if (settings.footer.policyLinks !== undefined) await this.set('footer_policy_links', JSON.stringify(settings.footer.policyLinks));
      if (settings.footer.description !== undefined) await this.set('footer_description', settings.footer.description);
    }
    if (settings.announcement) {
      if (settings.announcement.enabled !== undefined) await this.set('announcement_enabled', settings.announcement.enabled.toString());
      if (settings.announcement.text !== undefined) await this.set('announcement_text', settings.announcement.text);
      if (settings.announcement.link !== undefined) await this.set('announcement_link', settings.announcement.link);
      if (settings.announcement.type !== undefined) await this.set('announcement_type', settings.announcement.type);
    }
    return this.getSiteSettings();
  }

  /**
   * Get USDT deposit settings
   */
  async getUsdtSettings() {
    let networks: { network: string; address: string }[] = [];
    try {
      networks = JSON.parse(await this.get('usdt_networks') || '[]');
    } catch { networks = []; }

    return {
      enabled: (await this.get('usdt_enabled')) === 'true',
      exchangeRate: await this.getNumber('usdt_exchange_rate') || 25000,
      networks,
    };
  }
}
