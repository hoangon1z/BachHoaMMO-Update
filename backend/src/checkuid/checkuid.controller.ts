import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, Response, UseGuards } from '@nestjs/common';
import { CheckUidService } from './checkuid.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../security/decorators/security.decorators';
import type { Response as ExpressResponse } from 'express';

@Controller('checkuid')
export class CheckUidController {
    constructor(private readonly checkUidService: CheckUidService) { }

    // ============================================
    // PUBLIC — Plans
    // ============================================

    @Public()
    @Get('plans')
    async getPlans() {
        const plans = await this.checkUidService.getPlans(true);
        return { success: true, plans };
    }

    @Public()
    @Get('avatar/:uid')
    async getAvatar(@Param('uid') uid: string, @Response() res: ExpressResponse) {
        try {
            const buffer = await this.checkUidService.downloadAvatarBuffer(uid);
            if (buffer) {
                res.set({
                    'Content-Type': 'image/jpeg',
                    'Cache-Control': 'public, max-age=3600',
                    'Content-Length': buffer.length,
                });
                return res.send(buffer);
            }
        } catch (e) { /* ignore */ }

        // Fallback: redirect to a placeholder
        return res.redirect(`https://ui-avatars.com/api/?name=${uid.slice(0, 2)}&background=dbeafe&color=3b82f6&size=200`);
    }

    // ============================================
    // USER — Subscription
    // ============================================

    @UseGuards(JwtAuthGuard)
    @Post('subscribe')
    async subscribe(@Request() req, @Body() body: { planId: string }) {
        const subscription = await this.checkUidService.subscribe(req.user.id, body.planId);
        return { success: true, subscription };
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-subscription')
    async getMySubscription(@Request() req) {
        const subscription = await this.checkUidService.getActiveSubscription(req.user.id);
        return { success: true, subscription };
    }

    @UseGuards(JwtAuthGuard)
    @Get('my-subscriptions')
    async getMySubscriptions(@Request() req) {
        const subscriptions = await this.checkUidService.getUserSubscriptions(req.user.id);
        return { success: true, subscriptions };
    }

    // ============================================
    // USER — Items (UID tracking)
    // ============================================

    @UseGuards(JwtAuthGuard)
    @Post('items')
    async addItem(@Request() req, @Body() body: {
        platform: string;
        type?: string;
        uid: string;
        link?: string;
        note?: string;
        price?: number;
    }) {
        const item = await this.checkUidService.addItem(req.user.id, body);
        return { success: true, item };
    }

    @UseGuards(JwtAuthGuard)
    @Get('items')
    async getItems(@Request() req, @Query() query: {
        platform?: string;
        status?: string;
        type?: string;
        search?: string;
        page?: string;
        limit?: string;
    }) {
        const result = await this.checkUidService.getItems(req.user.id, {
            platform: query.platform,
            status: query.status,
            type: query.type,
            search: query.search,
            page: query.page ? parseInt(query.page) : 1,
            limit: query.limit ? parseInt(query.limit) : 20,
        });
        return { success: true, ...result };
    }

    @UseGuards(JwtAuthGuard)
    @Put('items/:id')
    async updateItem(@Request() req, @Param('id') id: string, @Body() body: {
        note?: string;
        price?: number;
        link?: string;
    }) {
        const item = await this.checkUidService.updateItem(req.user.id, id, body);
        return { success: true, item };
    }

    @UseGuards(JwtAuthGuard)
    @Delete('items/:id')
    async deleteItem(@Request() req, @Param('id') id: string) {
        await this.checkUidService.deleteItem(req.user.id, id);
        return { success: true };
    }

    @UseGuards(JwtAuthGuard)
    @Delete('items')
    async deleteAllItems(@Request() req, @Query('platform') platform?: string) {
        const result = await this.checkUidService.deleteAllItems(req.user.id, platform);
        return { success: true, deleted: result.count };
    }

    @UseGuards(JwtAuthGuard)
    @Post('items/:id/recheck')
    async recheckItem(@Request() req, @Param('id') id: string) {
        const item = await this.checkUidService.recheckItem(req.user.id, id);
        return { success: true, item };
    }

    // ============================================
    // USER — Stats & History
    // ============================================

    @UseGuards(JwtAuthGuard)
    @Get('stats')
    async getStats(@Request() req) {
        const stats = await this.checkUidService.getStats(req.user.id);
        return { success: true, ...stats };
    }

    @UseGuards(JwtAuthGuard)
    @Get('history')
    async getHistory(@Request() req, @Query() query: {
        itemId?: string;
        page?: string;
        limit?: string;
    }) {
        const result = await this.checkUidService.getHistory(req.user.id, {
            itemId: query.itemId,
            page: query.page ? parseInt(query.page) : 1,
            limit: query.limit ? parseInt(query.limit) : 50,
        });
        return { success: true, ...result };
    }

    // ============================================
    // USER — Telegram Link
    // ============================================

    @UseGuards(JwtAuthGuard)
    @Post('link-telegram')
    async linkTelegram(@Request() req, @Body() body: { telegramId: string }) {
        await this.checkUidService.linkTelegram(req.user.id, body.telegramId);
        return { success: true, message: 'Đã liên kết Telegram thành công' };
    }

    @UseGuards(JwtAuthGuard)
    @Delete('link-telegram')
    async unlinkTelegram(@Request() req) {
        await this.checkUidService.unlinkTelegram(req.user.id);
        return { success: true, message: 'Đã hủy liên kết Telegram' };
    }

    // ============================================
    // ADMIN — Plans Management
    // ============================================

    @UseGuards(JwtAuthGuard)
    @Get('admin/plans')
    async getAdminPlans(@Request() req) {
        if (req.user.role !== 'ADMIN') throw new Error('Unauthorized');
        const plans = await this.checkUidService.getPlans(false);
        return { success: true, plans };
    }

    @UseGuards(JwtAuthGuard)
    @Post('admin/plans')
    async createPlan(@Request() req, @Body() body: any) {
        if (req.user.role !== 'ADMIN') throw new Error('Unauthorized');
        const plan = await this.checkUidService.createPlan(body);
        return { success: true, plan };
    }

    @UseGuards(JwtAuthGuard)
    @Put('admin/plans/:id')
    async updatePlan(@Request() req, @Param('id') id: string, @Body() body: any) {
        if (req.user.role !== 'ADMIN') throw new Error('Unauthorized');
        const plan = await this.checkUidService.updatePlan(id, body);
        return { success: true, plan };
    }

    @UseGuards(JwtAuthGuard)
    @Delete('admin/plans/:id')
    async deletePlan(@Request() req, @Param('id') id: string) {
        if (req.user.role !== 'ADMIN') throw new Error('Unauthorized');
        await this.checkUidService.deletePlan(id);
        return { success: true };
    }

    @UseGuards(JwtAuthGuard)
    @Get('admin/stats')
    async getAdminStats(@Request() req) {
        if (req.user.role !== 'ADMIN') throw new Error('Unauthorized');
        const stats = await this.checkUidService.getAdminStats();
        return { success: true, ...stats };
    }
}
