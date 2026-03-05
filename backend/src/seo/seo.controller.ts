import { Controller, Get, Post, Body, Param, Query, Res, UseGuards, Logger } from '@nestjs/common';
import { SeoService } from './seo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * SEO Controller
 * 
 * Endpoints để trigger Google Indexing API manually
 * và generate advanced sitemap
 */
@Controller('seo')
export class SeoController {
    private readonly logger = new Logger(SeoController.name);

    constructor(private readonly seoService: SeoService) { }

    /**
     * POST /seo/notify-url
     * Admin/Seller có thể manually trigger indexing cho 1 URL
     * 
     * Body: { url: string, type?: string }
     */
    @Post('notify-url')
    @UseGuards(JwtAuthGuard)
    @Roles('ADMIN', 'SELLER')
    async notifyUrl(
        @Body() body: { url: string; type?: string }
    ) {
        const { url, type = 'manual' } = body;

        this.logger.log(`Manual indexing request for: ${url}`);

        const success = await this.seoService.notifyUrlUpdated(url, type);

        return {
            success,
            message: success
                ? 'Google has been notified successfully'
                : 'Failed to notify Google (check logs)',
            url,
        };
    }

    /**
     * POST /seo/notify-batch
     * Admin có thể gửi batch URLs
     * 
     * Body: { urls: string[] }
     */
    @Post('notify-batch')
    @UseGuards(JwtAuthGuard)
    @Roles('ADMIN')
    async notifyBatch(@Body() body: { urls: string[] }) {
        const { urls } = body;

        this.logger.log(`Batch indexing request for ${urls.length} URLs`);

        await this.seoService.notifyBatchUrls(urls);

        return {
            success: true,
            message: `Initiated batch indexing for ${urls.length} URLs`,
            count: urls.length,
        };
    }

    /**
     * GET /seo/url-status/:encodedUrl
     * Kiểm tra trạng thái index của 1 URL
     * 
     * Ví dụ: /seo/url-status/https%3A%2F%2Fbachhoammo.store%2Fproducts%2Fsome-slug
     */
    @Get('url-status/:encodedUrl')
    @UseGuards(JwtAuthGuard)
    @Roles('ADMIN', 'SELLER')
    async getUrlStatus(@Param('encodedUrl') encodedUrl: string) {
        const url = decodeURIComponent(encodedUrl);
        const status = await this.seoService.getUrlStatus(url);

        return {
            url,
            status,
        };
    }

    /**
     * GET /seo/sitemap.xml (PUBLIC endpoint for search engines)
     * Generate sitemap với pagination, categories, images
     * 
     * Google sẽ crawl endpoint này để index website
     */
    @Get('sitemap.xml')
    async getSitemap(@Param() params, @Body() body, @Query() query, @Res() res) {
        this.logger.log('🤖 Sitemap requested');

        const xml = await this.seoService.generateAdvancedSitemap();

        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
        res.send(xml);
    }

    /**
     * GET /seo/sitemap-advanced.xml (Legacy endpoint, keep for compatibility)
     * Generate sitemap nâng cao với images, priority
     */
    @Get('sitemap-advanced.xml')
    async getAdvancedSitemap(@Res() res) {
        const xml = await this.seoService.generateAdvancedSitemap();

        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600');
        res.send(xml);
    }

    /**
     * POST /seo/reindex-all-products
     * Admin trigger reindex toàn bộ sản phẩm
     * Gửi từng batch để tránh Google rate limit
     */
    @Post('reindex-all-products')
    @UseGuards(JwtAuthGuard)
    @Roles('ADMIN')
    async reindexAllProducts() {
        this.logger.warn('⚠️  Reindex all products requested');

        try {
            const urls = await this.seoService.getAllProductUrls();
            this.logger.log(`Found ${urls.length} product URLs to reindex`);

            // Run in background to avoid timeout
            setImmediate(async () => {
                await this.seoService.notifyBatchUrls(urls);
            });

            return {
                success: true,
                message: `Initiated reindexing for ${urls.length} product URLs. Running in background.`,
                count: urls.length,
            };
        } catch (error) {
            this.logger.error('Reindex all products failed:', error.message);
            return {
                success: false,
                message: `Failed to reindex: ${error.message}`,
            };
        }
    }

    /**
     * POST /seo/reindex-all
     * Admin trigger reindex toàn bộ URLs (products, blogs, shops, static pages)
     */
    @Post('reindex-all')
    @UseGuards(JwtAuthGuard)
    @Roles('ADMIN')
    async reindexAll() {
        this.logger.warn('⚠️  Full reindex requested');

        try {
            const stats = await this.seoService.reindexAll();

            return {
                success: true,
                message: `Full reindex initiated in background`,
                stats,
            };
        } catch (error) {
            this.logger.error('Full reindex failed:', error.message);
            return {
                success: false,
                message: `Failed: ${error.message}`,
            };
        }
    }

    /**
     * POST /seo/ping-sitemap
     * Ping Google Search Console to re-crawl sitemap
     * Hữu ích khi có nhiều trang mới/cập nhật
     */
    @Post('ping-sitemap')
    @UseGuards(JwtAuthGuard)
    @Roles('ADMIN')
    async pingSitemap() {
        this.logger.log('📡 Pinging Google about sitemap update...');

        try {
            const result = await this.seoService.pingSitemapToGoogle();
            return result;
        } catch (error) {
            return {
                success: false,
                message: `Failed to ping: ${error.message}`,
            };
        }
    }

    /**
     * GET /seo/stats
     * Xem thống kê SEO: số URL đã index, pending, failed
     */
    @Get('stats')
    @UseGuards(JwtAuthGuard)
    @Roles('ADMIN')
    async getStats() {
        return this.seoService.getIndexingStats();
    }

    /**
     * POST /seo/generate-missing-slugs
     * Generate SEO slugs for products that don't have one
     * This fixes products created before slug feature was added
     */
    @Post('generate-missing-slugs')
    @UseGuards(JwtAuthGuard)
    @Roles('ADMIN')
    async generateMissingSlugs() {
        this.logger.log('🔧 Generating missing product slugs...');
        try {
            const result = await this.seoService.generateMissingSlugs();
            return {
                success: true,
                message: `Generated slugs: ${result.updated} updated, ${result.failed} failed`,
                ...result,
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed: ${error.message}`,
            };
        }
    }
}

