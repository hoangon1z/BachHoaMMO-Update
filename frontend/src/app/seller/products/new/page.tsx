'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Image, Plus, X, Layers, Percent, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  name: string;
  price: string;
  salePrice: string;
  stock: string;
}

const COMMISSION_OPTIONS = [1, 2, 3, 4, 5];

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([
    { name: '', price: '', salePrice: '', stock: '' }
  ]);
  const [commission, setCommission] = useState<number>(5);
  const [customCommission, setCustomCommission] = useState<string>('');
  const [useCustomCommission, setUseCustomCommission] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    salePrice: '',
    stock: '',
    categoryId: '',
    images: [''],
    tags: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
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

  // Variant handlers
  const handleAddVariant = () => {
    setVariants(prev => [...prev, { name: '', price: '', salePrice: '', stock: '' }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: string) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.description || !formData.categoryId) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    // Validate variants nếu có
    if (hasVariants) {
      const validVariants = variants.filter(v => v.name && v.price && v.stock);
      if (validVariants.length === 0) {
        setError('Vui lòng thêm ít nhất 1 phân loại với đầy đủ thông tin');
        return;
      }
    } else {
      if (!formData.price || !formData.stock) {
        setError('Vui lòng điền giá và số lượng');
        return;
      }
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const validImages = formData.images.filter(img => img.trim());

      // Get final commission value
      const finalCommission = useCustomCommission && customCommission 
        ? parseFloat(customCommission) 
        : commission;

      const requestBody: any = {
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        images: JSON.stringify(validImages.length > 0 ? validImages : ['/placeholder.jpg']),
        tags: formData.tags || undefined,
        commission: Math.max(0, Math.min(100, finalCommission)), // Clamp 0-100
      };

      if (hasVariants) {
        // Với variants: price/stock trong product là giá thấp nhất / tổng stock
        const validVariants = variants.filter(v => v.name && v.price && v.stock);
        const minPrice = Math.min(...validVariants.map(v => parseFloat(v.price)));
        const totalStock = validVariants.reduce((sum, v) => sum + parseInt(v.stock), 0);

        requestBody.price = minPrice;
        requestBody.stock = totalStock;
        requestBody.hasVariants = true;
        requestBody.variants = validVariants.map((v, index) => ({
          name: v.name,
          price: parseFloat(v.price),
          salePrice: v.salePrice ? parseFloat(v.salePrice) : undefined,
          stock: parseInt(v.stock),
          position: index,
        }));
      } else {
        requestBody.price = parseFloat(formData.price);
        requestBody.salePrice = formData.salePrice ? parseFloat(formData.salePrice) : undefined;
        requestBody.stock = parseInt(formData.stock);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        router.push('/seller/products');
      } else {
        const data = await response.json();
        setError(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/seller/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thêm sản phẩm mới</h1>
            <p className="text-gray-600">Tạo sản phẩm mới để bán trên cửa hàng</p>
          </div>
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
                placeholder="VD: Tài khoản Facebook"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả sản phẩm *</Label>
              <textarea
                id="description"
                placeholder="Mô tả chi tiết về sản phẩm..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

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
              <Label>Tags (phân cách bằng dấu phẩy)</Label>
              <Input
                placeholder="VD: facebook, tài khoản, mạng xã hội"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>

          {/* Variants Toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Phân loại sản phẩm</h2>
                  <p className="text-sm text-gray-500">Thêm các phân loại khác nhau (VD: 1 tháng, 2 tháng, 1 năm)</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {hasVariants && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {variants.map((variant, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Phân loại {index + 1}</span>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(index)}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Tên phân loại *</Label>
                        <Input
                          placeholder="VD: 1 tháng"
                          value={variant.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Giá bán (VNĐ) *</Label>
                        <Input
                          type="number"
                          placeholder="200000"
                          value={variant.price}
                          onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                          min="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Giá gốc</Label>
                        <Input
                          type="number"
                          placeholder="300000"
                          value={variant.salePrice}
                          onChange={(e) => handleVariantChange(index, 'salePrice', e.target.value)}
                          min="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Số lượng *</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={variant.stock}
                          onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                          min="0"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm phân loại
                </Button>
              </div>
            )}
          </div>

          {/* Pricing (only show if no variants) */}
          {!hasVariants && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Giá & Kho hàng</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Giá bán (VNĐ) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="100000"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    min="0"
                    required={!hasVariants}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salePrice">Giá gốc (nếu có)</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    placeholder="150000"
                    value={formData.salePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value }))}
                    min="0"
                  />
                  <p className="text-xs text-gray-500">Hiển thị giá gạch ngang</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Số lượng kho *</Label>
                  <Input
                    id="stock"
                    type="number"
                    placeholder="10"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    min="0"
                    required={!hasVariants}
                  />
                </div>
              </div>
            </div>
          )}

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
              <h2 className="font-semibold text-gray-900">Hình ảnh sản phẩm</h2>
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
                      <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = '')} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder="Nhập URL hình ảnh"
                    value={img}
                    onChange={(e) => handleImageChange(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.images.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleImageRemove(index)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">Hỗ trợ URL hình ảnh từ các nguồn bên ngoài</p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Link href="/seller/products">
              <Button type="button" variant="outline">Hủy</Button>
            </Link>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Đang tạo...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Tạo sản phẩm
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
