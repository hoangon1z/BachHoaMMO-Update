import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SeoService } from './seo.service';

/**
 * SEO Cron Service - Tự động hóa việc lập chỉ mục
 * 
 * Chạy các tác vụ SEO tự động:
 * 1. Mỗi ngày lúc 3:00 AM: Reindex content mới/updated trong 24h qua
 * 2. Mỗi 6 tiếng: Ping Google sitemap
 * 3. Mỗi tuần (Chủ nhật 4:00 AM): Reindex toàn bộ URL
 */
@Injectable()
export class SeoCronService {
    private readonly logger = new Logger(SeoCronService.name);

    constructor(private readonly seoService: SeoService) {
        this.logger.log('✅ SEO Cron Service initialized');
    }

    /**
     * Chạy mỗi ngày lúc 3:00 AM (UTC+7 = 20:00 UTC ngày trước)
     * Tự động reindex content mới/updated trong 24h qua
     */
    @Cron('0 3 * * *', { name: 'daily-reindex', timeZone: 'Asia/Ho_Chi_Minh' })
    async handleDailyReindex() {
        this.logger.log('🔄 [CRON] Daily auto-reindex started...');

        try {
            const result = await this.seoService.autoReindexNewContent();
            this.logger.log(`✅ [CRON] Daily reindex completed: ${result.reindexed} URLs reindexed`);
        } catch (error) {
            this.logger.error(`❌ [CRON] Daily reindex failed:`, error.message);
        }
    }

    /**
     * Chạy mỗi 6 tiếng: Ping Google để re-crawl sitemap
     * Đảm bảo Google luôn biết về sitemap mới nhất
     */
    @Cron('0 */6 * * *', { name: 'sitemap-ping', timeZone: 'Asia/Ho_Chi_Minh' })
    async handleSitemapPing() {
        this.logger.log('📡 [CRON] Pinging Google about sitemap...');

        try {
            const result = await this.seoService.pingSitemapToGoogle();
            this.logger.log(`✅ [CRON] Sitemap ping: ${result.message}`);
        } catch (error) {
            this.logger.error(`❌ [CRON] Sitemap ping failed:`, error.message);
        }
    }

    /**
     * Chạy mỗi Chủ nhật lúc 4:00 AM
     * Full reindex toàn bộ website để đảm bảo không bỏ sót URL nào
     */
    @Cron('0 4 * * 0', { name: 'weekly-full-reindex', timeZone: 'Asia/Ho_Chi_Minh' })
    async handleWeeklyFullReindex() {
        this.logger.log('🔄 [CRON] Weekly full reindex started...');

        try {
            const stats = await this.seoService.reindexAll();
            this.logger.log(`✅ [CRON] Weekly full reindex completed:`, stats);
        } catch (error) {
            this.logger.error(`❌ [CRON] Weekly full reindex failed:`, error.message);
        }
    }
}
