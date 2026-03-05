import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PagesService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get a page by slug (public)
     */
    async getBySlug(slug: string) {
        return this.prisma.page.findUnique({
            where: { slug, isPublished: true },
        });
    }

    /**
     * Get all pages (admin)
     */
    async getAll() {
        return this.prisma.page.findMany({
            orderBy: { updatedAt: 'desc' },
        });
    }

    /**
     * Get page by ID (admin)
     */
    async getById(id: string) {
        return this.prisma.page.findUnique({ where: { id } });
    }

    /**
     * Create a page
     */
    async create(data: {
        slug: string;
        title: string;
        content: string;
        description?: string;
        isPublished?: boolean;
    }) {
        return this.prisma.page.create({ data });
    }

    /**
     * Update a page
     */
    async update(id: string, data: {
        slug?: string;
        title?: string;
        content?: string;
        description?: string;
        isPublished?: boolean;
    }) {
        return this.prisma.page.update({ where: { id }, data });
    }

    /**
     * Delete a page
     */
    async delete(id: string) {
        return this.prisma.page.delete({ where: { id } });
    }
}
