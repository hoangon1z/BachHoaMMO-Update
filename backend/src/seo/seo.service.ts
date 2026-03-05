import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug } from '../common/utils/slug.util';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SEO Service - Google Indexing API Integration
 * 
 * Tự động thông báo Google khi có URL mới (sản phẩm, blog, shop)
 * Giúp Google index nhanh hơn thay vì chờ sitemap.xml được crawl
 */
@Injectable()
export class SeoService implements OnModuleInit {
    private readonly logger = new Logger(SeoService.name);
    private indexingAPI: any;
    private isConfigured = false;

    constructor(private prisma: PrismaService) {
        this.logger.log('🔧 SeoService constructor called');
    }

    /**
     * NestJS lifecycle hook - runs when module is initialized
     * Auto-generates missing slugs for any products that don't have one
     */
    async onModuleInit() {
        // Initialize Google Indexing API
        this.initializeIndexingAPI().catch((err) => {
            this.logger.error('❌ Critical error in initializeIndexingAPI:', err);
        });

        // Auto-generate missing slugs on startup
        try {
            const result = await this.generateMissingSlugs();
            if (result.total > 0) {
                this.logger.warn(`🔧 Auto-fixed ${result.updated} products with missing slugs (${result.failed} failed)`);
            } else {
                this.logger.log('✅ All products have slugs - sitemap is complete');
            }
        } catch (error) {
            this.logger.error('❌ Failed to auto-generate missing slugs:', error.message);
        }
    }

    /**
     * Khởi tạo Google Indexing API
     * Yêu cầu: Service Account JSON từ Google Cloud Console
     */
    private async initializeIndexingAPI() {
        this.logger.log('🚀 Starting Google Indexing API initialization...');

        try {
            const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
            this.logger.log(`📂 Service account path: ${serviceAccountPath || 'NOT SET'}`);

            if (!serviceAccountPath) {
                this.logger.warn(
                    '⚠️  GOOGLE_SERVICE_ACCOUNT_PATH not configured. Google Indexing API disabled.'
                );
                this.logger.warn(
                    '📖 See docs: https://developers.google.com/search/apis/indexing-api/v3/quickstart'
                );
                return;
            }

            const serviceAccountKeyPath = path.resolve(serviceAccountPath);
            this.logger.log(`📍 Resolved path: ${serviceAccountKeyPath}`);

            if (!fs.existsSync(serviceAccountKeyPath)) {
                this.logger.warn(`⚠️  Service account file not found: ${serviceAccountKeyPath}`);
                return;
            }

            this.logger.log('✅ Service account file exists');
            this.logger.log('🔑 Creating GoogleAuth...');

            const auth = new google.auth.GoogleAuth({
                keyFile: serviceAccountKeyPath,
                scopes: ['https://www.googleapis.com/auth/indexing'],
            });

            this.logger.log('📡 Creating Indexing API client...');
            this.indexingAPI = google.indexing({ version: 'v3', auth });
            this.isConfigured = true;

            this.logger.log('✅ Google Indexing API initialized successfully');
            this.logger.log('🎯 Ready to notify Google about new URLs');
        } catch (error) {
            this.logger.error('❌ Failed to initialize Google Indexing API:', error.message);
            this.logger.error('Stack trace:', error.stack);
        }
    }

    /**
     * Thông báo URL mới cho Google (URL_UPDATED)
     * @param url - Full URL của trang cần index
     * @param type - Loại: 'product', 'blog', 'shop'
     */
    async notifyUrlUpdated(url: string, type: string = 'product'): Promise<boolean> {
        if (!this.isConfigured) {
            this.logger.debug(`ℹ️  Indexing API not configured. Skipping: ${url}`);
            return false;
        }

        try {
            const response = await this.indexingAPI.urlNotifications.publish({
                requestBody: {
                    url,
                    type: 'URL_UPDATED',
                },
            });

            this.logger.log(`✅ Google notified for ${type}: ${url}`, response.data);

            // Lưu log vào database (optional)
            await this.logIndexingRequest(url, type, 'URL_UPDATED', 'SUCCESS');

            return true;
        } catch (error) {
            this.logger.error(`❌ Failed to notify Google for ${url}:`, error.message);
            await this.logIndexingRequest(url, type, 'URL_UPDATED', 'FAILED', error.message);
            return false;
        }
    }

