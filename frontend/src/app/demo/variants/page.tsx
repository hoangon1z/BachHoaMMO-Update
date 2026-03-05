'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';

// Sample variants data
const sampleVariants = [
    { id: '1', name: '1 tháng', price: 200000, originalPrice: 250000, stock: 10 },
    { id: '2', name: '3 tháng', price: 500000, originalPrice: 600000, stock: 5 },
    { id: '3', name: '6 tháng', price: 900000, originalPrice: 1100000, stock: 8 },
    { id: '4', name: '1 năm', price: 1500000, originalPrice: 2000000, stock: 20 },
    { id: '5', name: '2 năm', price: 2500000, originalPrice: 3500000, stock: 0 },
    { id: '6', name: 'Lifetime', price: 5000000, originalPrice: 8000000, stock: 3 },
];

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

export default function VariantsDemoPage() {
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

    // State for each demo
    const [selected1, setSelected1] = useState(sampleVariants[0].id);
    const [selected2, setSelected2] = useState(sampleVariants[0].id);
    const [selected3, setSelected3] = useState(sampleVariants[0].id);
    const [selected4, setSelected4] = useState(sampleVariants[0].id);
    const [selected5, setSelected5] = useState(sampleVariants[0].id);
    const [selected6, setSelected6] = useState(sampleVariants[0].id);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="mb-8">
                    <Link href="/" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
                        ← Quay lại trang chủ
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Demo: Các mẫu hiển thị Phân loại</h1>
                    <p className="text-gray-600 mt-2">Chọn mẫu bạn thích nhất để tôi áp dụng cho trang sản phẩm</p>
                </div>

                <div className="space-y-8">
                    {/* ========== Mẫu 0: Current (Chips with price) ========== */}
                    <div
                        className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer ${selectedStyle === 'current' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-transparent hover:border-gray-200'
                            }`}
                        onClick={() => setSelectedStyle('current')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Mẫu hiện tại: Chips với giá</h2>
                                <p className="text-sm text-gray-500">Compact, hiển thị giá ngay trên mỗi chip</p>
                            </div>
                            {selectedStyle === 'current' && (
                                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Đã chọn
                                </span>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Phân loại <span className="text-gray-400 font-normal">({sampleVariants.length})</span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {sampleVariants.map((variant) => {
                                    const isSelected = selected1 === variant.id;
                                    const isOutOfStock = variant.stock === 0;
                                    const hasDiscount = variant.originalPrice > variant.price;

                                    return (
                                        <button
                                            key={variant.id}
                                            onClick={(e) => { e.stopPropagation(); setSelected1(variant.id); }}
                                            disabled={isOutOfStock}
                                            className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                        ${isSelected
                                                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-1'
                                                    : isOutOfStock
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                }
                      `}
                                        >
                                            <span>{variant.name}</span>
                                            <span className={`${isSelected ? 'text-blue-100' : hasDiscount ? 'text-red-500' : 'text-gray-500'}`}>
                                                {formatPrice(variant.price)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ========== Mẫu 1: Dropdown ========== */}
                    <div
                        className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer ${selectedStyle === 'dropdown' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-transparent hover:border-gray-200'
                            }`}
                        onClick={() => setSelectedStyle('dropdown')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Mẫu 1: Dropdown Select</h2>
                                <p className="text-sm text-gray-500">Tiết kiệm không gian nhất, chỉ 1 dòng</p>
                            </div>
                            {selectedStyle === 'dropdown' && (
                                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Đã chọn
                                </span>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Phân loại</label>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="w-full max-w-sm flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">{sampleVariants.find(v => v.id === selected2)?.name}</span>
                                        <span className="text-blue-600 font-semibold">
                                            {formatPrice(sampleVariants.find(v => v.id === selected2)?.price || 0)}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 max-w-sm mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                                        {sampleVariants.map((variant) => (
                                            <button
                                                key={variant.id}
                                                onClick={() => { setSelected2(variant.id); setDropdownOpen(false); }}
                                                disabled={variant.stock === 0}
                                                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''
                                                    } ${selected2 === variant.id ? 'bg-blue-50' : ''}`}
                                            >
                                                <span className={selected2 === variant.id ? 'font-medium text-blue-700' : ''}>{variant.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-semibold ${variant.originalPrice > variant.price ? 'text-red-500' : 'text-gray-700'}`}>
                                                        {formatPrice(variant.price)}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {variant.stock === 0 ? 'Hết' : `Còn ${variant.stock}`}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ========== Mẫu 2: Radio List ========== */}
                    <div
                        className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer ${selectedStyle === 'radio' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-transparent hover:border-gray-200'
                            }`}
                        onClick={() => setSelectedStyle('radio')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Mẫu 2: Radio List</h2>
                                <p className="text-sm text-gray-500">Rõ ràng nhất, hiển thị đầy đủ thông tin</p>
                            </div>
                            {selectedStyle === 'radio' && (
                                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Đã chọn
                                </span>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                            <label className="text-sm font-medium text-gray-700 mb-3 block">Phân loại</label>
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                {sampleVariants.map((variant) => {
                                    const isSelected = selected3 === variant.id;
                                    const isOutOfStock = variant.stock === 0;
                                    const hasDiscount = variant.originalPrice > variant.price;

                                    return (
                                        <label
                                            key={variant.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isOutOfStock
                                                    ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-blue-50 border-2 border-blue-500'
                                                        : 'bg-white border border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="variant-radio"
                                                checked={isSelected}
                                                disabled={isOutOfStock}
                                                onChange={() => setSelected3(variant.id)}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <span className={`flex-1 font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                                {variant.name}
                                            </span>
                                            <div className="flex items-center gap-4">
                                                {hasDiscount && (
                                                    <span className="text-sm text-gray-400 line-through">{formatPrice(variant.originalPrice)}</span>
                                                )}
                                                <span className={`font-bold ${hasDiscount ? 'text-red-500' : 'text-gray-900'}`}>
                                                    {formatPrice(variant.price)}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded ${isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                                    }`}>
                                                    {isOutOfStock ? 'Hết hàng' : `Còn ${variant.stock}`}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ========== Mẫu 3: Segmented Control ========== */}
                    <div
                        className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer ${selectedStyle === 'segmented' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-transparent hover:border-gray-200'
                            }`}
                        onClick={() => setSelectedStyle('segmented')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Mẫu 3: Segmented Control</h2>
                                <p className="text-sm text-gray-500">Gọn đẹp kiểu iOS, giá hiển thị bên dưới</p>
                            </div>
                            {selectedStyle === 'segmented' && (
                                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Đã chọn
                                </span>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                            <label className="text-sm font-medium text-gray-700 mb-3 block">Phân loại</label>
                            <div onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex bg-gray-200 rounded-lg p-1">
                                    {sampleVariants.slice(0, 4).map((variant) => {
                                        const isSelected = selected4 === variant.id;

                                        return (
                                            <button
                                                key={variant.id}
                                                onClick={() => setSelected4(variant.id)}
                                                disabled={variant.stock === 0}
                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${isSelected
                                                        ? 'bg-white text-blue-600 shadow-sm'
                                                        : variant.stock === 0
                                                            ? 'text-gray-400 cursor-not-allowed'
                                                            : 'text-gray-600 hover:text-gray-900'
                                                    }`}
                                            >
                                                {variant.name}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selected info */}
                                <div className="mt-3 flex items-center gap-4">
                                    <span className="text-2xl font-bold text-blue-600">
                                        {formatPrice(sampleVariants.find(v => v.id === selected4)?.price || 0)}
                                    </span>
                                    {(sampleVariants.find(v => v.id === selected4)?.originalPrice || 0) > (sampleVariants.find(v => v.id === selected4)?.price || 0) && (
                                        <span className="text-gray-400 line-through">
                                            {formatPrice(sampleVariants.find(v => v.id === selected4)?.originalPrice || 0)}
                                        </span>
                                    )}
                                    <span className="text-sm text-gray-500">
                                        Còn {sampleVariants.find(v => v.id === selected4)?.stock} sản phẩm
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========== Mẫu 4: Horizontal Scroll Pills ========== */}
                    <div
                        className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer ${selectedStyle === 'scroll' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-transparent hover:border-gray-200'
                            }`}
                        onClick={() => setSelectedStyle('scroll')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Mẫu 4: Horizontal Scroll Pills</h2>
                                <p className="text-sm text-gray-500">Tốt cho mobile, cuộn ngang không wrap</p>
                            </div>
                            {selectedStyle === 'scroll' && (
                                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Đã chọn
                                </span>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                            <label className="text-sm font-medium text-gray-700 mb-3 block">Phân loại</label>
                            <div
                                className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300"
                                onClick={(e) => e.stopPropagation()}
                                style={{ scrollbarWidth: 'thin' }}
                            >
                                {sampleVariants.map((variant) => {
                                    const isSelected = selected5 === variant.id;
                                    const isOutOfStock = variant.stock === 0;
                                    const hasDiscount = variant.originalPrice > variant.price;

                                    return (
                                        <button
                                            key={variant.id}
                                            onClick={() => setSelected5(variant.id)}
                                            disabled={isOutOfStock}
                                            className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${isSelected
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                    : isOutOfStock
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:shadow-md'
                                                }`}
                                        >
                                            {variant.name}
                                            <span className={`ml-1.5 ${isSelected ? 'text-blue-100' : hasDiscount ? 'text-red-500' : 'text-gray-500'}`}>
                                                {(variant.price / 1000).toFixed(0)}k
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">← Vuốt để xem thêm →</p>
                        </div>
                    </div>

                    {/* ========== Mẫu 5: Mini Table ========== */}
                    <div
                        className={`bg-white rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer ${selectedStyle === 'table' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-transparent hover:border-gray-200'
                            }`}
                        onClick={() => setSelectedStyle('table')}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Mẫu 5: Mini Table</h2>
                                <p className="text-sm text-gray-500">Chi tiết nhất, hiển thị như bảng giá</p>
                            </div>
                            {selectedStyle === 'table' && (
                                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Đã chọn
                                </span>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                            <label className="text-sm font-medium text-gray-700 mb-3 block">Chọn gói</label>
                            <div className="overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b">
                                            <th className="pb-2 font-medium"></th>
                                            <th className="pb-2 font-medium">Gói</th>
                                            <th className="pb-2 font-medium">Giá</th>
                                            <th className="pb-2 font-medium">Tiết kiệm</th>
                                            <th className="pb-2 font-medium">Kho</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sampleVariants.map((variant) => {
                                            const isSelected = selected6 === variant.id;
                                            const isOutOfStock = variant.stock === 0;
                                            const savings = variant.originalPrice - variant.price;

                                            return (
                                                <tr
                                                    key={variant.id}
                                                    onClick={() => !isOutOfStock && setSelected6(variant.id)}
                                                    className={`border-b last:border-0 transition-colors ${isOutOfStock
                                                            ? 'opacity-50 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'bg-blue-50'
                                                                : 'hover:bg-gray-100 cursor-pointer'
                                                        }`}
                                                >
                                                    <td className="py-3 pr-3">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                                            }`}>
                                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </td>
                                                    <td className={`py-3 font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                                        {variant.name}
                                                    </td>
                                                    <td className="py-3">
                                                        <span className="font-bold text-gray-900">{formatPrice(variant.price)}</span>
                                                    </td>
                                                    <td className="py-3">
                                                        {savings > 0 && (
                                                            <span className="text-green-600 font-medium">-{formatPrice(savings)}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                                            }`}>
                                                            {isOutOfStock ? 'Hết' : variant.stock}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Selection Summary */}
                {selectedStyle && (
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
                        <div className="max-w-4xl mx-auto flex items-center justify-between">
                            <div>
                                <span className="text-gray-600">Bạn đã chọn: </span>
                                <span className="font-bold text-blue-600 capitalize">
                                    {selectedStyle === 'current' && 'Chips với giá (hiện tại)'}
                                    {selectedStyle === 'dropdown' && 'Dropdown Select'}
                                    {selectedStyle === 'radio' && 'Radio List'}
                                    {selectedStyle === 'segmented' && 'Segmented Control'}
                                    {selectedStyle === 'scroll' && 'Horizontal Scroll Pills'}
                                    {selectedStyle === 'table' && 'Mini Table'}
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedStyle(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => alert(`Đã chọn mẫu: ${selectedStyle}. Hãy nhắn tôi để áp dụng!`)}
                                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Xác nhận chọn mẫu này
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
