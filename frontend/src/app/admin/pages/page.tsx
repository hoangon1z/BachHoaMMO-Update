'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    FileText, Plus, Pencil, Trash2, Save, Loader2, Eye, EyeOff,
    ArrowLeft, X, Globe, Code
} from 'lucide-react';

interface Page {
    id: string;
    slug: string;
    title: string;
    content: string;
    description?: string;
    isPublished: boolean;
    updatedAt: string;
}

export default function AdminPagesPage() {
    const router = useRouter();
    const { user, token, checkAuth } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [pages, setPages] = useState<Page[]>([]);
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [previewMode, setPreviewMode] = useState(false);

    // Form state
    const [form, setForm] = useState({ slug: '', title: '', content: '', description: '', isPublished: true });

    useEffect(() => {
        const init = async () => { await checkAuth(); fetchPages(); };
        init();
    }, []);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/');
    }, [user, isLoading]);

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/admin/pages', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setPages(data.pages);
        } catch { }
        finally { setIsLoading(false); }
    };

    const handleCreate = () => {
        setForm({ slug: '', title: '', content: '', description: '', isPublished: true });
        setIsCreating(true);
        setEditingPage(null);
        setPreviewMode(false);
    };

    const handleEdit = (page: Page) => {
        setForm({
            slug: page.slug,
            title: page.title,
            content: page.content,
            description: page.description || '',
            isPublished: page.isPublished,
        });
        setEditingPage(page);
        setIsCreating(false);
        setPreviewMode(false);
    };

    const handleSave = async () => {
        if (!form.slug || !form.title || !form.content) {
            setMessage({ type: 'error', text: 'Vui lòng điền slug, tiêu đề và nội dung' });
            return;
        }
        setIsSaving(true);
        setMessage(null);
        try {
            const url = editingPage ? `/api/admin/pages/${editingPage.id}` : '/api/admin/pages';
            const method = editingPage ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: editingPage ? 'Đã cập nhật!' : 'Đã tạo trang mới!' });
                fetchPages();
                setEditingPage(null);
                setIsCreating(false);
            } else {
                setMessage({ type: 'error', text: data.message || 'Lỗi xảy ra' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Không thể lưu' });
        } finally { setIsSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa trang này?')) return;
        try {
            await fetch(`/api/admin/pages/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchPages();
            setMessage({ type: 'success', text: 'Đã xóa' });
        } catch { }
    };

    const handleCancel = () => {
        setEditingPage(null);
        setIsCreating(false);
        setPreviewMode(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Show editor
    if (editingPage || isCreating) {
        return (
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button onClick={handleCancel} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${previewMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {previewMode ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {previewMode ? 'Chỉnh sửa' : 'Xem trước'}
                        </button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Lưu
                        </Button>
                    </div>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Meta fields */}
                <div className="bg-card rounded-xl border p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Slug (URL)</Label>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400">/page/</span>
                                <Input
                                    placeholder="terms"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Tiêu đề</Label>
                            <Input
                                placeholder="Điều khoản dịch vụ"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Mô tả SEO</Label>
                            <Input
                                placeholder="Mô tả ngắn cho Google"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="text-sm"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.isPublished}
                                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                                className="rounded"
                            />
                            <Globe className="w-3.5 h-3.5 text-green-600" /> Xuất bản
                        </label>
                    </div>
                </div>

                {/* Content editor / Preview */}
                <div className="bg-card rounded-xl border overflow-hidden" style={{ minHeight: '500px' }}>
                    {previewMode ? (
                        <div className="p-6 sm:p-8">
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">{form.title || 'Tiêu đề'}</h1>
                            <div
                                className="prose prose-sm max-w-none text-gray-600 leading-relaxed
                  prose-headings:font-bold prose-headings:text-gray-900
                  prose-a:text-blue-600 prose-ul:list-disc prose-ol:list-decimal
                  prose-li:my-0.5 prose-p:my-2
                  prose-blockquote:border-l-2 prose-blockquote:border-blue-400 prose-blockquote:pl-3
                  prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded prose-pre:p-3
                  prose-img:rounded prose-img:my-3"
                                dangerouslySetInnerHTML={{ __html: form.content }}
                            />
                        </div>
                    ) : (
                        <textarea
                            value={form.content}
                            onChange={(e) => setForm({ ...form, content: e.target.value })}
                            placeholder="Nhập nội dung HTML ở đây...&#10;&#10;Ví dụ:&#10;<h2>1. Giới thiệu</h2>&#10;<p>Chào mừng bạn đến với BachHoaMMO...</p>&#10;<ul>&#10;  <li>Điều khoản 1</li>&#10;  <li>Điều khoản 2</li>&#10;</ul>"
                            className="w-full h-full min-h-[500px] p-4 sm:p-6 text-sm font-mono bg-gray-50 border-0 resize-none focus:outline-none focus:ring-0"
                            style={{ tabSize: 2 }}
                        />
                    )}
                </div>
            </div>
        );
    }

    // Pages list
    return (
        <div className="space-y-6">
            <PageHeader
                title="Quản lý trang"
                description="Tạo và chỉnh sửa nội dung các trang chính sách, hướng dẫn"
                icon={<FileText className="w-8 h-8" />}
                actions={
                    <Button onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" /> Tạo trang mới
                    </Button>
                }
            />

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            {pages.length === 0 ? (
                <div className="bg-card rounded-xl border p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">Chưa có trang nào</p>
                    <Button onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" /> Tạo trang đầu tiên
                    </Button>
                </div>
            ) : (
                <div className="bg-card rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Tiêu đề</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Slug</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Trạng thái</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Cập nhật</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {pages.map((page) => (
                                <tr key={page.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{page.title}</td>
                                    <td className="px-4 py-3">
                                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-blue-600">/{page.slug}</code>
                                    </td>
                                    <td className="px-4 py-3">
                                        {page.isPublished ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                                <Eye className="w-3 h-3" /> Xuất bản
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                <EyeOff className="w-3 h-3" /> Ẩn
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {new Date(page.updatedAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <a
                                                href={`/page/${page.slug}`}
                                                target="_blank"
                                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                                                title="Xem"
                                            >
                                                <Globe className="w-3.5 h-3.5" />
                                            </a>
                                            <button
                                                onClick={() => handleEdit(page)}
                                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                                                title="Sửa"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(page.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
