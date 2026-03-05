import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class CheckUidService {
    constructor(private prisma: PrismaService) { }

    // ============================================
    // PLANS (Admin)
    // ============================================

    async getPlans(activeOnly = true) {
        const where = activeOnly ? { isActive: true } : {};
        return this.prisma.checkUidPlan.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
        });
    }

    async createPlan(data: {
        name: string;
        durationDays: number;
        price: number;
        originalPrice?: number;
        description?: string;
        features?: string;
        sortOrder?: number;
    }) {
        return this.prisma.checkUidPlan.create({ data });
    }

    async updatePlan(id: string, data: any) {
        return this.prisma.checkUidPlan.update({ where: { id }, data });
    }

    async deletePlan(id: string) {
        return this.prisma.checkUidPlan.delete({ where: { id } });
    }

    // ============================================
    // SUBSCRIPTIONS
    // ============================================

    async getActiveSubscription(userId: string) {
        return this.prisma.checkUidSubscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE',
                endDate: { gt: new Date() },
            },
            include: { plan: true },
            orderBy: { endDate: 'desc' },
        });
    }

    async subscribe(userId: string, planId: string) {
        // Get the plan
        const plan = await this.prisma.checkUidPlan.findUnique({ where: { id: planId } });
        if (!plan || !plan.isActive) throw new NotFoundException('Gói không tồn tại hoặc đã bị vô hiệu hóa');

        // Check user balance
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        if (user.balance < plan.price) {
            throw new BadRequestException(`Số dư không đủ. Cần ${plan.price.toLocaleString('vi-VN')}đ, hiện có ${user.balance.toLocaleString('vi-VN')}đ`);
        }

        // Check if user already has active subscription — extend it
        const existingSub = await this.getActiveSubscription(userId);
        const startDate = existingSub ? existingSub.endDate : new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationDays);

        // Deduct balance + create subscription in a transaction
        const [subscription] = await this.prisma.$transaction([
            this.prisma.checkUidSubscription.create({
                data: {
                    userId,
                    planId,
                    startDate,
                    endDate,
                    amount: plan.price,
                    status: 'ACTIVE',
                },
                include: { plan: true },
            }),
            this.prisma.user.update({
                where: { id: userId },
                data: { balance: { decrement: plan.price } },
            }),
            this.prisma.transaction.create({
                data: {
                    userId,
                    type: 'PURCHASE',
                    amount: -plan.price,
                    description: `Mua gói CheckUID VIP: ${plan.name}`,
                    status: 'COMPLETED',
                },
            }),
        ]);

        return subscription;
    }

    async getUserSubscriptions(userId: string) {
        return this.prisma.checkUidSubscription.findMany({
            where: { userId },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ============================================
    // ITEMS (UID tracking)
    // ============================================

    async addItem(userId: string, data: {
        platform: string;
        type?: string;
        uid: string;
        link?: string;
        note?: string;
        price?: number;
    }) {
        // Check limits - VIP unlimited, Free max 10
        const isVip = !!(await this.getActiveSubscription(userId));
        if (!isVip) {
            const count = await this.prisma.checkUidItem.count({ where: { userId } });
            if (count >= 10) {
                throw new BadRequestException('Tài khoản Free chỉ được theo dõi tối đa 10 UID. Nâng cấp VIP để không giới hạn!');
            }
        }

        // Check duplicate
        const existing = await this.prisma.checkUidItem.findFirst({
            where: { userId, platform: data.platform, uid: data.uid },
        });
        if (existing) throw new BadRequestException('UID này đã được thêm trước đó');

        // Auto-check status + avatar when adding
        let status = 'unknown';
        let avatarUrl: string | null = null;

        if (data.platform === 'facebook' && (data.type || 'profile') === 'profile') {
            try {
                const check = await this.checkFacebookUID(data.uid);
                if (check.status) status = check.status;
                if (check.avatarUrl) avatarUrl = check.avatarUrl;
            } catch (e) { /* ignore check errors */ }
        }

        return this.prisma.checkUidItem.create({
            data: {
                userId,
                platform: data.platform,
                type: data.type || 'profile',
                uid: data.uid,
                link: data.link,
                note: data.note,
                price: data.price || 0,
                status,
                avatarUrl,
                lastCheckedAt: status !== 'unknown' ? new Date() : null,
            },
        });
    }

    // ============================================
    // CHECK STATUS (same method as Telegram bot)
    // ============================================

    async checkFacebookUID(uid: string): Promise<{ status: string | null; avatarUrl: string | null }> {
        try {
            // Method 1 (Primary): Follow redirect and check final URL pattern
            // Live accounts redirect to scontent URL with "100x100" in path
            // Die accounts redirect to static.xx.fbcdn.net (default silhouette)
            try {
                const response = await axios.get(
                    `https://graph.facebook.com/${encodeURIComponent(uid)}/picture?type=normal`,
                    { maxRedirects: 5, timeout: 10000 }
                );
                // axios follows redirects, check the final response URL
                const finalUrl = response.request?.res?.responseUrl || response.request?.responseURL || '';
                const isLive = /100x100/.test(finalUrl);

                let avatarUrl: string | null = null;
                if (isLive) {
                    avatarUrl = await this.getFacebookAvatarUrl(uid);
                    if (!avatarUrl) avatarUrl = finalUrl || null;
                }

                return {
                    status: isLive ? 'live' : 'die',
                    avatarUrl,
                };
            } catch (redirectError: any) {
                // HTTP 400 = UID doesn't exist at all
                if (redirectError.response?.status === 400) {
                    return { status: 'die', avatarUrl: null };
                }
            }

            // Method 2 (Fallback): Use redirect=false and check is_silhouette
            const response = await axios.get(
                `https://graph2.facebook.com/v3.3/${encodeURIComponent(uid)}/picture`,
                { params: { redirect: false }, timeout: 10000 }
            );
            const data = response.data?.data;
            if (!data) return { status: 'die', avatarUrl: null };

            const isSilhouette = data.is_silhouette === true;
            const isLive = !isSilhouette;

            let avatarUrl: string | null = null;
            if (isLive) {
                avatarUrl = await this.getFacebookAvatarUrl(uid);
                if (!avatarUrl && data.url) avatarUrl = data.url;
            }

            return {
                status: isLive ? 'live' : 'die',
                avatarUrl,
            };
        } catch {
            return { status: null, avatarUrl: null };
        }
    }

    /**
     * Get real Facebook avatar URL (same logic as bot's getFacebookAvatar)
     * Method 1: Scrape touch.facebook.com with FB_COOKIE
     * Method 2: Graph API v18 with FB_ACCESS_TOKEN
     */
    async getFacebookAvatarUrl(uid: string): Promise<string | null> {
        const fbCookie = process.env.FB_COOKIE || '';
        const fbToken = process.env.FB_ACCESS_TOKEN || '';

        // Method 1: Scrape touch.facebook.com (same as bot)
        if (fbCookie) {
            try {
                const avatarUrl = await this.scrapeTouchFacebook(uid, fbCookie);
                if (avatarUrl) return avatarUrl;
            } catch (e) {
                console.log(`[Avatar] Method 1 error for ${uid}:`, e.message);
            }
        }

        // Method 2: Graph API with access token
        if (fbToken) {
            try {
                const response = await axios.get(
                    `https://graph.facebook.com/v18.0/${encodeURIComponent(uid)}/picture`,
                    {
                        params: { redirect: false, width: 200, height: 200, access_token: fbToken },
                        timeout: 10000,
                    }
                );
                const data = response.data?.data;
                if (data && !data.is_silhouette) {
                    return data.url;
                }
            } catch { /* ignore */ }
        }

        return null;
    }

    /**
     * Scrape touch.facebook.com to get profile avatar URL from JSON hydration data
     * Exact same logic as bot's scrapeTouchFacebook function
     */
    private async scrapeTouchFacebook(uid: string, cookie: string): Promise<string | null> {
        const https = await import('https');

        return new Promise((resolve) => {
            let redirectCount = 0;

            const fetchUrl = (targetUrl: string) => {
                if (redirectCount > 5) return resolve(null);
                const parsedUrl = new URL(targetUrl);
                const options = {
                    hostname: parsedUrl.hostname,
                    path: parsedUrl.pathname + parsedUrl.search,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Cookie': cookie,
                        'Accept': 'text/html',
                    },
                    timeout: 15000,
                };

                const req = https.get(options, (res) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        let loc = res.headers.location;
                        if (!loc.startsWith('http')) loc = parsedUrl.protocol + '//' + parsedUrl.hostname + loc;
                        if (loc.startsWith('intent:')) { res.resume(); return resolve(null); }
                        res.resume();
                        redirectCount++;
                        return fetchUrl(loc);
                    }
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => {
                        const html = Buffer.concat(chunks).toString();
                        let avatarUrl: string | null = null;

                        // Method 1: profilePicLarge (480x480)
                        const largePic = html.match(/"profilePicLarge":\{"uri":"(https?:\\\/\\\/scontent[^"]+)"/);
                        if (largePic) {
                            avatarUrl = largePic[1].replace(/\\\//g, '/');
                        }

                        // Method 2: profilePicMedium (320x320)
                        if (!avatarUrl) {
                            const medPic = html.match(/"profilePicMedium":\{"uri":"(https?:\\\/\\\/scontent[^"]+)"/);
                            if (medPic) avatarUrl = medPic[1].replace(/\\\//g, '/');
                        }

                        // Method 3: profile_picture (80x80)
                        if (!avatarUrl) {
                            const profPic = html.match(/"profile_picture":\{"uri":"(https?:\\\/\\\/scontent[^"]+)"/);
                            if (profPic) avatarUrl = profPic[1].replace(/\\\//g, '/');
                        }

                        // Filter out default silhouette
                        if (avatarUrl && avatarUrl.includes('84628273_176159')) avatarUrl = null;

                        resolve(avatarUrl);
                    });
                });
                req.on('error', () => resolve(null));
                req.on('timeout', () => { req.destroy(); resolve(null); });
            };

            fetchUrl(`https://touch.facebook.com/${encodeURIComponent(uid)}`);
        });
    }

    /**
     * Download avatar image as Buffer (for proxy endpoint)
     */
    async downloadAvatarBuffer(uid: string): Promise<Buffer | null> {
        const avatarUrl = await this.getFacebookAvatarUrl(uid);
        if (!avatarUrl) return null;

        const https = await import('https');
        return new Promise((resolve) => {
            let depth = 0;
            const doFetch = (url: string) => {
                if (depth > 5) return resolve(null);
                const parsed = new URL(url);
                const opts = {
                    hostname: parsed.hostname,
                    path: parsed.pathname + parsed.search,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        ...(process.env.FB_COOKIE ? { 'Cookie': process.env.FB_COOKIE } : {}),
                    },
                    timeout: 10000,
                };
                const req = https.get(opts, (res) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        res.resume();
                        depth++;
                        return doFetch(res.headers.location);
                    }
                    if (res.statusCode !== 200) { res.resume(); return resolve(null); }
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => {
                        const buf = Buffer.concat(chunks);
                        resolve(buf.length > 500 ? buf : null);
                    });
                });
                req.on('error', () => resolve(null));
                req.on('timeout', () => { req.destroy(); resolve(null); });
            };
            doFetch(avatarUrl);
        });
    }

    async recheckItem(userId: string, itemId: string) {
        const item = await this.prisma.checkUidItem.findFirst({ where: { id: itemId, userId } });
        if (!item) throw new NotFoundException('Item not found');

        let status: string | null = null;
        let avatarUrl: string | null = item.avatarUrl;

        if (item.platform === 'facebook' && item.type === 'profile') {
            const check = await this.checkFacebookUID(item.uid);
            status = check.status;
            if (check.avatarUrl) avatarUrl = check.avatarUrl;
        }

        if (status) {
            if (item.status !== 'unknown' && item.status !== status) {
                await this.prisma.checkUidHistory.create({
                    data: { itemId, oldStatus: item.status, newStatus: status },
                });
            }

            return this.prisma.checkUidItem.update({
                where: { id: itemId },
                data: {
                    status,
                    previousStatus: item.status,
                    avatarUrl,
                    lastCheckedAt: new Date(),
                },
            });
        }

        return item;
    }

    async getItems(userId: string, params: {
        platform?: string;
        status?: string;
        type?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const { platform, status, type, search, page = 1, limit = 20 } = params;
        const where: any = { userId };

        if (platform) where.platform = platform;
        if (status) where.status = status;
        if (type) where.type = type;
        if (search) {
            where.OR = [
                { uid: { contains: search } },
                { note: { contains: search } },
                { link: { contains: search } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.checkUidItem.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.checkUidItem.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async updateItem(userId: string, itemId: string, data: {
        note?: string;
        price?: number;
        link?: string;
    }) {
        const item = await this.prisma.checkUidItem.findFirst({
            where: { id: itemId, userId },
        });
        if (!item) throw new NotFoundException('Item not found');

        return this.prisma.checkUidItem.update({
            where: { id: itemId },
            data: {
                note: data.note !== undefined ? data.note : item.note,
                price: data.price !== undefined ? data.price : item.price,
                link: data.link !== undefined ? data.link : item.link,
            },
        });
    }

    async deleteItem(userId: string, itemId: string) {
        const item = await this.prisma.checkUidItem.findFirst({
            where: { id: itemId, userId },
        });
        if (!item) throw new NotFoundException('Item not found');

        return this.prisma.checkUidItem.delete({ where: { id: itemId } });
    }

    async deleteAllItems(userId: string, platform?: string) {
        const where: any = { userId };
        if (platform) where.platform = platform;
        return this.prisma.checkUidItem.deleteMany({ where });
    }

    // ============================================
    // STATS
    // ============================================

    async getStats(userId: string) {
        const [
            totalFb,
            liveFb,
            dieFb,
            totalTk,
            liveTk,
            dieTk,
            totalPrice,
        ] = await Promise.all([
            this.prisma.checkUidItem.count({ where: { userId, platform: 'facebook' } }),
            this.prisma.checkUidItem.count({ where: { userId, platform: 'facebook', status: 'live' } }),
            this.prisma.checkUidItem.count({ where: { userId, platform: 'facebook', status: 'die' } }),
            this.prisma.checkUidItem.count({ where: { userId, platform: 'tiktok' } }),
            this.prisma.checkUidItem.count({ where: { userId, platform: 'tiktok', status: 'live' } }),
            this.prisma.checkUidItem.count({ where: { userId, platform: 'tiktok', status: 'die' } }),
            this.prisma.checkUidItem.aggregate({ where: { userId }, _sum: { price: true } }),
        ]);

        const subscription = await this.getActiveSubscription(userId);

        return {
            facebook: { total: totalFb, live: liveFb, die: dieFb, unknown: totalFb - liveFb - dieFb },
            tiktok: { total: totalTk, live: liveTk, die: dieTk, unknown: totalTk - liveTk - dieTk },
            totalPrice: totalPrice._sum.price || 0,
            isVip: !!subscription,
            subscription: subscription ? {
                planName: subscription.plan.name,
                endDate: subscription.endDate,
            } : null,
            limits: {
                maxItems: subscription ? Infinity : 10,
                checkInterval: subscription ? '1 phút' : '10 phút',
            },
        };
    }

    async getHistory(userId: string, params: { itemId?: string; page?: number; limit?: number }) {
        const { itemId, page = 1, limit = 50 } = params;
        const where: any = { item: { userId } };
        if (itemId) where.itemId = itemId;

        const [history, total] = await Promise.all([
            this.prisma.checkUidHistory.findMany({
                where,
                include: { item: { select: { uid: true, platform: true, type: true, note: true } } },
                orderBy: { checkedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.checkUidHistory.count({ where }),
        ]);

        return { history, total, page, totalPages: Math.ceil(total / limit) };
    }

    // ============================================
    // ADMIN
    // ============================================

    async getAdminStats() {
        const [totalUsers, totalItems, totalVip, totalRevenue] = await Promise.all([
            this.prisma.checkUidItem.groupBy({ by: ['userId'], _count: true }).then(r => r.length),
            this.prisma.checkUidItem.count(),
            this.prisma.checkUidSubscription.count({ where: { status: 'ACTIVE', endDate: { gt: new Date() } } }),
            this.prisma.checkUidSubscription.aggregate({ _sum: { amount: true } }),
        ]);

        return {
            totalUsers,
            totalItems,
            totalVip,
            totalRevenue: totalRevenue._sum.amount || 0,
        };
    }

    // ============================================
    // TELEGRAM LINK
    // ============================================

    async linkTelegram(userId: string, telegramId: string) {
        // Check if this telegram ID is already linked to another user
        const existing = await this.prisma.user.findFirst({
            where: { telegramCheckUidId: telegramId, id: { not: userId } },
        });
        if (existing) throw new BadRequestException('Telegram ID này đã được liên kết với tài khoản khác');

        return this.prisma.user.update({
            where: { id: userId },
            data: { telegramCheckUidId: telegramId },
        });
    }

    async unlinkTelegram(userId: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { telegramCheckUidId: null },
        });
    }
}
