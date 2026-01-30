'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Image, Plus, X, Trash2, Percent, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const COMMISSION_OPTIONS = [1, 2, 3, 4, 5];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [commission, setCommission] = useState<number>(5);
  const [customCommission, setCustomCommission] = useState<string>('');
  const [useCustomCommission, setUseCustomCommission] = useState(false);
  const [autoDelivery, setAutoDelivery] = useState(true); // Chế độ giao hàng
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    salePrice: '',
    stock: '',
    categoryId: '',
    status: 'ACTIVE',
    images: [''],
    tags: '',
  });

  useEffect(() => {
    Promise.all([fetchCategories(), fetchProduct()]);
  }, [productId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/seller/products/${productId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const product = await response.json();
        let images: string[] = [''];
        try {
          images = JSON.parse(product.images);
          if (images.length === 0) images = [''];
        } catch {}

        setFormData({
          title: product.title || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          salePrice: product.salePrice?.toString() || '',
          stock: product.stock?.toString() || '',
          categoryId: product.categoryId || '',
          status: product.status || 'ACTIVE',
          images,
          tags: product.tags || '',
        });
        
        // Set commission
        const productCommission = product.commission || 5;
        if (COMMISSION_OPTIONS.includes(productCommission)) {
          setCommission(productCommission);
          setUseCustomCommission(false);
        } else {
          setCustomCommission(productCommission.toString());
          setUseCustomCommission(true);
        }
        
        // Set autoDelivery
        setAutoDelivery(product.autoDelivery !== false); // Default true if not set
      } else {
        setError('Không tìm thấy sản phẩm');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageAdd = () => {
    setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
  };

  const handleImageRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleImageChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? value : img)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.description || !formData.price || !formData.stock || !formData.categoryId) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const validImages = formData.images.filter(img => img.trim());
      
      // Get final commission value
      const finalCommission = useCustomCommission && customCommission 
        ? parseFloat(customCommission) 
        : commission;

      const response = await fetch(
        `/api/seller/products/${productId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            price: parseFloat(formData.price),
            salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
            stock: parseInt(formData.stock),
            categoryId: formData.categoryId,
            status: formData.status,
            images: JSON.stringify(validImages.length > 0 ? validImages : ['/placeholder.jpg']),
            tags: formData.tags || null,
            commission: Math.max(0, Math.min(100, finalCommission)),
            autoDelivery, // Chế độ giao hàng
          }),
        }
      );

      if (response.ok) {
        router.push('/seller/products');
      } else {
        const data = await response.json();
        setError(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này? Sản phẩm sẽ được ẩn khỏi cửa hàng.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/seller/products/${productId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        router.push('/seller/products');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/seller/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa sản phẩm</h1>
              <p className="text-gray-600">Cập nhật thông tin sản phẩm</p>
            </div>
          </div>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Thông tin cơ bản</h2>

            <div className="space-y-2">
              <Label htmlFor="title">Tên sản phẩm *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả sản phẩm *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Danh mục *</Label>
                <select
                  id="category"
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg"
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg"
                >
                  <option value="ACTIVE">Đang bán</option>
                  <option value="INACTIVE">Ngừng bán</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                placeholder="VD: netflix, premium"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Giá & Kho hàng</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Giá bán (VNĐ) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salePrice">Giá gốc</Label>
                <Input
                  id="salePrice"
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value }))}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Số lượng kho *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  min="0"
                  required
                />
              </div>
            </div>
          </div>

          {/* Delivery Mode */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${autoDelivery ? 'bg-green-100' : 'bg-orange-100'}`}>
                  {autoDelivery ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Chế độ giao hàng</h2>
                  <p className="text-sm text-gray-500">
                    {autoDelivery 
                      ? 'Tự động giao từ kho khi có đơn hàng' 
                      : 'Bạn sẽ nhập thông tin tài khoản khi có đơn hàng'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAutoDelivery(true)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  autoDelivery 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className={`w-5 h-5 ${autoDelivery ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className={`font-medium ${autoDelivery ? 'text-green-700' : 'text-gray-700'}`}>
                    Giao tự động
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Nhập tài khoản vào kho trước, hệ thống tự động giao khi có đơn
                </p>
              </button>
              
              <button
                type="button"
                onClick={() => setAutoDelivery(false)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  !autoDelivery 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className={`w-5 h-5 ${!autoDelivery ? 'text-orange-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={`font-medium ${!autoDelivery ? 'text-orange-700' : 'text-gray-700'}`}>
                    Giao thủ công
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Không cần nhập kho, bạn nhập thông tin khi có đơn hàng
                </p>
              </button>
            </div>
            
            {!autoDelivery && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    <strong>Lưu ý:</strong> Với chế độ giao thủ công, khách hàng có thể mua sản phẩm ngay cả khi kho trống. 
                    Bạn cần theo dõi đơn hàng và giao thông tin tài khoản trong vòng 24h.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Commission */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Percent className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Hoa hồng sàn</h2>
                <p className="text-sm text-gray-500">Phần trăm sàn nhận được khi bán sản phẩm</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Khi bạn bán được sản phẩm, sàn sẽ thu <strong>{useCustomCommission && customCommission ? customCommission : commission}%</strong> hoa hồng. 
                Ví dụ: Bán sản phẩm <strong>100,000đ</strong> → Bạn nhận <strong>{(100000 * (1 - (useCustomCommission && customCommission ? parseFloat(customCommission) : commission) / 100)).toLocaleString('vi-VN')}đ</strong>
              </p>
            </div>

            <div className="space-y-3">
              <Label>Chọn mức hoa hồng</Label>
              <div className="flex flex-wrap gap-2">
                {COMMISSION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setCommission(opt); setUseCustomCommission(false); }}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      !useCustomCommission && commission === opt
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {opt}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomCommission(true)}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                    useCustomCommission
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Tùy chỉnh
                </button>
              </div>
              
              {useCustomCommission && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Nhập phần trăm"
                    value={customCommission}
                    onChange={(e) => setCustomCommission(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-32"
                  />
                  <span className="text-gray-600">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Hình ảnh</h2>
              <Button type="button" variant="outline" size="sm" onClick={handleImageAdd}>
                <Plus className="w-4 h-4 mr-1" />
                Thêm ảnh
              </Button>
            </div>

            <div className="space-y-3">
              {formData.images.map((img, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder="URL hình ảnh"
                    value={img}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.images.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleImageRemove(index)} className="text-red-600">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Link href="/seller/products">
              <Button type="button" variant="outline">Hủy</Button>
            </Link>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