    /**
     * Thông báo URL đã xóa cho Google (URL_DELETED)
     */
    async notifyUrlDeleted(url: string, type: string = 'product'): Promise<boolean> {
        if (!this.isConfigured) {
            return false;
        }

        try {
            const response = await this.indexingAPI.urlNotifications.publish({
                requestBody: {
                    url,
                    type: 'URL_DELETED',
                },
            });

            this.logger.log(`✅ Google notified URL deleted: ${url}`);
            await this.logIndexingRequest(url, type, 'URL_DELETED', 'SUCCESS');

            return true;
        } catch (error) {
            this.logger.error(`❌ Failed to notify URL deleted: ${url}`, error.message);
            await this.logIndexingRequest(url, type, 'URL_DELETED', 'FAILED', error.message);
            return false;
        }
    }

    /**
     * Kiểm tra trạng thái index của URL
     */
    async getUrlStatus(url: string): Promise<any> {
        if (!this.isConfigured) {
            return { error: 'Indexing API not configured' };
        }

        try {
            const response = await this.indexingAPI.urlNotifications.getMetadata({ url });
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get URL status: ${url}`, error.message);
            return { error: error.message };
        }
    }

    /**
     * Tự động gửi thông báo cho sản phẩm mới
     * Gọi hàm này trong ProductsService khi tạo/cập nhật sản phẩm
     */
    async notifyProductCreated(productId: string, slug: string): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
        const url = `${baseUrl}/products/${slug}`;

        // Không chờ response để không làm chậm request chính
        setImmediate(() => {
            this.notifyUrlUpdated(url, 'product');
        });
    }

    /**
     * Tự động gửi thông báo cho blog mới
     */
    async notifyBlogCreated(slug: string): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
        const url = `${baseUrl}/blogs/${slug}`;

        setImmediate(() => {
            this.notifyUrlUpdated(url, 'blog');
        });
    }

    /**
     * Tự động gửi thông báo cho shop mới
     */
    async notifyShopCreated(shopId: string): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
        const url = `${baseUrl}/shop/${shopId}`;

        setImmediate(() => {
            this.notifyUrlUpdated(url, 'shop');
        });
    }

    /**
     * Gửi batch request (tối đa 100 URLs một lúc)
     * Hữu ích khi import nhiều sản phẩm cùng lúc
     */
    async notifyBatchUrls(urls: string[]): Promise<void> {
        if (!this.isConfigured) {
            this.logger.warn('Indexing API not configured. Skipping batch notification.');
            return;
        }

        this.logger.log(`📦 Sending batch notification for ${urls.length} URLs...`);

        // Giới hạn 100 URLs/batch (theo quota của Google)
        const batchSize = 100;
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);

            // Gửi tuần tự để tránh rate limit
            for (const url of batch) {
                await this.notifyUrlUpdated(url, 'batch');
                // Delay 100ms giữa các request để tránh rate limit
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        this.logger.log(`✅ Batch notification completed for ${urls.length} URLs`);
    }

    /**
     * Lưu log indexing request vào database (optional)
     * Giúp tracking và debug
     */
    private async logIndexingRequest(
        url: string,
        type: string,
        action: string,
        status: string,
        errorMessage?: string
    ): Promise<void> {
        try {
            // Bạn có thể tạo model IndexingLog trong schema.prisma nếu muốn
            // Hiện tại skip để không làm phức tạp
            this.logger.debug(`📝 Log: ${action} ${url} - ${status}`);
        } catch (error) {
            // Silent fail - không quan trọng nếu log thất bại
        }
    }

    /**
     * Generate advanced sitemap XML
     * Bao gồm: images, pagination, categories, và các best practices cho SEO
     */
    async generateAdvancedSitemap(): Promise<string> {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
        const now = new Date().toISOString();

        // Fetch data
        const products = await this.prisma.product.findMany({
            where: { status: 'ACTIVE' },
            select: {
                slug: true,
                updatedAt: true,
                images: true,
                title: true,
                category: {
                    select: {
                        slug: true,
                        name: true,
                    }
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: 5000, // Limit để tránh sitemap quá lớn
        });

        const blogs = await this.prisma.blogPost.findMany({
            where: { status: 'PUBLISHED' },
            select: {
                slug: true,
                updatedAt: true,
                publishedAt: true,
                coverImage: true,
            },
            orderBy: { publishedAt: 'desc' },
            take: 1000,
        });

        const shops = await this.prisma.sellerProfile.findMany({
            select: {
                userId: true,
                updatedAt: true,
                shopLogo: true,
            },
            take: 500,
        });

        // Get unique category slugs for category pages
        const categories = [...new Set(products.map(p => p.category?.slug).filter(Boolean))];

        // Build XML
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
        sitemap += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

        // Static pages
        const staticPages = [
            { url: '', priority: '1.0', changefreq: 'daily' },
            { url: '/explore', priority: '0.95', changefreq: 'hourly' },
            { url: '/blogs', priority: '0.85', changefreq: 'daily' },
            { url: '/auction', priority: '0.9', changefreq: 'hourly' },
            { url: '/about', priority: '0.6', changefreq: 'monthly' },
            { url: '/contact', priority: '0.6', changefreq: 'monthly' },
        ];

        for (const page of staticPages) {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
            sitemap += `    <lastmod>${now}</lastmod>\n`;
            sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
            sitemap += `    <priority>${page.priority}</priority>\n`;
            sitemap += `  </url>\n`;
        }

        // Pagination URLs cho /explore (giả sử có khoảng 50 products/page)
        const productsPerPage = 50;
        const totalPages = Math.ceil(products.length / productsPerPage);
        const maxPaginationPages = Math.min(totalPages, 20); // Limit 20 pages để tránh sitemap quá lớn

        for (let page = 1; page <= maxPaginationPages; page++) {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}/explore?page=${page}</loc>\n`;
            sitemap += `    <lastmod>${now}</lastmod>\n`;
            sitemap += `    <changefreq>hourly</changefreq>\n`;
            // Priority giảm dần theo page number
            const priority = Math.max(0.5, 0.9 - (page * 0.02));
            sitemap += `    <priority>${priority.toFixed(2)}</priority>\n`;
            sitemap += `  </url>\n`;
        }

        // Category pages
        for (const category of categories) {
            if (!category) continue;

            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}/explore?category=${encodeURIComponent(category)}</loc>\n`;
            sitemap += `    <lastmod>${now}</lastmod>\n`;
            sitemap += `    <changefreq>daily</changefreq>\n`;
            sitemap += `    <priority>0.85</priority>\n`;
            sitemap += `  </url>\n`;

            // Pagination cho mỗi category (chỉ 5 pages đầu)
            const categoryProducts = products.filter(p => p.category?.slug === category);
            const categoryPages = Math.min(Math.ceil(categoryProducts.length / productsPerPage), 5);

            for (let page = 2; page <= categoryPages; page++) {
                sitemap += `  <url>\n`;
                sitemap += `    <loc>${baseUrl}/explore?category=${encodeURIComponent(category)}&page=${page}</loc>\n`;
                sitemap += `    <lastmod>${now}</lastmod>\n`;
                sitemap += `    <changefreq>daily</changefreq>\n`;
                sitemap += `    <priority>${(0.85 - (page * 0.05)).toFixed(2)}</priority>\n`;
                sitemap += `  </url>\n`;
            }
        }

        // Product pages (với images)
        for (const product of products) {
            if (!product.slug) continue;

            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}/products/${product.slug}</loc>\n`;
            sitemap += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;
            sitemap += `    <changefreq>daily</changefreq>\n`;
            sitemap += `    <priority>0.85</priority>\n`;

            // Thêm images nếu có
            try {
                const images = JSON.parse(product.images);
                for (const imageUrl of images.slice(0, 3)) { // Tối đa 3 ảnh
                    sitemap += `    <image:image>\n`;
                    sitemap += `      <image:loc>${imageUrl}</image:loc>\n`;
                    sitemap += `      <image:title>${this.escapeXml(product.title)}</image:title>\n`;
                    sitemap += `    </image:image>\n`;
                }
            } catch (e) {
                // Skip nếu parse lỗi
            }

            sitemap += `  </url>\n`;
        }

