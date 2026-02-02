'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FolderOpen, Package, X, ChevronRight, Folder } from 'lucide-react';
import { PageHeader, StatsCard, EmptyState, ConfirmDialog } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/Toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string | null;
  parent?: Category | null;
  children?: Category[];
  _count?: { products: number };
}

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; categoryId: string | null }>({ isOpen: false, categoryId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    image: '',
    parentId: '',
  });

  // Get parent categories (categories without parentId)
  const parentCategories = categories.filter(c => !c.parentId);
  
  // Get child categories count
  const getChildrenCount = (parentId: string) => 
    categories.filter(c => c.parentId === parentId).length;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editingCategory
      ? `/api/admin/categories/${editingCategory.id}`
      : '/api/admin/categories';

    try {
      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingCategory ? 'Cập nhật thành công!' : 'Tạo danh mục thành công!');
        setShowModal(false);
        resetForm();
        fetchCategories();
      } else {
        const err = await response.json();
        toast.error(err.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.categoryId) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/categories/${deleteModal.categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Đã xóa danh mục');
        fetchCategories();
        setDeleteModal({ isOpen: false, categoryId: null });
      } else {
        const err = await response.json();
        toast.error(err.message || 'Không thể xóa danh mục');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '', description: '', icon: '', image: '', parentId: '' });
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      image: category.image || '',
      parentId: category.parentId || '',
    });
    setShowModal(true);
  };

  const totalProducts = categories.reduce((sum, c) => sum + (c._count?.products || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý danh mục"
        description="Quản lý các danh mục sản phẩm"
        icon={<FolderOpen className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Danh mục' }]}
        actions={
          <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-amber-500 hover:bg-amber-600 text-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Thêm danh mục
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Tổng danh mục"
          value={categories.length}
          icon={<FolderOpen className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Tổng sản phẩm"
          value={totalProducts}
          icon={<Package className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="TB sản phẩm/danh mục"
          value={categories.length > 0 ? Math.round(totalProducts / categories.length) : 0}
          icon={<Package className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Đang tải danh mục...</p>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState
            icon={<FolderOpen className="w-10 h-10 text-gray-400" />}
            title="Chưa có danh mục"
            description="Bắt đầu bằng việc tạo danh mục đầu tiên"
            action={{ label: 'Thêm danh mục', onClick: () => { resetForm(); setShowModal(true); } }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Parent Categories */}
          {parentCategories.map((parent) => {
            const children = categories.filter(c => c.parentId === parent.id);
            return (
              <div key={parent.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Parent Header */}
                <div className="p-6 border-b border-gray-100 hover:bg-gray-50 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-md">
                        <FolderOpen className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{parent.name}</h3>
                        <p className="text-sm text-gray-500">{parent.slug}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {children.length} danh mục con
                          </span>
                          <span className="text-xs text-gray-500">
                            {parent._count?.products || 0} sản phẩm
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600" onClick={() => openEditModal(parent)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="hover:bg-red-50 hover:text-red-600"
                        onClick={() => setDeleteModal({ isOpen: true, categoryId: parent.id })}
                        disabled={(parent._count?.products || 0) > 0 || children.length > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Children */}
                {children.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50/50">
                    {children.map((child) => (
                      <div key={child.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all group">
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Folder className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600" onClick={() => openEditModal(child)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setDeleteModal({ isOpen: true, categoryId: child.id })}
                              disabled={(child._count?.products || 0) > 0}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-gray-900 mb-1">{child.name}</h4>
                        <p className="text-xs text-gray-500 mb-2">{child.slug}</p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Package className="w-3 h-3 text-gray-400" />
                          <span>{child._count?.products || 0} sản phẩm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Orphan categories (no parent) that are not parent themselves */}
          {categories.filter(c => !c.parentId && !parentCategories.some(p => 
            categories.some(child => child.parentId === c.id)
          ) && categories.filter(child => child.parentId === c.id).length === 0).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-700">Danh mục chưa phân loại</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {categories.filter(c => !c.parentId && categories.filter(child => child.parentId === c.id).length === 0).map((category) => (
                  <div key={category.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Folder className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600" onClick={() => openEditModal(category)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleteModal({ isOpen: true, categoryId: category.id })}
                          disabled={(category._count?.products || 0) > 0}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 mb-1">{category.name}</h4>
                    <p className="text-xs text-gray-500 mb-2">{category.slug}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Package className="w-3 h-3 text-gray-400" />
                      <span>{category._count?.products || 0} sản phẩm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Parent Category Selection */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Danh mục cha</Label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Không có (Danh mục gốc) --</option>
                  {parentCategories
                    .filter(c => c.id !== editingCategory?.id) // Exclude self when editing
                    .map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Để trống nếu đây là danh mục cha (cấp cao nhất)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Tên danh mục *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: editingCategory ? formData.slug : generateSlug(e.target.value),
                  })}
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Mô tả</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">URL Hình ảnh</Label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setShowModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-900">
                  {editingCategory ? 'Cập nhật' : 'Tạo mới'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, categoryId: null })}
        onConfirm={handleDelete}
        title="Xóa danh mục"
        description="Bạn có chắc chắn muốn xóa danh mục này?"
        confirmText="Xóa"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
