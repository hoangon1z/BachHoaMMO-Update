'use client';

import Link from 'next/link';
import { Eye, Heart, MessageCircle, Calendar, FileText } from 'lucide-react';
import { BlogPost } from '@/lib/blog-api';

interface BlogCardProps {
  post: BlogPost;
  variant?: 'default' | 'horizontal' | 'compact';
}

export function BlogCard({ post, variant = 'default' }: BlogCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (variant === 'horizontal') {
    return (
      <Link href={`/blogs/${post.slug}`} className="block group">
        <article className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
          {post.coverImage ? (
            <div className="w-32 h-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
              />
            </div>
          ) : (
            <div className="w-32 h-24 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-gray-700 transition-colors">
              {post.title}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>{formatDate(post.publishedAt || post.createdAt)}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {post.views}
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={`/blogs/${post.slug}`} className="block group">
        <article className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0">
          <div className="w-9 h-9 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 line-clamp-1 group-hover:text-gray-700 transition-colors">
              {post.title}
            </h4>
            <p className="text-xs text-gray-500">{post.views} lượt xem</p>
          </div>
        </article>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/blogs/${post.slug}`} className="block group">
      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
        {/* Cover Image */}
        <div className="aspect-[16/9] relative overflow-hidden bg-gray-100">
          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-gray-300" />
            </div>
          )}
          {post.category && (
            <span className="absolute top-3 left-3 px-2 py-1 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded">
              {post.category}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-gray-700 transition-colors mb-2">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.excerpt}</p>
          )}

          <div className="flex items-center gap-2 mb-3">
            {post.author?.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium">
                {(post.author?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-600">
              {post.author?.sellerProfile?.shopName || post.author?.name || 'Unknown'}
            </span>
            {post.author?.sellerProfile?.isVerified && (
              <span className="text-gray-400 text-xs" title="Đã xác minh">*</span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(post.publishedAt || post.createdAt)}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {post.views}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {post.likesCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> {post.commentsCount}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
