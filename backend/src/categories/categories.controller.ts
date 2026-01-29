import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Public } from '../security/decorators/security.decorators';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @Public() // Allow public access to list categories
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @Public() // Allow public access to view category details
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  @Public() // Allow public access to view category by slug
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Post()
  // POST requires authentication (no @Public decorator)
  create(@Body() data: { name: string; slug: string; description?: string; icon?: string; parentId?: string }) {
    return this.categoriesService.create(data);
  }
}
