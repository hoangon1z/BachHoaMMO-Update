import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBlogPostDto, UpdateBlogPostDto, CreateCommentDto, BlogQueryDto } from './dto/blog.dto';

// Custom decorator for optional auth
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OptionalUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@Controller('blog')
export class BlogController {
  constructor(private blogService: BlogService) {}

  // ============================================
  // PUBLIC ENDPOINTS (no auth required)
  // ============================================

  /**
   * Get all published blog posts
   * GET /blog/posts
   */
  @Get('posts')
  async getPosts(@Query() query: BlogQueryDto) {
    return this.blogService.getPublicPosts(query);
  }

  /**
   * Get popular posts
   * GET /blog/posts/popular
   */
  @Get('posts/popular')
  async getPopularPosts(@Query('limit') limit?: string) {
    return this.blogService.getPopularPosts(limit ? parseInt(limit) : 6);
  }

  /**
   * Get all categories
   * GET /blog/categories
   */
  @Get('categories')
  async getCategories() {
    return this.blogService.getCategories();
  }

  /**
   * Get popular tags
   * GET /blog/tags
   */
  @Get('tags')
  async getTags() {
    return this.blogService.getTags();
  }

  /**
   * Get post by slug
   * GET /blog/posts/:slug
   */
  @Get('posts/slug/:slug')
  async getPostBySlug(@Param('slug') slug: string, @Request() req) {
    // Try to extract user ID from token if present
    let userId: string | undefined;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.sub;
      }
    } catch (e) {
      // No valid token, that's fine
    }
    return this.blogService.getPostBySlug(slug, userId);
  }

  /**
   * Get comments for a post
   * GET /blog/posts/:id/comments
   */
  @Get('posts/:id/comments')
  async getPostComments(
    @Param('id') postId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.getPostComments(
      postId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ============================================
  // AUTHENTICATED ENDPOINTS
  // ============================================

  /**
   * Toggle like on a post
   * POST /blog/posts/:id/like
   */
  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param('id') postId: string, @Request() req) {
    return this.blogService.toggleLike(req.user.id, postId);
  }

  /**
   * Toggle bookmark on a post
   * POST /blog/posts/:id/bookmark
   */
  @Post('posts/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  async toggleBookmark(@Param('id') postId: string, @Request() req) {
    return this.blogService.toggleBookmark(req.user.id, postId);
  }

  /**
   * Get user's bookmarked posts
   * GET /blog/bookmarks
   */
  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  async getBookmarks(@Request() req, @Query() query: BlogQueryDto) {
    return this.blogService.getBookmarkedPosts(req.user.id, query);
  }

  /**
   * Add comment to a post
   * POST /blog/posts/:id/comments
   */
  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
    @Request() req,
  ) {
    return this.blogService.addComment(req.user.id, postId, dto);
  }

  /**
   * Delete a comment
   * DELETE /blog/comments/:id
   */
  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('id') commentId: string, @Request() req) {
    return this.blogService.deleteComment(req.user.id, commentId);
  }

  // ============================================
  // SELLER/AUTHOR ENDPOINTS
  // ============================================

  /**
   * Get my blog posts (as seller)
   * GET /blog/my-posts
   */
  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  async getMyPosts(@Request() req, @Query() query: BlogQueryDto) {
    return this.blogService.getMyPosts(req.user.id, query);
  }

  /**
   * Get single post for editing
   * GET /blog/my-posts/:id
   */
  @Get('my-posts/:id')
  @UseGuards(JwtAuthGuard)
  async getMyPost(@Param('id') postId: string, @Request() req) {
    return this.blogService.getMyPost(req.user.id, postId);
  }

  /**
   * Create a new blog post
   * POST /blog/posts
   */
  @Post('posts')
  @UseGuards(JwtAuthGuard)
  async createPost(@Body() dto: CreateBlogPostDto, @Request() req) {
    return this.blogService.createPost(req.user.id, dto);
  }

  /**
   * Update a blog post
   * PUT /blog/posts/:id
   */
  @Put('posts/:id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param('id') postId: string,
    @Body() dto: UpdateBlogPostDto,
    @Request() req,
  ) {
    return this.blogService.updatePost(req.user.id, postId, dto);
  }

  /**
   * Delete a blog post
   * DELETE /blog/posts/:id
   */
  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id') postId: string, @Request() req) {
    return this.blogService.deletePost(req.user.id, postId);
  }
}
