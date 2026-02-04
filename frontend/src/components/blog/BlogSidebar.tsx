'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Tag, Folder, TrendingUp, Bookmark } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { BlogPost, getPopularPosts, getCategories, getTags } from '@/lib/blog-api';
import { BlogCard } from './BlogCard';

interface BlogSidebarProps {
  onSearch?: (query: string) => void;
  onCategorySelect?: (category: string | null) => void;
  onTagSelect?: (tag: string | null) => void;
  selectedCategory?: string | null;
  selectedTag?: string | null;
}

export function BlogSidebar({
  onSearch,
  onCategorySelect,
  onTagSelect,
  selectedCategory,
  selectedTag,
}: BlogSidebarProps) {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [popularPosts, setPopularPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    try {
      const [postsData, categoriesData, tagsData] = await Promise.all([
        getPopularPosts(5),
        getCategories(),
        getTags(),
      ]);
      setPopularPosts(postsData);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading sidebar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <aside className="space-y-6">
      {/* Search */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
        </form>
      </div>

      {/* Quick Actions */}
      {user && (
        <div className="bg-gray-900 rounded-lg p-4 text-white">
          <h3 className="font-medium text-sm mb-2">Chia sẻ kiến thức</h3>
          <p className="text-sm text-gray-300 mb-3">
            Bạn có kinh nghiệm muốn chia sẻ với cộng đồng?
          </p>
          {user.isSeller ? (
            <Link
              href="/seller/blogs/new"
              className="block w-full py-2.5 bg-white text-gray-900 font-medium text-sm text-center rounded border border-transparent hover:bg-gray-100 transition-colors"
            >
              Viết bài mới
            </Link>
          ) : (
            <Link
              href="/become-seller"
              className="block w-full py-2.5 border border-gray-500 text-gray-200 font-medium text-sm text-center rounded hover:bg-gray-800 transition-colors"
            >
              Đăng ký bán hàng để viết blog
            </Link>
          )}
        </div>
      )}

      {/* Bookmarks */}
      {user && (
        <Link
          href="/blogs/bookmarks"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <div className="p-2 bg-gray-100 rounded">
            <Bookmark className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 text-sm">Bài viết đã lưu</h4>
            <p className="text-xs text-gray-500">Xem các bài viết bạn đã bookmark</p>
          </div>
        </Link>
      )}

      {/* Categories */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Folder className="w-4 h-4 text-gray-500" /> Danh mục
        </h3>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => onCategorySelect?.(null)}
              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                !selectedCategory
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategorySelect?.(cat)}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Chưa có danh mục</p>
        )}
      </div>

      {/* Popular Tags */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-500" /> Tags phổ biến
        </h3>
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 10).map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagSelect?.(selectedTag === tag ? null : tag)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedTag === tag
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                }`}
              >
                #{tag}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Chưa có tags</p>
        )}
      </div>

      {/* Popular Posts */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" /> Bài viết nổi bật
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-16 h-12 bg-gray-100 rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : popularPosts.length > 0 ? (
          <div className="space-y-2">
            {popularPosts.map((post) => (
              <BlogCard key={post.id} post={post} variant="compact" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Chưa có bài viết</p>
        )}
      </div>
    </aside>
  );
}
