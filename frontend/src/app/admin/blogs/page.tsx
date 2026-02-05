'use client';

import { useState, useEffect } from 'react';
import {
    FileText,
    Search,
    Filter,
    Trash2,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    ExternalLink,
    Loader2,
    MoreVertical,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Simple date formatter
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return date.toLocaleDateString('vi-VN');
};

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    coverImage: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    views: number;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    publishedAt: string | null;
    author: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        sellerProfile?: {
            shopName: string;
        };
    };
}

const statusConfig = {
    DRAFT: { label: 'Nháp', color: 'bg-gray-100 text-gray-700', icon: Clock },
    PUBLISHED: { label: 'Đã đăng', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    ARCHIVED: { label: 'Lưu trữ', color: 'bg-amber-100 text-amber-700', icon: XCircle },
};

export default function AdminBlogsPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showActions, setShowActions] = useState<string | null>(null);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: '20',
            });
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter) params.append('status', statusFilter);

            const response = await fetch(`/api/admin/blogs?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts);
                setPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }));
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [pagination.page, statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchPosts();
    };

    const updateStatus = async (postId: string, newStatus: string) => {
        try {
            setActionLoading(postId);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/blogs/${postId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                fetchPosts();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setActionLoading(null);
            setShowActions(null);
        }
    };

    const deletePost = async (postId: string) => {
        if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;

        try {
            setActionLoading(postId);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/blogs/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                fetchPosts();
            }
        } catch (error) {
            console.error('Error deleting post:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const stats = {
        total: posts.length,
        published: posts.filter(p => p.status === 'PUBLISHED').length,
        draft: posts.filter(p => p.status === 'DRAFT').length,
        archived: posts.filter(p => p.status === 'ARCHIVED').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Quản lý Blog</h1>
                        <p className="text-sm text-gray-500">Quản lý tất cả bài viết từ sellers</p>
                    </div>
                </div>
                <Button onClick={fetchPosts} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Làm mới
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-500">Tổng bài viết</p>
                    <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-500">Đã đăng</p>
                    <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-500">Bản nháp</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-500">Lưu trữ</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.archived}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo tiêu đề..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <Button type="submit" variant="outline">Tìm</Button>
                    </form>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="PUBLISHED">Đã đăng</option>
                            <option value="DRAFT">Bản nháp</option>
                            <option value="ARCHIVED">Lưu trữ</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Posts List */}
            <div className="bg-white rounded-lg border">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
                        <p className="text-gray-500 mt-2">Đang tải...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 mx-auto text-gray-300" />
                        <p className="text-gray-500 mt-2">Không có bài viết nào</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {posts.map((post) => {
                            const StatusIcon = statusConfig[post.status].icon;
                            return (
                                <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex gap-4">
                                        {/* Cover Image */}
                                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                            {post.coverImage ? (
                                                <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-gray-300" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                                                    <p className="text-sm text-gray-500 truncate">{post.excerpt || 'Không có mô tả'}</p>
                                                </div>
                                                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[post.status].color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusConfig[post.status].label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span>👤 {post.author?.name || post.author?.email}</span>
                                                {post.author?.sellerProfile?.shopName && (
                                                    <span>🏪 {post.author.sellerProfile.shopName}</span>
                                                )}
                                                <span>👁 {post.views} views</span>
                                                <span>❤️ {post.likesCount}</span>
                                                <span>💬 {post.commentsCount}</span>
                                                <span>
                                                    {formatDate(post.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <a
                                                href={`/blogs/${post.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Xem bài viết"
                                            >
                                                <ExternalLink className="w-4 h-4 text-gray-500" />
                                            </a>

                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowActions(showActions === post.id ? null : post.id)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    {actionLoading === post.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <MoreVertical className="w-4 h-4 text-gray-500" />
                                                    )}
                                                </button>

                                                {showActions === post.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                                                        <div className="p-1">
                                                            {post.status !== 'PUBLISHED' && (
                                                                <button
                                                                    onClick={() => updateStatus(post.id, 'PUBLISHED')}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-50 text-green-600 rounded"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    Đăng công khai
                                                                </button>
                                                            )}
                                                            {post.status !== 'DRAFT' && (
                                                                <button
                                                                    onClick={() => updateStatus(post.id, 'DRAFT')}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded"
                                                                >
                                                                    <Clock className="w-4 h-4" />
                                                                    Chuyển về nháp
                                                                </button>
                                                            )}
                                                            {post.status !== 'ARCHIVED' && (
                                                                <button
                                                                    onClick={() => updateStatus(post.id, 'ARCHIVED')}
                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-amber-50 text-amber-600 rounded"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                    Lưu trữ
                                                                </button>
                                                            )}
                                                            <hr className="my-1" />
                                                            <button
                                                                onClick={() => deletePost(post.id)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 text-red-600 rounded"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Xóa bài viết
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="p-4 border-t flex items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        >
                            Trước
                        </Button>
                        <span className="text-sm text-gray-500">
                            Trang {pagination.page} / {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        >
                            Sau
                        </Button>
                    </div>
                )}
            </div>

            {/* Click outside to close actions */}
            {showActions && (
                <div className="fixed inset-0 z-0" onClick={() => setShowActions(null)} />
            )}
        </div>
    );
}
