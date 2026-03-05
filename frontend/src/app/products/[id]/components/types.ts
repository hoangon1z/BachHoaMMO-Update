// Shared types for product detail page
export interface ProductVariant {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    stock: number;
}

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    stock: number;
    images: string[];
    hasVariants?: boolean;
    variants?: ProductVariant[];
    autoDelivery?: boolean;
    productType?: 'STANDARD' | 'UPGRADE' | 'SERVICE';
    requiredBuyerFields?: string[];
    category: { id: string; name: string; slug: string };
    seller: {
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
    };
    rating: number;
    totalReviews: number;
    totalSold: number;
    views?: number;
}

export const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN').format(price) + 'đ';
