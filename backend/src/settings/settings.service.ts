import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Default settings
const DEFAULT_SETTINGS = {
  auction_start_price: '100000',
  auction_min_increment: '10000',
  auction_end_day: '0', // 0 = Sunday
  auction_end_hour: '19', // 7 PM
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
}
