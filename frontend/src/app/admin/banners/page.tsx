'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, Image, Eye, EyeOff, Package, X, Upload, Link2, Loader2 } from 'lucide-react';
import { PageHeader, StatsCard, EmptyState, ConfirmDialog } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/Toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Helper to get full image URL
function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
  return url;
}

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  link: string;
  gradient?: string;
  icon?: string;
  discount?: string;
  price?: string;
  originalPrice?: string;
  position: number;
  isActive: boolean;
}

const GRADIENTS = [
  { value: 'from-blue-600 to-purple-600', label: 'Blue to Purple' },
  { value: 'from-green-600 to-teal-600', label: 'Green to Teal' },
  { value: 'from-orange-600 to-red-600', label: 'Orange to Red' },
  { value: 'from-pink-600 to-purple-600', label: 'Pink to Purple' },
  { value: 'from-indigo-600 to-blue-600', label: 'Indigo to Blue' },
];

export default function AdminBannersPage() {
  const toast = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; bannerId: string | null }>({ isOpen: false, bannerId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    image: '',
    link: '',
    gradient: 'from-blue-600 to-purple-600',
    discount: '',
    price: '',
    originalPrice: '',
    isActive: true,
  });
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/banners', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
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
    const url = editingBanner 
      ? `/api/admin/banners/${editingBanner.id}`
      : '/api/admin/banners';
    
    try {
      const response = await fetch(url, {
        method: editingBanner ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingBanner ? 'Cập nhật thành công!' : 'Tạo banner thành công!');
        setShowModal(false);
        resetForm();
        fetchBanners();
      } else {
        toast.error('Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.bannerId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/banners/${deleteModal.bannerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Đã xóa banner');
        fetchBanners();
        setDeleteModal({ isOpen: false, bannerId: null });
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      toast.success(banner.isActive ? 'Đã ẩn banner' : 'Đã hiện banner');
      fetchBanners();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setFormData({ title: '', subtitle: '', description: '', image: '', link: '', gradient: 'from-blue-600 to-purple-600', discount: '', price: '', originalPrice: '', isActive: true });
    setImageInputMode('url');
    setUploadPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước file tối đa 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`${API_BASE_URL}/admin/upload/banner`, {
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

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({ title: banner.title, subtitle: banner.subtitle || '', description: banner.description || '', image: banner.image, link: banner.link, gradient: banner.gradient || 'from-blue-600 to-purple-600', discount: banner.discount || '', price: banner.price || '', originalPrice: banner.originalPrice || '', isActive: banner.isActive });
    // Check if existing image is a local upload or external URL
    setImageInputMode(banner.image.startsWith('/uploads') ? 'upload' : 'url');
    setUploadPreview(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Banner"
        description="Quản lý các banner hiển thị trên trang chủ"
        icon={<Image className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Banners' }]}
        actions={
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-amber-500 hover:bg-amber-600 text-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Thêm Banner
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Tổng banner" value={banners.length} icon={<Image className="w-6 h-6" />} color="blue" />
        <StatsCard title="Đang hiển thị" value={banners.filter(b => b.isActive).length} icon={<Eye className="w-6 h-6" />} color="green" />
        <StatsCard title="Đã ẩn" value={banners.filter(b => !b.isActive).length} icon={<EyeOff className="w-6 h-6" />} color="orange" />
      </div>

      {/* Banners List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Đang tải banners...</p>
          </div>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState icon={<Image className="w-10 h-10 text-gray-400" />} title="Chưa có banner" description="Tạo banner đầu tiên để hiển thị trên trang chủ" action={{ label: 'Thêm Banner', onClick: () => { resetForm(); setShowModal(true); } }} />
        </div>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
              <div className="flex flex-col md:flex-row">
                <div className={`w-full md:w-72 h-44 bg-gradient-to-br ${banner.gradient} p-4 flex items-center justify-center relative`}>
                  {banner.image ? <img src={getImageUrl(banner.image)} alt={banner.title} className="max-h-full max-w-full object-contain" /> : <Package className="w-12 h-12 text-white/80" />}
                  {!banner.isActive && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white font-bold text-lg">Đã ẩn</span></div>}
                </div>
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{banner.title}</h3>
                      {banner.subtitle && <p className="text-gray-600">{banner.subtitle}</p>}
                      <p className="text-sm text-gray-500 mt-2">Link: {banner.link}</p>
                      {banner.price && <p className="text-indigo-600 font-bold mt-2">{banner.price} {banner.originalPrice && <span className="text-gray-400 line-through ml-2 font-normal">{banner.originalPrice}</span>}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(banner)} className={banner.isActive ? 'hover:bg-orange-50' : 'hover:bg-green-50'}>{banner.isActive ? <EyeOff className="w-4 h-4 text-orange-500" /> : <Eye className="w-4 h-4 text-green-500" />}</Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(banner)} className="hover:bg-blue-50"><Edit className="w-4 h-4 text-blue-500" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ isOpen: true, bannerId: banner.id })} className="hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingBanner ? 'Chỉnh sửa Banner' : 'Thêm Banner mới'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Tiêu đề *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="h-11 rounded-xl" /></div>
                <div className="space-y-2"><Label>Phụ đề</Label><Input value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} className="h-11 rounded-xl" /></div>
              </div>
              {/* Image Input Section */}
              <div className="space-y-3">
                <Label>Hình ảnh *</Label>
                
                {/* Toggle Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImageInputMode('url')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageInputMode === 'url'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <Link2 className="w-4 h-4" />
                    Nhập URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode('upload')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageInputMode === 'upload'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload từ máy
                  </button>
                </div>

                {/* URL Input */}
                {imageInputMode === 'url' && (
                  <Input 
                    value={formData.image} 
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })} 
                    placeholder="https://example.com/image.jpg"
                    className="h-11 rounded-xl" 
                  />
                )}

                {/* File Upload */}
                {imageInputMode === 'upload' && (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    {uploadPreview || formData.image ? (
                      <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden">
                        <img 
                          src={uploadPreview || getImageUrl(formData.image)} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                        />
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadPreview(null);
                            setFormData(prev => ({ ...prev, image: '' }));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
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
                            <span className="text-xs text-gray-400">PNG, JPG, GIF tối đa 5MB</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Show current image URL if exists */}
                {formData.image && (
                  <p className="text-xs text-gray-500 truncate">
                    URL hiện tại: {formData.image}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Link điều hướng *</Label>
                <Input value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} required placeholder="/products hoặc https://..." className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Gradient</Label><select value={formData.gradient} onChange={(e) => setFormData({ ...formData, gradient: e.target.value })} className="w-full h-11 px-3 border border-gray-200 rounded-xl">{GRADIENTS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
                <div className="space-y-2"><Label>Giá</Label><Input value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="99.000đ" className="h-11 rounded-xl" /></div>
                <div className="space-y-2"><Label>Giá gốc</Label><Input value={formData.originalPrice} onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} placeholder="199.000đ" className="h-11 rounded-xl" /></div>
              </div>
              <div className="flex items-center gap-2"><input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 rounded" /><Label htmlFor="isActive">Hiển thị banner</Label></div>
              <div className="space-y-2"><Label>Xem trước</Label><div className={`h-32 bg-gradient-to-br ${formData.gradient} rounded-xl p-4 flex items-center relative overflow-hidden`}>{formData.image && <img src={uploadPreview || getImageUrl(formData.image)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />}<div className="text-white relative z-10"><h3 className="text-xl font-bold">{formData.title || 'Tiêu đề'}</h3><p className="text-white/80">{formData.subtitle || 'Phụ đề'}</p></div></div></div>
              <div className="flex gap-3 pt-4"><Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setShowModal(false)}>Hủy</Button><Button type="submit" className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-900">{editingBanner ? 'Cập nhật' : 'Tạo mới'}</Button></div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, bannerId: null })} onConfirm={handleDelete} title="Xóa banner" description="Bạn có chắc chắn muốn xóa banner này?" confirmText="Xóa" variant="danger" isLoading={isDeleting} />
    </div>
  );
}
