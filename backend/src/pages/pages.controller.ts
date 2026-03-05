import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { PagesService } from './pages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../security/decorators/security.decorators';

/**
 * Public controller — get page by slug
 */
@Controller('pages')
@Public()
export class PublicPagesController {
    constructor(private pagesService: PagesService) { }

    @Get(':slug')
    async getBySlug(@Param('slug') slug: string) {
        const page = await this.pagesService.getBySlug(slug);
        if (!page) {
            throw new NotFoundException('Trang không tồn tại');
        }
        return { success: true, page };
    }
}

/**
 * Admin controller — CRUD pages
 */
@Controller('admin/pages')
@UseGuards(JwtAuthGuard)
export class AdminPagesController {
    constructor(private pagesService: PagesService) { }

    @Get()
    async getAll() {
        const pages = await this.pagesService.getAll();
        return { success: true, pages };
    }

    @Get(':id')
    async getById(@Param('id') id: string) {
        const page = await this.pagesService.getById(id);
        if (!page) throw new NotFoundException('Trang không tồn tại');
        return { success: true, page };
    }

    @Post()
    async create(@Body() body: {
        slug: string;
        title: string;
        content: string;
        description?: string;
        isPublished?: boolean;
    }) {
        const page = await this.pagesService.create(body);
        return { success: true, page };
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: {
        slug?: string;
        title?: string;
        content?: string;
        description?: string;
        isPublished?: boolean;
    }) {
        const page = await this.pagesService.update(id, body);
        return { success: true, page };
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.pagesService.delete(id);
        return { success: true };
    }
}
