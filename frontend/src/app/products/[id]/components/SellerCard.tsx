'use client';

import Link from 'next/link';
import { Store, Star, Clock, MessageCircle, Package } from 'lucide-react';
import { VerifyBadge } from '@/components/VerifyBadge';

interface SellerInfo {
    id: string;
    name: string;
    avatar?: string;
    shopLogo?: string;
    rating: number;
    totalSales: number;
    joinDate: string;
    isVerified?: boolean;
    insuranceLevel?: number;
    insuranceTier?: string;
    isProfileComplete?: boolean;
}

interface SellerCardProps {
    seller: SellerInfo;
    onChatWithSeller: () => void;
    isStartingChat: boolean;
}

export function SellerCardDesktop({ seller, onChatWithSeller, isStartingChat }: SellerCardProps) {
    const logoSrc = seller.shopLogo || seller.avatar;
    const formatSales = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    return (
        <div className="sticky top-6 space-y-4">
            {/* Seller info */}
            <div className="bg-white rounded-lg border border-gray-100 p-4">
                <div className="flex items-center gap-3 mb-3">
                    <Link href={`/shop/${seller.id}`}>
                        <div className="w-11 h-11 rounded-lg overflow-hidden bg-blue-600 flex items-center justify-center flex-shrink-0">
                            {logoSrc ? (
                                <img src={logoSrc} alt={seller.name} className="w-full h-full object-cover" />
                            ) : (
                                <Store className="w-5 h-5 text-white" />
                            )}
                        </div>
                    </Link>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1">
                            <Link href={`/shop/${seller.id}`} className="text-[14px] font-semibold text-gray-900 hover:text-blue-600 truncate transition-colors">
                                {seller.name}
                            </Link>
                            <VerifyBadge size={24} isVerified={seller.isVerified || false} insuranceLevel={seller.insuranceLevel} insuranceTier={seller.insuranceTier} />
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-gray-400 mt-0.5">
                            <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                {seller.rating.toFixed(1)}
                            </span>
                            <span>•</span>
                            <span>{formatSales(seller.totalSales)} đã bán</span>
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center py-2 bg-gray-50 rounded">
                        <div className="text-[14px] font-bold text-gray-900">{seller.rating.toFixed(1)}</div>
                        <div className="text-[10px] text-gray-400">Đánh giá</div>
                    </div>
                    <div className="text-center py-2 bg-gray-50 rounded">
                        <div className="text-[14px] font-bold text-gray-900">{formatSales(seller.totalSales)}</div>
                        <div className="text-[10px] text-gray-400">Đã bán</div>
                    </div>
                    <div className="text-center py-2 bg-gray-50 rounded">
                        <div className="text-[11px] font-bold text-gray-900">{seller.joinDate}</div>
                        <div className="text-[10px] text-gray-400">Tham gia</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Link href={`/shop/${seller.id}`} className="flex-1">
                        <button className="w-full h-9 rounded-lg text-[12px] font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-1">
                            <Store className="w-3.5 h-3.5" /> Xem Shop
                        </button>
                    </Link>
                    <button
                        onClick={onChatWithSeller}
                        disabled={isStartingChat}
                        className="flex-1 h-9 rounded-lg text-[12px] font-medium border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center gap-1"
                    >
                        {isStartingChat ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <MessageCircle className="w-3.5 h-3.5" />
                        )}
                        Chat
                    </button>
                </div>
            </div>
        </div>
    );
}

export function SellerCardMobile({ seller, onChatWithSeller, isStartingChat }: SellerCardProps) {
    const logoSrc = seller.shopLogo || seller.avatar;

    return (
        <div className="flex items-center gap-3 py-3.5 px-4 bg-white rounded-2xl border border-gray-100">
            <Link href={`/shop/${seller.id}`} className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-blue-600 flex items-center justify-center">
                    {logoSrc ? (
                        <img src={logoSrc} alt={seller.name} className="w-full h-full object-cover" />
                    ) : (
                        <Store className="w-4 h-4 text-white" />
                    )}
                </div>
            </Link>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                    <Link href={`/shop/${seller.id}`} className="text-[13px] font-semibold text-gray-900 truncate">{seller.name}</Link>
                    <VerifyBadge size={22} isVerified={seller.isVerified || false} insuranceLevel={seller.insuranceLevel} insuranceTier={seller.insuranceTier} />
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{seller.rating.toFixed(1)}</span>
                    <span>•</span>
                    <span>{seller.totalSales} đã bán</span>
                </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
                <Link href={`/shop/${seller.id}`}>
                    <button className="h-8 px-3 rounded text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700">Shop</button>
                </Link>
                <button onClick={onChatWithSeller} disabled={isStartingChat} className="h-8 px-3 rounded text-[11px] font-medium border border-gray-200 text-gray-600 hover:border-blue-300">
                    Chat
                </button>
            </div>
        </div>
    );
}
