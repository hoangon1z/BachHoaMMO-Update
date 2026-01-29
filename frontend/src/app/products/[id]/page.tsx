import { serverMarketplaceApi } from '@/lib/server-api';
import ProductDetailClient from './ProductDetailClient';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

/**
 * Server Component - Fetches product data on server
 * NO API calls visible in browser Network tab!
 */
export default async function ProductDetailPage({ params }: PageProps) {
  // Fetch product on server-side - Client will NOT see this API call
  const data = await serverMarketplaceApi.getProduct(params.id);

  if (!data) {
    notFound();
  }

  // Transform data
  const images = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
  
  // Backend URL for avatar images
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  
  // Transform seller avatar URL to include full backend path
  const sellerAvatar = data.seller?.avatar 
    ? (data.seller.avatar.startsWith('http') ? data.seller.avatar : `${backendUrl}${data.seller.avatar}`)
    : undefined;
  
  const product = {
    id: data.id,
    title: data.title,
    description: data.description,
    price: data.price,
    salePrice: data.salePrice,
    stock: data.stock,
    images: images || [],
    category: { 
      id: data.category?.id || '', 
      name: data.category?.name || '', 
      slug: data.category?.slug || '' 
    },
    seller: {
      id: data.seller?.id || '',
      name: data.seller?.sellerProfile?.shopName || data.seller?.name || 'Unknown Seller',
      shopLogo: data.seller?.sellerProfile?.shopLogo 
        ? (data.seller.sellerProfile.shopLogo.startsWith('http') ? data.seller.sellerProfile.shopLogo : `${backendUrl}${data.seller.sellerProfile.shopLogo}`)
        : sellerAvatar,
      avatar: sellerAvatar,
      rating: data.seller?.sellerProfile?.rating || 0,
      totalSales: data.seller?.sellerProfile?.totalSales || 0,
      joinDate: data.seller?.createdAt 
        ? new Date(data.seller.createdAt).toLocaleDateString('vi-VN')
        : '',
    },
    rating: data.rating || 0,
    totalReviews: 0,
    totalSold: data.sales || 0,
    views: data.views || 0,
    // Include variants data
    hasVariants: data.hasVariants || false,
    variants: data.variants?.map((v: any) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      salePrice: v.salePrice,
      stock: v.stock,
      sku: v.sku,
      attributes: v.attributes,
    })) || [],
  };

  return <ProductDetailClient product={product} />;
}
