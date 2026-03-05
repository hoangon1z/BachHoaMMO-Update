import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SeoModule } from '../seo/seo.module';

@Module({
  imports: [PrismaModule, SeoModule],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule { }
