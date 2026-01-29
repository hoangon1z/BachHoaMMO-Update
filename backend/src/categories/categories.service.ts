import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          take: 20,
          where: {
            status: 'ACTIVE',
          },
          include: {
            seller: {
              include: {
                sellerProfile: true,
              },
            },
            category: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          take: 20,
          where: {
            status: 'ACTIVE',
          },
          include: {
            seller: {
              include: {
                sellerProfile: true,
              },
            },
            category: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async create(data: { name: string; slug: string; description?: string; icon?: string; parentId?: string }) {
    return this.prisma.category.create({
      data,
    });
  }
}