        // Blog pages
        for (const blog of blogs) {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}/blogs/${blog.slug}</loc>\n`;
            sitemap += `    <lastmod>${(blog.updatedAt || blog.publishedAt).toISOString()}</lastmod>\n`;
            sitemap += `    <changefreq>weekly</changefreq>\n`;
            sitemap += `    <priority>0.75</priority>\n`;
            sitemap += `  </url>\n`;
        }

        // Blog pagination
        const blogsPerPage = 20;
        const totalBlogPages = Math.min(Math.ceil(blogs.length / blogsPerPage), 10);

        for (let page = 1; page <= totalBlogPages; page++) {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}/blogs?page=${page}</loc>\n`;
            sitemap += `    <lastmod>${now}</lastmod>\n`;
            sitemap += `    <changefreq>daily</changefreq>\n`;
            sitemap += `    <priority>${(0.8 - (page * 0.03)).toFixed(2)}</priority>\n`;
            sitemap += `  </url>\n`;
        }

        // Shop pages
        for (const shop of shops) {
            sitemap += `  <url>\n`;
            sitemap += `    <loc>${baseUrl}/shop/${shop.userId}</loc>\n`;
            sitemap += `    <lastmod>${shop.updatedAt.toISOString()}</lastmod>\n`;
            sitemap += `    <changefreq>weekly</changefreq>\n`;
            sitemap += `    <priority>0.7</priority>\n`;
            sitemap += `  </url>\n`;
        }

        sitemap += '</urlset>';

        this.logger.log(`✅ Generated sitemap with ${products.length} products, ${blogs.length} blogs, ${shops.length} shops, ${categories.length} categories`);
        this.logger.log(`📊 Pagination: ${maxPaginationPages} explore pages, ${totalBlogPages} blog pages`);

        return sitemap;
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // ============================================================
    // Auto Reindex & Ping Methods
    // ============================================================

    /**
     * Lấy tất cả product URLs
     */
    async getAllProductUrls(): Promise<string[]> {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
        const products = await this.prisma.product.findMany({
            where: { status: 'ACTIVE' },
            select: { slug: true, id: true },
        });
        return products
            .filter(p => p.slug)
            .map(p => `${baseUrl}/products/${p.slug}`);
    }

    /**
     * Lấy tất cả blog URLs
     */
    async getAllBlogUrls(): Promise<string[]> {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
        const blogs = await this.prisma.blogPost.findMany({
            where: { status: 'PUBLISHED' },
            select: { slug: true },
        });
        return blogs.map(b => `${baseUrl}/blogs/${b.slug}`);
    }

    /**
     * Lấy tất cả shop URLs
     */
    async getAllShopUrls(): Promise<string[]> {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
        const shops = await this.prisma.sellerProfile.findMany({
            select: { userId: true },
        });
        return shops.map(s => `${baseUrl}/shop/${s.userId}`);
    }

    /**
     * Reindex toàn bộ website
     * Chạy trong background, gửi batch với delay để tránh rate limit
     */
    async reindexAll(): Promise<{ products: number; blogs: number; shops: number; staticPages: number }> {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

        const [productUrls, blogUrls, shopUrls] = await Promise.all([
            this.getAllProductUrls(),
            this.getAllBlogUrls(),
            this.getAllShopUrls(),
        ]);

        const staticUrls = [
            baseUrl,
            `${baseUrl}/explore`,
            `${baseUrl}/blogs`,
            `${baseUrl}/auction`,
            `${baseUrl}/become-seller`,
            `${baseUrl}/payment-guide`,
            `${baseUrl}/refund-policy`,
            `${baseUrl}/shopping-guide`,
            `${baseUrl}/terms`,
            `${baseUrl}/privacy`,
        ];

        const allUrls = [...staticUrls, ...productUrls, ...blogUrls, ...shopUrls];

        this.logger.log(`📦 Full reindex: ${allUrls.length} total URLs`);
        this.logger.log(`  📂 Products: ${productUrls.length}`);
        this.logger.log(`  📝 Blogs: ${blogUrls.length}`);
        this.logger.log(`  🏪 Shops: ${shopUrls.length}`);
        this.logger.log(`  📄 Static: ${staticUrls.length}`);

        // Run in background
        setImmediate(async () => {
            await this.notifyBatchUrls(allUrls);
            // Also ping sitemap
            await this.pingSitemapToGoogle();
        });

        return {
            products: productUrls.length,
            blogs: blogUrls.length,
            shops: shopUrls.length,
            staticPages: staticUrls.length,
        };
    }

    /**
     * Ping Google Search Console to re-crawl sitemap
     * Google khuyến nghị ping sau khi sitemap thay đổi
     */
    async pingSitemapToGoogle(): Promise<{ success: boolean; message: string }> {
        const sitemapUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store'}/sitemap.xml`;
        const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

        try {
            const response = await fetch(pingUrl);
            if (response.ok) {
                this.logger.log(`✅ Sitemap ping successful: ${sitemapUrl}`);
                return { success: true, message: `Google pinged about sitemap: ${sitemapUrl}` };
            } else {
                this.logger.warn(`⚠️  Sitemap ping failed: ${response.status}`);
                return { success: false, message: `Ping failed with status: ${response.status}` };
            }
        } catch (error) {
            this.logger.error(`❌ Sitemap ping error:`, error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Thống kê SEO indexing
     */
    async getIndexingStats(): Promise<any> {
        const [totalProducts, activeProducts, totalBlogs, totalShops] = await Promise.all([
            this.prisma.product.count(),
            this.prisma.product.count({ where: { status: 'ACTIVE' } }),
            this.prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
            this.prisma.sellerProfile.count(),
        ]);

        // Products without slug (won't be indexed properly)
        const productsWithoutSlug = await this.prisma.product.count({
            where: { status: 'ACTIVE', slug: null },
        });

        // Products updated in last 24 hours (need reindex)
        const recentlyUpdated = await this.prisma.product.count({
            where: {
                status: 'ACTIVE',
                updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
        });

        return {
            isIndexingConfigured: this.isConfigured,
            totalProducts,
            activeProducts,
            productsWithoutSlug,
            recentlyUpdatedProducts: recentlyUpdated,
            publishedBlogs: totalBlogs,
            activeShops: totalShops,
            totalIndexableUrls: activeProducts + totalBlogs + totalShops + 10, // +10 for static pages
            sitemapUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store'}/sitemap.xml`,
        };
    }

    /**
     * Auto reindex: Tự động reindex URL mới trong 24h qua
     * Gọi hàm này từ cron job hàng ngày
     */
    async autoReindexNewContent(): Promise<{ reindexed: number }> {
        if (!this.isConfigured) {
            this.logger.debug('Auto reindex skipped: Indexing API not configured');
            return { reindexed: 0 };
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Recent products
        const recentProducts = await this.prisma.product.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { createdAt: { gte: since } },
                    { updatedAt: { gte: since } },
                ],
            },
            select: { slug: true },
        });

        // Recent blogs
        const recentBlogs = await this.prisma.blogPost.findMany({
            where: {
                status: 'PUBLISHED',
                OR: [
                    { createdAt: { gte: since } },
                    { updatedAt: { gte: since } },
                ],
            },
            select: { slug: true },
        });

        const urls = [
            ...recentProducts.filter(p => p.slug).map(p => `${baseUrl}/products/${p.slug}`),
            ...recentBlogs.map(b => `${baseUrl}/blogs/${b.slug}`),
        ];

        if (urls.length === 0) {
            this.logger.debug('No new content to reindex');
            return { reindexed: 0 };
        }

        this.logger.log(`🔄 Auto reindexing ${urls.length} recently updated URLs`);
        await this.notifyBatchUrls(urls);

        // Also ping sitemap
        await this.pingSitemapToGoogle();

        return { reindexed: urls.length };
    }

    /**
     * Generate missing slugs for products that don't have one
     * This fixes products created before the slug feature was added
     */
    async generateMissingSlugs(): Promise<{ updated: number; failed: number; total: number }> {
        const productsWithoutSlugs = await this.prisma.product.findMany({
            where: { slug: null },
            select: { id: true, title: true },
        });

        if (productsWithoutSlugs.length === 0) {
            return { updated: 0, failed: 0, total: 0 };
        }

        // Get existing slugs for uniqueness
        const existingSlugs = new Set(
            (await this.prisma.product.findMany({
                where: { slug: { not: null } },
                select: { slug: true },
            })).map((p: any) => p.slug)
        );

        let updated = 0;
        let failed = 0;

        for (const product of productsWithoutSlugs) {
            try {
                let baseSlug = generateSlug(product.title);
                if (!baseSlug) {
                    baseSlug = `product-${product.id.substring(0, 8)}`;
                }

                let slug = baseSlug;
                let counter = 1;
                while (existingSlugs.has(slug)) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }

                await this.prisma.product.update({
                    where: { id: product.id },
                    data: { slug },
                });

                existingSlugs.add(slug);
                updated++;
                this.logger.log(`✅ Slug generated: ${product.title.substring(0, 50)} → ${slug}`);
            } catch (error: any) {
                failed++;
                this.logger.error(`❌ Slug failed: ${product.title.substring(0, 50)} - ${error.message}`);
            }
        }

        this.logger.log(`📊 Slug generation: ${updated} updated, ${failed} failed, ${productsWithoutSlugs.length} total`);
        return { updated, failed, total: productsWithoutSlugs.length };
    }
}

