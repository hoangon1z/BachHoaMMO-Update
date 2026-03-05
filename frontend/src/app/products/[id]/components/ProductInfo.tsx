'use client';

import { Star, ShoppingCart, Check, Minus, Plus, Share2, Package, Clock, ArrowUpCircle, Mail, User, Key, Link2, Hash, MessageSquare, Zap } from 'lucide-react';
import { ProductVariant, formatPrice } from './types';

const FIELD_CONFIG: Record<string, { label: string; icon: any; type: string; placeholder: string }> = {
    link: { label: 'Link/URL', icon: Link2, type: 'url', placeholder: 'https://www.facebook.com/...' },
    username: { label: 'Tên tài khoản', icon: User, type: 'text', placeholder: 'Nhập tên tài khoản' },
    email: { label: 'Email', icon: Mail, type: 'email', placeholder: 'example@gmail.com' },
    password: { label: 'Mật khẩu', icon: Key, type: 'password', placeholder: '••••••••' },
    quantity: { label: 'Số lượng', icon: Hash, type: 'number', placeholder: 'VD: 1000' },
    note: { label: 'Ghi chú', icon: MessageSquare, type: 'text', placeholder: 'Ghi chú cho người bán (tùy chọn)' },
};

interface ProductInfoProps {
    title: string;
    rating: number;
    totalReviews: number;
    totalSold: number;
    hasVariants?: boolean;
    variants?: ProductVariant[];
    selectedVariantId: string | null;
    onSelectVariant: (id: string) => void;
    currentPrice: number;
    currentSalePrice?: number;
    discount: number;
    currentStock: number;
    isManualDelivery: boolean;
    canPurchase: boolean;
    quantity: number;
    onChangeQuantity: (qty: number) => void;
    isUpgradeProduct: boolean;
    isServiceProduct?: boolean;
    needsBuyerFields?: boolean;
    requiredFields: string[];
    hasQuantityInBuyerFields?: boolean;
    buyerData: Record<string, string>;
    onChangeBuyerData: (data: Record<string, string>) => void;
    onAddToCart: () => void;
    onBuyNow: () => void;
    onShare: () => void;
    addedToCart: boolean;
}

