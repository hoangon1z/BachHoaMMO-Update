'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Image, Eye, EyeOff, X, Upload, Link2, Loader2, GripVertical } from 'lucide-react';
import { PageHeader, StatsCard, EmptyState, ConfirmDialog } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/Toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

function getImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
    return url;
}

interface CategoryShowcase {
    id: string;
    title: string;
    image: string;
    link: string;
    position: number;
    isActive: boolean;
}

export default function AdminCategoryShowcasesPage() {
    const toast = useToast();
    const [showcases, setShowcases] = useState<CategoryShowcase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<CategoryShowcase | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; itemId: string | null }>({ isOpen: false, itemId: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        image: '',
        link: '',
        position: 0,
        isActive: true,
    });
    const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchShowcases();
    }, []);

    const fetchShowcases = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/category-showcases', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setShowcases(data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const url = editingItem
            ? `/api/admin/category-showcases/${editingItem.id}`
            : '/api/admin/category-showcases';

        try {
            const response = await fetch(url, {
                method: editingItem ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success(editingItem ? 'Cập nhật thành công!' : 'Tạo showcase thành công!');
                setShowModal(false);
                resetForm();
                fetchShowcases();
            } else {
                toast.error('Có lỗi xảy ra');
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.itemId) return;
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/category-showcases/${deleteModal.itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                toast.success('Đã xóa showcase');
                fetchShowcases();
                setDeleteModal({ isOpen: false, itemId: null });
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra');
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleActive = async (item: CategoryShowcase) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/admin/category-showcases/${item.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !item.isActive }),
            });
            toast.success(item.isActive ? 'Đã ẩn' : 'Đã hiện');
            fetchShowcases();
        } catch (error) {
            toast.error('Có lỗi xảy ra');
        }
    };

    const resetForm = () => {
        setEditingItem(null);
        setFormData({ title: '', image: '', link: '', position: 0, isActive: true });
        setImageInputMode('url');
        setUploadPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file hình ảnh');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Kích thước file tối đa 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => setUploadPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);

            const response = await fetch(`${API_BASE_URL}/admin/upload/showcase`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload,
            });

            if (response.ok) {
                const data = await response.json();
                setFormData(prev => ({ ...prev, image: data.url }));
                toast.success('Upload hình ảnh thành công!');
            } else {
                toast.error('Lỗi khi upload hình ảnh');
                setUploadPreview(null);
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Lỗi khi upload hình ảnh');
            setUploadPreview(null);
        } finally {
            setIsUploading(false);
        }
    };

    const openEditModal = (item: CategoryShowcase) => {
        setEditingItem(item);
        setFormData({
            title: item.title,
            image: item.image,
            link: item.link,
            position: item.position,
            isActive: item.isActive,
        });
        setImageInputMode(item.image.startsWith('/uploads') ? 'upload' : 'url');
        setUploadPreview(null);
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Category Showcase"
                description="Quản lý các banner danh mục hiển thị trên trang chủ (kích thước ảnh: 568 × 296)"
                icon={<Image className="w-6 h-6" />}
                breadcrumbs={[{ label: 'Category Showcase' }]}
                actions={
                    <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-amber-500 hover:bg-amber-600 text-gray-900">
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm Showcase
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatsCard title="Tổng showcase" value={showcases.length} icon={<Image className="w-6 h-6" />} color="blue" />
                <StatsCard title="Đang hiển thị" value={showcases.filter(s => s.isActive).length} icon={<Eye className="w-6 h-6" />} color="green" />
                <StatsCard title="Đã ẩn" value={showcases.filter(s => !s.isActive).length} icon={<EyeOff className="w-6 h-6" />} color="orange" />
            </div>

            {/* Showcase List */}
            {isLoading ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12">
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500">Đang tải showcases...</p>
                    </div>
                </div>
            ) : showcases.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100">
                    <EmptyState
                        icon={<Image className="w-10 h-10 text-gray-400" />}
                        title="Chưa có showcase"
                        description="Tạo showcase đầu tiên để hiển thị trên trang chủ"
                        action={{ label: 'Thêm Showcase', onClick: () => { resetForm(); setShowModal(true); } }}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {showcases.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                            {/* Image */}
                            <div className="relative" style={{ aspectRatio: '568 / 296' }}>
                                {item.image ? (
                                    <img src={getImageUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <Image className="w-12 h-12 text-gray-300" />
                                    </div>
                                )}
                                {!item.isActive && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">Đã ẩn</span>
                                    </div>
                                )}
                                {/* Position badge */}
                                <div className="absolute top-2 left-2 w-7 h-7 bg-black/50 backdrop-blur-sm text-white rounded-lg flex items-center justify-center text-xs font-bold">
                                    {item.position}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                                <p className="text-xs text-gray-500 mt-1 truncate">{item.link}</p>
                                <div className="flex items-center gap-2 mt-3">
                                    <Button variant="ghost" size="sm" onClick={() => toggleActive(item)} className={item.isActive ? 'hover:bg-orange-50' : 'hover:bg-green-50'}>
                                        {item.isActive ? <EyeOff className="w-4 h-4 text-orange-500" /> : <Eye className="w-4 h-4 text-green-500" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="hover:bg-blue-50">
                                        <Edit className="w-4 h-4 text-blue-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ isOpen: true, itemId: item.id })} className="hover:bg-red-50">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Chỉnh sửa Showcase' : 'Thêm Showcase mới'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label>Tiêu đề *</Label>
                                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="VD: Ứng dụng VPN" className="h-11 rounded-xl" />
                            </div>

                            {/* Image Input Section */}
                            <div className="space-y-3">
                                <Label>Hình ảnh * <span className="text-gray-400 font-normal">(568 × 296 px)</span></Label>

                                {/* Toggle Buttons */}
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setImageInputMode('url')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${imageInputMode === 'url' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'}`}
                                    >
                                        <Link2 className="w-4 h-4" />Nhập URL
                                    </button>
                                    <button type="button" onClick={() => setImageInputMode('upload')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${imageInputMode === 'upload' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'}`}
                                    >
                                        <Upload className="w-4 h-4" />Upload từ máy
                                    </button>
                                </div>

                                {/* URL Input */}
                                {imageInputMode === 'url' && (
                                    <Input value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://example.com/image.jpg" className="h-11 rounded-xl" />
                                )}

                                {/* File Upload */}
                                {imageInputMode === 'upload' && (
                                    <div className="space-y-3">
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        {uploadPreview || formData.image ? (
                                            <div className="relative w-full bg-gray-100 rounded-xl overflow-hidden" style={{ aspectRatio: '568 / 296' }}>
                                                <img src={uploadPreview || getImageUrl(formData.image)} alt="Preview" className="w-full h-full object-cover" />
                                                {isUploading && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                    </div>
                                                )}
                                                <button type="button" onClick={() => { setUploadPreview(null); setFormData(prev => ({ ...prev, image: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                                                className="w-full border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors py-8"
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                        <span className="text-sm text-gray-500">Đang upload...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-8 h-8 text-gray-400" />
                                                        <span className="text-sm text-gray-500">Click để chọn hình ảnh</span>
                                                        <span className="text-xs text-gray-400">PNG, JPG, GIF tối đa 5MB • Kích thước 568 × 296</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {formData.image && (
                                    <p className="text-xs text-gray-500 truncate">URL hiện tại: {formData.image}</p>
                                )}
                            </div>

                            {/* Link */}
                            <div className="space-y-2">
                                <Label>Link điều hướng *</Label>
                                <Input value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} required placeholder="/explore?category=xxx" className="h-11 rounded-xl" />
                            </div>

                            {/* Position */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Vị trí hiển thị</Label>
                                    <Input type="number" value={formData.position} onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })} className="h-11 rounded-xl" />
                                </div>
                                <div className="space-y-2 flex items-end">
                                    <div className="flex items-center gap-2 h-11">
                                        <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 rounded" />
                                        <Label htmlFor="isActive">Hiển thị trên trang chủ</Label>
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            {formData.image && (
                                <div className="space-y-2">
                                    <Label>Xem trước</Label>
                                    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ aspectRatio: '568 / 296' }}>
                                        <img src={uploadPreview || getImageUrl(formData.image)} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setShowModal(false)}>Hủy</Button>
                                <Button type="submit" className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-900">{editingItem ? 'Cập nhật' : 'Tạo mới'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, itemId: null })} onConfirm={handleDelete} title="Xóa showcase" description="Bạn có chắc chắn muốn xóa showcase này?" confirmText="Xóa" variant="danger" isLoading={isDeleting} />
        </div>
    );
}
