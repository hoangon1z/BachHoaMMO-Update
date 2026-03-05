import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto, UpdateBlogPostDto, CreateCommentDto, BlogQueryDto, BlogStatus } from './dto/blog.dto';
import { SeoService } from '../seo/seo.service';

@Injectable()
export class BlogService {
  constructor(
    private prisma: PrismaService,
    private seoService: SeoService,
  ) { }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async verifyAuthor(userId: string): Promise<void> {
    // Check if user is a verified seller
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile || !sellerProfile.isVerified) {
      throw new ForbiddenException('Chỉ seller đã xác minh mới có thể viết blog');
    }
  }

  // ============================================
  // PUBLIC METHODS (for readers)
  // ============================================

  async getPublicPosts(query: BlogQueryDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '12');
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'publishedAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = {
      status: 'PUBLISHED',
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.tag) {
      where.tags = { contains: query.tag };
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              sellerProfile: {
                select: {
                  shopName: true,
                  shopLogo: true,
                  isVerified: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : [],
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostBySlug(slug: string, userId?: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            sellerProfile: {
              select: {
                shopName: true,
                shopLogo: true,
                isVerified: true,
              },
            },
          },
        },
        comments: {
          where: { isHidden: false, parentId: null },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            replies: {
              where: { isHidden: false },
              orderBy: { createdAt: 'asc' },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post || post.status !== 'PUBLISHED') {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    // Increment view count
    await this.prisma.blogPost.update({
      where: { id: post.id },
      data: { views: { increment: 1 } },
    });

    // Check if user has liked/bookmarked this post
    let isLiked = false;
    let isBookmarked = false;

    if (userId) {
      const [like, bookmark] = await Promise.all([
        this.prisma.blogLike.findUnique({
          where: { postId_userId: { postId: post.id, userId } },
        }),
        this.prisma.blogBookmark.findUnique({
          where: { postId_userId: { postId: post.id, userId } },
        }),
      ]);
      isLiked = !!like;
      isBookmarked = !!bookmark;
    }

    return {
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
      isLiked,
      isBookmarked,
    };
  }

  async getPopularPosts(limit = 6) {
    const posts = await this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { views: 'desc' },
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            sellerProfile: {
              select: {
                shopName: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    return posts.map(post => ({
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    }));
  }

  async getCategories() {
    const posts = await this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', category: { not: null } },
      select: { category: true },
    });

    const categories = [...new Set(posts.map(p => p.category))].filter(Boolean);
    return categories;
  }

  async getTags() {
    const posts = await this.prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', tags: { not: null } },
      select: { tags: true },
    });

    const allTags: string[] = [];
    posts.forEach(p => {
      if (p.tags) {
        const parsed = JSON.parse(p.tags);
        if (Array.isArray(parsed)) {
          allTags.push(...parsed);
        }
      }
    });

    // Count frequency
    const tagCount: Record<string, number> = {};
    allTags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });

    return Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  // ============================================
  // AUTHOR METHODS (for sellers)
  // ============================================

  async createPost(userId: string, dto: CreateBlogPostDto) {
    await this.verifyAuthor(userId);

    // Generate unique slug
    let slug = this.generateSlug(dto.title);
    const existingSlug = await this.prisma.blogPost.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const post = await this.prisma.blogPost.create({
      data: {
        authorId: userId,
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        tags: dto.tags ? JSON.stringify(dto.tags) : null,
        category: dto.category,
        status: dto.status || 'DRAFT',
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Notify Google Indexing API when blog is published
    if (dto.status === 'PUBLISHED') {
      this.seoService.notifyBlogCreated(slug);
    }

    return {
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    };
  }

  async updatePost(userId: string, postId: string, dto: UpdateBlogPostDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài viết này');
    }

    // Generate new slug if title changed
    let slug = post.slug;
    if (dto.title && dto.title !== post.title) {
      slug = this.generateSlug(dto.title);
      const existingSlug = await this.prisma.blogPost.findFirst({
        where: { slug, id: { not: postId } },
      });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const updatedPost = await this.prisma.blogPost.update({
      where: { id: postId },
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
        category: dto.category,
        status: dto.status,
        publishedAt: dto.status === 'PUBLISHED' && !post.publishedAt ? new Date() : undefined,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Notify Google Indexing API when blog is newly published
    if (dto.status === 'PUBLISHED' && post.status !== 'PUBLISHED') {
      this.seoService.notifyBlogCreated(slug);
    }

    return {
      ...updatedPost,
      tags: updatedPost.tags ? JSON.parse(updatedPost.tags) : [],
    };
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài viết này');
    }

    await this.prisma.blogPost.delete({
      where: { id: postId },
    });

    return { message: 'Đã xóa bài viết' };
  }

  async getMyPosts(userId: string, query: BlogQueryDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const where: any = { authorId: userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : [],
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyPost(userId: string, postId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem bài viết này');
    }

    return {
      ...post,
      tags: post.tags ? JSON.parse(post.tags) : [],
    };
  }

  // ============================================
  // INTERACTION METHODS
  // ============================================

  async toggleLike(userId: string, postId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.status !== 'PUBLISHED') {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    const existingLike = await this.prisma.blogLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existingLike) {
      await this.prisma.blogLike.delete({
        where: { id: existingLike.id },
      });
      await this.prisma.blogPost.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      await this.prisma.blogLike.create({
        data: { postId, userId },
      });
      await this.prisma.blogPost.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  async toggleBookmark(userId: string, postId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.status !== 'PUBLISHED') {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    const existingBookmark = await this.prisma.blogBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existingBookmark) {
      await this.prisma.blogBookmark.delete({
        where: { id: existingBookmark.id },
      });
      await this.prisma.blogPost.update({
        where: { id: postId },
        data: { bookmarksCount: { decrement: 1 } },
      });
      return { bookmarked: false };
    } else {
      await this.prisma.blogBookmark.create({
        data: { postId, userId },
      });
      await this.prisma.blogPost.update({
        where: { id: postId },
        data: { bookmarksCount: { increment: 1 } },
      });
      return { bookmarked: true };
    }
  }

  async getBookmarkedPosts(userId: string, query: BlogQueryDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      this.prisma.blogBookmark.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  sellerProfile: {
                    select: {
                      shopName: true,
                      isVerified: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.blogBookmark.count({ where: { userId } }),
    ]);

    return {
      posts: bookmarks
        .filter(b => b.post.status === 'PUBLISHED')
        .map(b => ({
          ...b.post,
          tags: b.post.tags ? JSON.parse(b.post.tags) : [],
          bookmarkedAt: b.createdAt,
        })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // COMMENT METHODS
  // ============================================

  async addComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.status !== 'PUBLISHED') {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    // If replying, check parent exists
    if (dto.parentId) {
      const parent = await this.prisma.blogComment.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Bình luận gốc không hợp lệ');
      }
    }

    const comment = await this.prisma.blogComment.create({
      data: {
        postId,
        authorId: userId,
        content: dto.content,
        parentId: dto.parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update comments count
    await this.prisma.blogPost.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return comment;
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });

    if (!comment) {
      throw new NotFoundException('Bình luận không tồn tại');
    }

    // Only author or post owner can delete
    if (comment.authorId !== userId && comment.post.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bình luận này');
    }

    // Count replies to update counter
    const repliesCount = await this.prisma.blogComment.count({
      where: { parentId: commentId },
    });

    await this.prisma.blogComment.delete({
      where: { id: commentId },
    });

    // Update comments count (include replies)
    await this.prisma.blogPost.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 + repliesCount } },
    });

    return { message: 'Đã xóa bình luận' };
  }

  async getPostComments(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.blogComment.findMany({
        where: { postId, isHidden: false, parentId: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          replies: {
            where: { isHidden: false },
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.blogComment.count({ where: { postId, isHidden: false, parentId: null } }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Get all posts for admin (includes all statuses)
   */
  async getAllPostsAdmin(query: BlogQueryDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              sellerProfile: {
                select: {
                  shopName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        tags: post.tags ? JSON.parse(post.tags) : [],
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update post status (admin only)
   */
  async updatePostStatusAdmin(postId: string, status: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    const updatedPost = await this.prisma.blogPost.update({
      where: { id: postId },
      data: {
        status,
        publishedAt: status === 'PUBLISHED' && !post.publishedAt ? new Date() : undefined,
      },
    });

    return {
      ...updatedPost,
      tags: updatedPost.tags ? JSON.parse(updatedPost.tags) : [],
    };
  }

  /**
   * Delete post (admin only - can delete any post)
   */
  async deletePostAdmin(postId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    // Delete related records first
    await this.prisma.blogComment.deleteMany({ where: { postId } });
    await this.prisma.blogLike.deleteMany({ where: { postId } });
    await this.prisma.blogBookmark.deleteMany({ where: { postId } });

    await this.prisma.blogPost.delete({
      where: { id: postId },
    });

    return { message: 'Đã xóa bài viết' };
  }
}
