'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Image, Plus, X, Trash2, Info, AlertCircle, CheckCircle, Layers, Globe, Upload, Loader2, MonitorUp, ArrowUpCircle, Zap, Package, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { validateImageUrl } from '@/lib/image-validation';
import { RichTextEditor, sanitizeHtml } from '@/components/RichTextEditor';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
}

interface Variant {
  id?: string;
  name: string;
  price: string;
  originalPrice: string;
  stock: string;
  position?: number;
}

// Platform fixed commission rate
const PLATFORM_COMMISSION = 5;

// Format number with commas (e.g., 1000000 -> 1,000,000)
const formatPrice = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Parse formatted price back to raw number string (e.g., 1,000,000 -> 1000000)
const parsePriceValue = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [autoDelivery, setAutoDelivery] = useState(true); // Chế độ giao hàng
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([
    { name: '', price: '', originalPrice: '', stock: '' }
  ]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    stock: '',
    categoryId: '',
    status: 'ACTIVE',
    images: [''],
    tags: '',
  });
  const [imageValidations, setImageValidations] = useState<{ [key: number]: { validating: boolean; error?: string; valid?: boolean } }>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [productType, setProductType] = useState<'STANDARD' | 'UPGRADE' | 'SERVICE'>('STANDARD');
  const [requiredBuyerFields, setRequiredBuyerFields] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchProduct()]);
  }, [productId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/categories?parent=true`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Flatten categories for display with proper grouping
  const getCategoryOptions = () => {
    const options: { id: string; name: string; isParent: boolean }[] = [];

    categories.forEach(parent => {
      // Add parent as disabled header
      options.push({ id: parent.id, name: parent.name, isParent: true });

      // Add children
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach(child => {
          options.push({ id: child.id, name: `  └ ${child.name}`, isParent: false });
        });
      }
    });

    return options;
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
        } catch { }

        // Check if product has variants
        const productHasVariants = product.hasVariants || (product.variants && product.variants.length > 0);
        setHasVariants(productHasVariants);

        // Load variants if available
        if (productHasVariants && product.variants && product.variants.length > 0) {
          setVariants(product.variants.map((v: any) => ({
            id: v.id,
            name: v.name || '',
            price: v.price ? formatPrice(v.price.toString()) : '',
            originalPrice: v.originalPrice ? formatPrice(v.originalPrice.toString()) : '',
            stock: v.stock?.toString() || '',
            position: v.position,
          })));
        }

        setFormData({
          title: product.title || '',
          description: product.description || '',
          price: product.price ? formatPrice(product.price.toString()) : '',
          originalPrice: product.originalPrice ? formatPrice(product.originalPrice.toString()) : '',
          stock: product.stock?.toString() || '',
          categoryId: product.categoryId || '',
          status: product.status || 'ACTIVE',
          images,
          tags: product.tags || '',
        });

        // Set autoDelivery
        setAutoDelivery(product.autoDelivery !== false); // Default true if not set

        // Set productType and requiredBuyerFields
        setProductType(product.productType || 'STANDARD');
        if (product.requiredBuyerFields) {
          try {
            const fields = typeof product.requiredBuyerFields === 'string'
              ? JSON.parse(product.requiredBuyerFields)
              : product.requiredBuyerFields;
            setRequiredBuyerFields(Array.isArray(fields) ? fields : []);
          } catch { setRequiredBuyerFields([]); }
        }
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

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    setIsUploadingImage(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      for (const file of Array.from(files)) {
        if (!allowedTypes.includes(file.type)) {
          setError(`File "${file.name}" không hợp lệ. Chỉ chấp nhận JPG, PNG, GIF, WEBP`);
          continue;
        }
        if (file.size > maxSize) {
          setError(`File "${file.name}" quá lớn. Tối đa 5MB`);
          continue;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('image', file);

        const response = await fetch('/api/seller/products/images', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadFormData,
        });

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.imageUrl;

          setFormData(prev => {
            const emptyIndex = prev.images.findIndex(img => !img.trim());
            if (emptyIndex !== -1) {
              const newImages = [...prev.images];
              newImages[emptyIndex] = imageUrl;
              return { ...prev, images: newImages };
            }
            return { ...prev, images: [...prev.images, imageUrl] };
          });
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra khi tải ảnh lên' }));
          setError(errorData.message || 'Có lỗi xảy ra khi tải ảnh lên');
        }
      }
    } catch (err) {
      console.error('Error uploading images:', err);
      setError('Có lỗi xảy ra khi tải ảnh lên');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleImageRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Variant handlers
  const handleAddVariant = () => {
    setVariants(prev => [...prev, { name: '', price: '', originalPrice: '', stock: '' }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: string) => {
    const formattedValue = (field === 'price' || field === 'originalPrice') ? formatPrice(value) : value;
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: formattedValue } : v));
  };

  const handleImageChange = async (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? value : img)),
    }));

    // Clear previous validation
    setImageValidations(prev => ({
      ...prev,
      [index]: { validating: false, error: undefined, valid: undefined }
    }));

    // Only validate if URL is not empty
    if (value.trim()) {
      // Set validating state
      setImageValidations(prev => ({
        ...prev,
        [index]: { validating: true }
      }));

      // Debounce validation
      setTimeout(async () => {
        const result = await validateImageUrl(value);
        setImageValidations(prev => ({
          ...prev,
          [index]: {
            validating: false,
            error: result.error,
            valid: result.valid
          }
        }));
      }, 500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.description || !formData.categoryId) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    // Validate images before submitting
    const imageErrors = Object.entries(imageValidations)
      .filter(([_, validation]) => validation.error)
      .map(([index, validation]) => `Hình ${parseInt(index) + 1}: ${validation.error}`);

    if (imageErrors.length > 0) {
      setError(`Vui lòng sửa lỗi hình ảnh:\\n${imageErrors.join('\\n')}`);
      return;
    }

    // Validate variants if enabled
    if (hasVariants) {
      const validVariants = variants.filter(v => v.name && parsePriceValue(v.price) && v.stock);
      if (validVariants.length === 0) {
        setError('Vui lòng thêm ít nhất 1 phân loại với đầy đủ thông tin');
        return;
      }
      // Validate max values for variants
      for (const v of validVariants) {
        if (parseFloat(parsePriceValue(v.price)) > 999999999) {
          setError('Giá sản phẩm không được vượt quá 999,999,999đ');
          return;
        }
        if (parseInt(v.stock) > 999999) {
          setError('Số lượng kho không được vượt quá 999,999');
          return;
        }
      }
    } else {
      if (!parsePriceValue(formData.price) || !formData.stock) {
        setError('Vui lòng điền giá và số lượng');
        return;
      }
      // Validate max values
      if (parseFloat(parsePriceValue(formData.price)) > 999999999) {
        setError('Giá sản phẩm không được vượt quá 999,999,999đ');
        return;
      }
      if (parseInt(formData.stock) > 999999) {
        setError('Số lượng kho không được vượt quá 999,999');
        return;
      }
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const validImages = formData.images.filter(img => img.trim());

      const requestBody: any = {
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        status: formData.status,
        images: JSON.stringify(validImages.length > 0 ? validImages : ['/placeholder.jpg']),
        tags: formData.tags || null,
        autoDelivery,
        productType,
        requiredBuyerFields: (productType === 'UPGRADE' || productType === 'SERVICE') && requiredBuyerFields.length > 0
          ? JSON.stringify(requiredBuyerFields)
          : null,
      };

      if (hasVariants) {
        // With variants: price/stock in product is minimum price / total stock
        const validVariants = variants.filter(v => v.name && parsePriceValue(v.price) && v.stock);
        const minPrice = Math.min(...validVariants.map(v => parseFloat(parsePriceValue(v.price))));
        const totalStock = validVariants.reduce((sum, v) => sum + parseInt(v.stock), 0);

        requestBody.price = minPrice;
        requestBody.stock = totalStock;
        requestBody.hasVariants = true;
        requestBody.variants = validVariants.map((v, index) => ({
          id: v.id, // Keep existing ID if editing
          name: v.name,
          price: parseFloat(parsePriceValue(v.price)),
          originalPrice: parsePriceValue(v.originalPrice) ? parseFloat(parsePriceValue(v.originalPrice)) : undefined,
          stock: parseInt(v.stock),
          position: index,
        }));
      } else {
        requestBody.price = parseFloat(parsePriceValue(formData.price));
        requestBody.originalPrice = parsePriceValue(formData.originalPrice) ? parseFloat(parsePriceValue(formData.originalPrice)) : null;
        requestBody.stock = parseInt(formData.stock);
        requestBody.hasVariants = false;
        requestBody.variants = []; // Clear variants if disabled
      }

      const response = await fetch(
        `/api/seller/products/${productId}`,
        {
          method: 'PUT',
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
      console.error('Error updating product:', error);
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
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
      } else {
        alert('Có lỗi xảy ra khi xóa sản phẩm');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Có lỗi xảy ra khi xóa sản phẩm');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeleteClick}>
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
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData(prev => ({ ...prev, description: sanitizeHtml(value) }))}
                placeholder="Mô tả chi tiết về sản phẩm... (hỗ trợ in đậm, in nghiêng, và liên kết)"
                minHeight="150px"
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
                  {getCategoryOptions().map((opt) => (
                    <option
                      key={opt.id}
                      value={opt.id}
                      disabled={opt.isParent}
                      className={opt.isParent ? 'font-semibold bg-gray-100 text-gray-700' : ''}
                    >
                      {opt.name}
                    </option>
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
              <div className="space-y-4 pt-4 border-t border-gray-200">
                {/* Desktop: Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-medium text-gray-600 w-8">#</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Tên phân loại *</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Giá bán *</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Giá gốc</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600">Kho *</th>
                        <th className="text-center py-3 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 px-2 text-gray-400 font-medium">{index + 1}</td>
                          <td className="py-2 px-2">
                            <Input
                              placeholder="VD: 1 tháng"
                              value={variant.name}
                              onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                              className="h-9"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="200,000"
                              value={variant.price}
                              onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                              className="h-9"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="300,000"
                              value={variant.originalPrice}
                              onChange={(e) => handleVariantChange(index, 'originalPrice', e.target.value)}
                              className="h-9"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              placeholder="10"
                              value={variant.stock}
                              onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                              min="0"
                              max="999999"
                              className="h-9 w-20"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            {variants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(index)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa phân loại"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Compact Cards */}
                <div className="sm:hidden space-y-3">
                  {variants.map((variant, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 relative">
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(index)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <Input
                          placeholder="Tên phân loại"
                          value={variant.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          className="flex-1 h-8 text-sm font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 mb-0.5 block">Giá bán *</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="200,000"
                            value={variant.price}
                            onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 mb-0.5 block">Giá gốc</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="300,000"
                            value={variant.originalPrice}
                            onChange={(e) => handleVariantChange(index, 'originalPrice', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 mb-0.5 block">Kho *</label>
                          <Input
                            type="number"
                            placeholder="10"
                            value={variant.stock}
                            onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add button & Summary */}
                <div className="flex items-center justify-between pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleAddVariant} className="gap-1">
                    <Plus className="w-4 h-4" />
                    Thêm phân loại
                  </Button>

                  {variants.length > 0 && variants.some(v => v.name && parsePriceValue(v.price)) && (
                    <div className="text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{variants.filter(v => v.name && parsePriceValue(v.price)).length}</span> phân loại
                    </div>
                  )}
                </div>
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
                    type="text"
                    inputMode="numeric"
                    placeholder="100,000"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: formatPrice(e.target.value) }))}
                    required={!hasVariants}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Giá gốc (nếu có)</Label>
                  <Input
                    id="originalPrice"
                    type="text"
                    inputMode="numeric"
                    placeholder="150,000"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: formatPrice(e.target.value) }))}
                  />
                  <p className="text-xs text-gray-500">Hiển thị giá gạch ngang</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Số lượng kho *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    min="0"
                    max="999999"
                    required={!hasVariants}
                  />
                  <p className="text-xs text-gray-500">Tối đa 999,999</p>
                </div>
              </div>
            </div>
          )}

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
                className={`p-4 rounded-lg border-2 text-left transition-all ${autoDelivery
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
                className={`p-4 rounded-lg border-2 text-left transition-all ${!autoDelivery
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

          {/* Product Type */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Loại sản phẩm</h2>
            <p className="text-sm text-gray-500">Chọn loại sản phẩm</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button type="button" onClick={() => setProductType('STANDARD')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${productType === 'STANDARD' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Package className={`w-4 h-4 ${productType === 'STANDARD' ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-semibold ${productType === 'STANDARD' ? 'text-blue-700' : 'text-gray-700'}`}>Bán tài khoản</span>
                </div>
                <p className="text-xs text-gray-500">Mặc định</p>
              </button>
              <button type="button" onClick={() => { setProductType('UPGRADE'); setAutoDelivery(false); }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${productType === 'UPGRADE' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpCircle className={`w-4 h-4 ${productType === 'UPGRADE' ? 'text-purple-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-semibold ${productType === 'UPGRADE' ? 'text-purple-700' : 'text-gray-700'}`}>Nâng cấp tài khoản</span>
                </div>
                <p className="text-xs text-gray-500">Upgrade</p>
              </button>
              <button type="button" onClick={() => { setProductType('SERVICE'); setAutoDelivery(false); }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${productType === 'SERVICE' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-4 h-4 ${productType === 'SERVICE' ? 'text-emerald-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-semibold ${productType === 'SERVICE' ? 'text-emerald-700' : 'text-gray-700'}`}>Dịch vụ MXH</span>
                </div>
                <p className="text-xs text-gray-500">Buff/Tăng tương tác</p>
              </button>
            </div>

            {/* SERVICE Buyer Fields */}
            {productType === 'SERVICE' && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-emerald-800">Thông tin buyer cần cung cấp</h4>
                    <p className="text-sm text-emerald-600">Chọn các trường khách hàng cần nhập khi mua dịch vụ</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[{ key: 'link', label: 'Link/URL' }, { key: 'username', label: 'Tên tài khoản' }, { key: 'email', label: 'Email' }, { key: 'password', label: 'Mật khẩu' }, { key: 'quantity', label: 'Số lượng' }, { key: 'note', label: 'Ghi chú' }].map((field) => (
                    <label key={field.key}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${requiredBuyerFields.includes(field.key) ? 'border-emerald-500 bg-emerald-100 text-emerald-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={requiredBuyerFields.includes(field.key)}
                        onChange={(e) => { if (e.target.checked) { setRequiredBuyerFields([...requiredBuyerFields, field.key]); } else { setRequiredBuyerFields(requiredBuyerFields.filter(f => f !== field.key)); } }}
                        className="sr-only" />
                      <span className="text-sm font-medium">{field.label}</span>
                      {requiredBuyerFields.includes(field.key) && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      )}
                    </label>
                  ))}
                </div>
                <div className="text-xs text-emerald-600">
                  <strong>Lưu ý:</strong> Khi khách mua, họ sẽ nhập các thông tin bạn yêu cầu. Bạn nhận đơn và xử lý thủ công.
                </div>
              </div>
            )}

            {/* UPGRADE Buyer Fields */}
            {productType === 'UPGRADE' && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-800">Thông tin khách hàng cần cung cấp</h4>
                    <p className="text-sm text-purple-600">Chọn các trường khách hàng cần nhập khi mua sản phẩm này</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['email', 'password', 'username'].map((field) => (
                    <label key={field}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${requiredBuyerFields.includes(field) ? 'border-purple-500 bg-purple-100 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={requiredBuyerFields.includes(field)}
                        onChange={(e) => { if (e.target.checked) { setRequiredBuyerFields([...requiredBuyerFields, field]); } else { setRequiredBuyerFields(requiredBuyerFields.filter(f => f !== field)); } }}
                        className="sr-only" />
                      <span className="text-sm font-medium">
                        {field === 'email' ? 'Email' : field === 'password' ? 'Mật khẩu' : 'Tên đăng nhập'}
                      </span>
                      {requiredBuyerFields.includes(field) && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      )}
                    </label>
                  ))}
                </div>
                <div className="text-xs text-purple-600">
                  <strong>Lưu ý:</strong> Khách hàng sẽ nhập thông tin tài khoản khi mua. Bạn nhận và nâng cấp cho họ.
                </div>
              </div>
            )}
          </div>

          {/* Commission Info - Fixed 5% */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">Phí hoa hồng sàn: 5%</h3>
                <p className="text-sm text-blue-700">
                  Khi bạn bán được sản phẩm, sàn sẽ thu <strong>5%</strong> hoa hồng cố định.
                  <br />
                  Ví dụ: Bán sản phẩm <strong>100,000đ</strong> → Bạn nhận <strong>95,000đ</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Hình ảnh</h2>
              {imageMode === 'url' && (
                <Button type="button" variant="outline" size="sm" onClick={handleImageAdd}>
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm ảnh
                </Button>
              )}
            </div>

            {/* Image Preview Grid */}
            {formData.images.some(img => img.trim()) && (
              <div className="flex flex-wrap gap-3">
                {formData.images.filter(img => img.trim()).map((img, index) => (
                  <div key={index} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                    <img src={img} alt={`Ảnh ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button
                      type="button"
                      onClick={() => {
                        const realIndex = formData.images.indexOf(img);
                        if (realIndex !== -1) handleImageRemove(realIndex);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab Switch */}
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${imageMode === 'url'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Globe className="w-4 h-4" />
                Nhập URL
              </button>
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${imageMode === 'upload'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <MonitorUp className="w-4 h-4" />
                Tải lên từ máy
              </button>
            </div>

            {/* URL Input Mode */}
            {imageMode === 'url' && (
              <div className="space-y-3">
                {formData.images.map((img, index) => {
                  const validation = imageValidations[index];
                  const hasError = validation?.error;
                  const isValid = validation?.valid;
                  const isValidating = validation?.validating;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {img ? (
                            <>
                              <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              {isValidating && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Nhập URL hình ảnh (jpg, png, gif, webp...)"
                            value={img}
                            onChange={(e) => handleImageChange(index, e.target.value)}
                            className={`pr-10 ${hasError ? 'border-red-500 focus:ring-red-500' : isValid ? 'border-green-500 focus:ring-green-500' : ''}`}
                          />
                          {isValidating && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                          {!isValidating && isValid && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                          )}
                          {!isValidating && hasError && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                          )}
                        </div>
                        {formData.images.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleImageRemove(index)} className="text-red-600 hover:bg-red-50">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {hasError && (
                        <div className="flex items-start gap-2 text-sm text-red-600 ml-[76px]">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{validation.error}</span>
                        </div>
                      )}
                      {isValid && (
                        <div className="flex items-start gap-2 text-sm text-green-600 ml-[76px]">
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Hình ảnh hợp lệ</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-gray-500">
                  Hỗ trợ URL hình ảnh từ các nguồn bên ngoài. Định dạng: jpg, jpeg, png, gif, webp, svg, bmp, ico
                </p>
              </div>
            )}

            {/* File Upload Mode */}
            {imageMode === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  id="product-image-upload-edit"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  multiple
                  onChange={handleImageFileUpload}
                  disabled={isUploadingImage}
                />
                <label
                  htmlFor="product-image-upload-edit"
                  className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isUploadingImage
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                >
                  {isUploadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-sm text-gray-500">Đang tải lên...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-600 font-medium">Nhấn để chọn ảnh từ máy tính</p>
                      <p className="text-xs text-gray-400">Hỗ trợ chọn nhiều ảnh cùng lúc. JPG, PNG, GIF, WEBP - Tối đa 5MB/ảnh</p>
                    </div>
                  )}
                </label>
              </div>
            )}
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

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteConfirm}
          title="Xóa sản phẩm"
          description={`Bạn có chắc muốn xóa sản phẩm "${formData.title}"? Sản phẩm sẽ được ẩn khỏi cửa hàng.`}
          confirmText="Xóa sản phẩm"
          cancelText="Hủy"
          variant="danger"
          isLoading={isDeleting}
          icon={<Trash2 className="w-7 h-7" />}
        />
      </div>
    </div>
  );
}
