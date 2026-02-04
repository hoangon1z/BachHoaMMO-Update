'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FileText, Filter, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogSidebar } from '@/components/blog/BlogSidebar';
import { BlogPost, getPublicPosts, BlogPagination } from '@/lib/blog-api';
import { useAuthStore } from '@/store/authStore';

export function BlogsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState<BlogPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(
    searchParams.get('tag')
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1')
  );

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getPublicPosts({
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        tag: selectedTag || undefined,
        page: currentPage,
        limit: 12,
      });
      setPosts(result.posts);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedTag, currentPage]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedTag) params.set('tag', selectedTag);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const newUrl = params.toString() ? `/blogs?${params}` : '/blogs';
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, selectedCategory, selectedTag, currentPage, router]);

  const handleBlogSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const handleTagSelect = (tag: string | null) => {
    setSelectedTag(tag);
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedTag(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedTag;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <main className="flex-1">
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Blog
            </h1>
            <p className="mt-1 text-gray-500 text-sm">
              Kiến thức và kinh nghiệm từ cộng đồng Seller
            </p>
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md">
                    Tìm: &quot;{searchQuery}&quot;
                    <button type="button" onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-gray-200 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md">
                    {selectedCategory}
                    <button type="button" onClick={() => setSelectedCategory(null)} className="p-0.5 hover:bg-gray-200 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {selectedTag && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md">
                    #{selectedTag}
                    <button type="button" onClick={() => setSelectedTag(null)} className="p-0.5 hover:bg-gray-200 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-900 underline"
                >
                  Xóa tất cả
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Bộ lọc
            </button>

            <div className="hidden lg:block w-80 flex-shrink-0">
              <BlogSidebar
                onSearch={handleBlogSearch}
                onCategorySelect={handleCategorySelect}
                onTagSelect={handleTagSelect}
                selectedCategory={selectedCategory}
                selectedTag={selectedTag}
              />
            </div>

            <div className="flex-1">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="aspect-[16/9] bg-gray-100 animate-pulse" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : posts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {posts.map((post) => (
                      <BlogCard key={post.id} post={post} />
                    ))}
                  </div>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Trước
                      </button>

                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (pagination.totalPages <= 7) return true;
                          if (page === 1 || page === pagination.totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, index, arr) => {
                          const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`w-10 h-10 rounded-md text-sm font-medium ${
                                  currentPage === page
                                    ? 'bg-gray-900 text-white'
                                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}

                      <button
                        type="button"
                        onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                        disabled={currentPage === pagination.totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Sau
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 border border-gray-200 rounded-lg bg-gray-50/50">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Chưa có bài viết nào
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {hasActiveFilters
                      ? 'Không tìm thấy bài viết phù hợp với bộ lọc.'
                      : 'Hãy quay lại sau để xem các bài viết mới.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-gray-900 font-medium hover:underline text-sm"
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowMobileFilters(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-80 max-w-full bg-white overflow-y-auto border-l border-gray-200">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Bộ lọc</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <BlogSidebar
                  onSearch={handleBlogSearch}
                  onCategorySelect={handleCategorySelect}
                  onTagSelect={handleTagSelect}
                  selectedCategory={selectedCategory}
                  selectedTag={selectedTag}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