export function ProductInfo({
    title, rating, totalReviews, totalSold,
    hasVariants, variants, selectedVariantId, onSelectVariant,
    currentPrice, currentSalePrice, discount,
    currentStock, isManualDelivery, canPurchase,
    quantity, onChangeQuantity,
    isUpgradeProduct, isServiceProduct, needsBuyerFields, requiredFields,
    hasQuantityInBuyerFields,
    buyerData, onChangeBuyerData,
    onAddToCart, onBuyNow, onShare, addedToCart,
}: ProductInfoProps) {

    const selectedVariant = variants?.find(v => v.id === selectedVariantId) || null;

    // Color theme based on product type
    const theme = isServiceProduct
        ? { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700' }
        : { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-700', ring: 'ring-purple-400', btn: 'bg-purple-600 hover:bg-purple-700' };

    return (
        <div className="p-4 sm:p-5 flex flex-col">
            {/* Title */}
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-2">{title}</h1>

            {/* Stats — inline text */}
            <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-4">
                <span className="flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-gray-700 font-medium">{rating.toFixed(1)}</span>
                    <span>({totalReviews})</span>
                </span>
                <span>•</span>
                <span>{totalSold} đã bán</span>
            </div>

            {/* Price */}
            <div className="mb-4">
                {currentSalePrice && currentSalePrice > currentPrice ? (
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#ee4d2d]">{formatPrice(currentPrice)}</span>
                        {hasQuantityInBuyerFields && <span className="text-sm text-gray-400">/đơn vị</span>}
                        <span className="text-base text-gray-400 line-through">{formatPrice(currentSalePrice)}</span>
                        <span className="text-[13px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">-{discount}%</span>
                    </div>
                ) : (
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#ee4d2d]">{formatPrice(currentPrice)}</span>
                        {hasQuantityInBuyerFields && <span className="text-sm text-gray-400">/đơn vị</span>}
                    </div>
                )}
                {/* Subtotal when quantity entered */}
                {hasQuantityInBuyerFields && quantity > 1 && (
                    <div className="mt-1.5 flex items-center gap-2 text-sm">
                        <span className="text-gray-500">{formatPrice(currentPrice)} × {quantity.toLocaleString('vi-VN')} =</span>
                        <span className="font-bold text-[#ee4d2d] text-lg">{formatPrice(currentPrice * quantity)}</span>
                    </div>
                )}
            </div>

            {/* Variants */}
            {hasVariants && variants && variants.length > 0 && (
                <div className="mb-4">
                    <span className="text-[13px] text-gray-500 mb-2.5 block font-medium">Phân loại ({variants.length})</span>
                    <div className="flex flex-wrap gap-2">
                        {variants.map((variant) => {
                            const isSelected = selectedVariantId === variant.id;
                            const isOutOfStock = variant.stock === 0 && !isManualDelivery;
                            return (
                                <button
                                    key={variant.id}
                                    onClick={() => { if (!isOutOfStock) { onSelectVariant(variant.id); onChangeQuantity(1); } }}
                                    disabled={isOutOfStock}
                                    className={`relative px-3.5 py-2.5 rounded-xl text-[14px] transition-all
                    ${isSelected
                                            ? 'bg-blue-50 border-[1.5px] border-blue-500 text-blue-700 font-semibold'
                                            : isOutOfStock
                                                ? 'bg-gray-50 border border-gray-200 text-gray-300 cursor-not-allowed line-through'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 font-medium'
                                        }`}
                                >
                                    {isSelected && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-white" />
                                        </span>
                                    )}
                                    <span>{variant.name}</span>
                                    <span className="block text-[14px] mt-0.5 text-[#ee4d2d] font-semibold">{formatPrice(variant.price)}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Stock info for selected variant */}
                    {selectedVariant && !isManualDelivery && (
                        <div className={`mt-2 text-[12px] flex items-center gap-1 ${selectedVariant.stock < 10 ? 'text-orange-500' : 'text-gray-400'}`}>
                            <Package className="w-3 h-3" />
                            {selectedVariant.stock === 0 ? 'Hết hàng' : `Còn ${selectedVariant.stock} sản phẩm`}
                        </div>
                    )}
                    {isManualDelivery && (
                        <div className="mt-2 text-[12px] text-orange-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Giao thủ công
                        </div>
                    )}
                </div>
            )}

            {/* Quantity — HIDE if 'quantity' is already in buyer fields */}
            {!hasQuantityInBuyerFields && (
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-[13px] text-gray-500">Số lượng</span>
                    <div className="inline-flex items-center rounded border border-gray-200">
                        <button onClick={() => onChangeQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-500" disabled={quantity <= 1}>
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-medium text-gray-900 border-x border-gray-200">{quantity}</span>
                        <button onClick={() => onChangeQuantity(Math.min(isManualDelivery ? 99 : currentStock, quantity + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-500" disabled={!isManualDelivery && quantity >= currentStock}>
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {!hasVariants && !isManualDelivery && (
                        <span className="text-[12px] text-gray-400">{currentStock} có sẵn</span>
                    )}
                </div>
            )}

            {/* Buyer Fields — for UPGRADE and SERVICE products */}
            {needsBuyerFields && requiredFields.length > 0 && (
                <div className={`mb-4 p-3 ${theme.bg} rounded-lg`}>
                    <div className="flex items-center gap-1.5 mb-2">
                        {isServiceProduct
                            ? <Zap className="w-4 h-4 text-emerald-500" />
                            : <ArrowUpCircle className="w-4 h-4 text-purple-500" />
                        }
                        <span className={`text-[13px] font-medium ${theme.text}`}>
                            {isServiceProduct ? 'Thông tin dịch vụ' : 'Thông tin nâng cấp'}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {requiredFields.map((field) => {
                            const config = FIELD_CONFIG[field] || { label: field, icon: MessageSquare, type: 'text', placeholder: `Nhập ${field}` };
                            const Icon = config.icon;
                            const isOptional = field === 'note';
                            return (
                                <div key={field} className="flex items-center gap-2">
                                    <span className={`text-[12px] ${theme.text} w-20 flex-shrink-0 flex items-center gap-1`}>
                                        <Icon className="w-3 h-3" />
                                        {config.label}
                                        {isOptional && <span className="text-[10px] text-gray-400">(tùy chọn)</span>}
                                    </span>
                                    <input
                                        type={config.type}
                                        placeholder={config.placeholder}
                                        value={buyerData[field] || ''}
                                        onChange={(e) => onChangeBuyerData({ ...buyerData, [field]: e.target.value })}
                                        min={config.type === 'number' ? '1' : undefined}
                                        className={`flex-1 px-2.5 py-1.5 border ${theme.border} rounded text-sm bg-white focus:outline-none focus:ring-1 focus:${theme.ring}`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">
                        {isServiceProduct
                            ? 'Thông tin sẽ được gửi cho seller để xử lý dịch vụ.'
                            : 'Thông tin chỉ được chia sẻ với seller để nâng cấp.'}
                    </p>
                </div>
            )}

            {/* Actions — push to bottom */}
            <div className="mt-auto pt-2 space-y-2">
                <div className="flex gap-2">
                    <button
                        onClick={onAddToCart}
                        disabled={!canPurchase}
                        className={`flex-1 h-11 rounded-lg font-medium text-[13px] flex items-center justify-center gap-1.5 transition-all
              ${addedToCart
                                ? 'bg-green-500 text-white'
                                : canPurchase
                                    ? 'border border-blue-500 text-blue-600 hover:bg-blue-50'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {addedToCart ? <><Check className="w-4 h-4" /> Đã thêm</> : <><ShoppingCart className="w-4 h-4" /> Thêm giỏ hàng</>}
                    </button>
                    <button
                        onClick={onBuyNow}
                        disabled={!canPurchase}
                        className={`flex-1 h-11 rounded-lg font-medium text-[13px] text-white flex items-center justify-center transition-all
              ${!canPurchase ? 'bg-gray-300 cursor-not-allowed' : needsBuyerFields ? theme.btn : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isServiceProduct ? 'Đặt dịch vụ' : isUpgradeProduct ? 'Nâng cấp ngay' : 'Mua ngay'}
                    </button>
                </div>

                <button onClick={onShare} className="w-full h-9 text-[12px] text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 transition-colors">
                    <Share2 className="w-3.5 h-3.5" /> Chia sẻ sản phẩm
                </button>
            </div>

            {/* Notices */}
            {!canPurchase && (
                <p className="mt-2 text-[12px] text-red-500 text-center">Sản phẩm tạm hết hàng</p>
            )}
            {isManualDelivery && currentStock === 0 && canPurchase && (
                <p className="mt-2 text-[12px] text-orange-500 text-center">
                    Seller sẽ gửi thông tin sau khi đặt hàng (trong 24h)
                </p>
            )}
        </div>
    );
}
