'use client';

import { useEffect, useState } from 'react';
import {
    Pin,
    Search,
    Check,
    X,
    Package,
    Loader2,
    Trophy,
    Info,
    GripVertical,
    Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Product {
    id: string;
    title: string;
    price: number;
    images: string;
    slug?: string;
    stock: number;
    sales: number;
    status: string;
}



export default function PinnedProductsPage() {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [pinnedProducts, setPinnedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch pinned products and all products in parallel
            const [pinnedRes, productsRes] = await Promise.all([
                fetch('/api/seller/pinned-products', { headers }),
                fetch('/api/seller/products?limit=100&status=ACTIVE', { headers }),
            ]);

            if (pinnedRes.ok) {
                const pinnedData = await pinnedRes.json();
                setPinnedIds(pinnedData.pinnedProductIds || []);
                setPinnedProducts(pinnedData.products || []);
            }

            if (productsRes.ok) {
                const productsData = await productsRes.json();
                setAllProducts(productsData.products || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePin = (product: Product) => {
        setPinnedIds(prev => {
            if (prev.includes(product.id)) {
                // Remove
                const newIds = prev.filter(id => id !== product.id);
                setPinnedProducts(pp => pp.filter(p => p.id !== product.id));
                return newIds;
            } else {
                // Add (max 4)
                if (prev.length >= 4) return prev;
                setPinnedProducts(pp => [...pp, product]);
                return [...prev, product.id];
            }
        });
        setSaveStatus('idle');
    };

    const removePinned = (productId: string) => {
        setPinnedIds(prev => prev.filter(id => id !== productId));
        setPinnedProducts(prev => prev.filter(p => p.id !== productId));
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/seller/pinned-products', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productIds: pinnedIds }),
            });

            if (res.ok) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.message || 'Có lỗi xảy ra');
                setSaveStatus('error');
            }
        } catch (error) {
            console.error('Error saving pinned products:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const getProductImage = (product: Product) => {
        try {
            const images = JSON.parse(product.images);
            if (images[0]) return images[0];
        } catch { }
        return null;
    };

    const filteredProducts = allProducts.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        p.status === 'ACTIVE'
    );

    if (isLoading) {
        return (
            <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Đang tải...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Pin className="w-6 h-6 text-blue-600" />
                        Ghim sản phẩm nổi bật
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Chọn tối đa 4 sản phẩm để hiển thị trên trang chủ khi bạn thắng đấu giá gian hàng
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang lưu...
                        </>
                    ) : saveStatus === 'success' ? (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Đã lưu!
                        </>
                    ) : (
                        'Lưu thay đổi'
                    )}
                </Button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-blue-900 text-sm">Cách hoạt động</h3>
                    <p className="text-sm text-blue-700 mt-0.5">
                        Khi bạn thắng đấu giá gian hàng (TOP 1, 2 hoặc 3), gian hàng của bạn sẽ hiển thị trên trang chủ.
                        Các sản phẩm được ghim ở đây sẽ xuất hiện ngay bên dưới thông tin gian hàng, giúp thu hút khách hàng.
                    </p>
                </div>
            </div>

            {/* Currently Pinned */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Pin className="w-4 h-4 text-amber-500" />
                        <h2 className="font-semibold text-gray-900">Sản phẩm đã ghim</h2>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {pinnedIds.length}/4
                        </span>
                    </div>
                </div>

                {pinnedIds.length === 0 ? (
                    <div className="p-8 text-center">
                        <Pin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Chưa ghim sản phẩm nào</p>
                        <p className="text-gray-400 text-xs mt-1">Chọn sản phẩm từ danh sách bên dưới</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                        {pinnedProducts.map((product, index) => {
                            const imgSrc = getProductImage(product);
                            return (
                                <div
                                    key={product.id}
                                    className="relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden group hover:shadow-md transition-all"
                                >
                                    {/* Position badge */}
                                    <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                                        {index + 1}
                                    </div>

                                    {/* Remove button */}
                                    <button
                                        onClick={() => removePinned(product.id)}
                                        className="absolute top-2 right-2 z-10 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>

                                    {/* Image */}
                                    <div className="w-full aspect-square bg-white">
                                        {imgSrc ? (
                                            <img
                                                src={imgSrc}
                                                alt={product.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-8 h-8 text-gray-300" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.title}</p>
                                        <p className="text-sm font-bold text-amber-600 mt-0.5">
                                            {product.price.toLocaleString('vi-VN')}đ
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Product List to Select From */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-gray-900">Chọn sản phẩm để ghim</h2>
                        <span className="text-xs text-gray-500">{filteredProducts.length} sản phẩm</span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-50">
                    {filteredProducts.length === 0 ? (
                        <div className="p-8 text-center">
                            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">Không tìm thấy sản phẩm nào</p>
                        </div>
                    ) : (
                        filteredProducts.map(product => {
                            const isPinned = pinnedIds.includes(product.id);
                            const imgSrc = getProductImage(product);
                            const canPin = pinnedIds.length < 4 || isPinned;

                            return (
                                <div
                                    key={product.id}
                                    className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${isPinned ? 'bg-blue-50/50' : ''
                                        }`}
                                    onClick={() => canPin && togglePin(product)}
                                >
                                    {/* Checkbox */}
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isPinned
                                        ? 'bg-blue-600 border-blue-600'
                                        : canPin
                                            ? 'border-gray-300 hover:border-blue-400'
                                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                        }`}>
                                        {isPinned && <Check className="w-3 h-3 text-white" />}
                                    </div>

                                    {/* Image */}
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                        {imgSrc ? (
                                            <img
                                                src={imgSrc}
                                                alt={product.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-4 h-4 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${isPinned ? 'text-blue-900' : 'text-gray-900'}`}>
                                            {product.title}
                                        </p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-xs font-semibold text-amber-600">
                                                {product.price.toLocaleString('vi-VN')}đ
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                Đã bán: {product.sales}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                Kho: {product.stock}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Pin indicator */}
                                    {isPinned && (
                                        <Pin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Floating save bar when changes detected */}
            {saveStatus === 'idle' && (
                <div className="text-center text-xs text-gray-400 pb-4">
                    <Info className="w-3 h-3 inline mr-1" />
                    Nhấn &ldquo;Lưu thay đổi&rdquo; sau khi chọn xong sản phẩm
                </div>
            )}
        </div>
    );
}
