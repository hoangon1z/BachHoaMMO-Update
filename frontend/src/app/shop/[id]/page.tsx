import { serverMarketplaceApi } from '@/lib/server-api';
import ShopPageClient from './ShopPageClient';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

/**
 * Server Component - Fetches shop data on server
 * NO API calls visible in browser Network tab!
 */
export default async function ShopPage({ params }: PageProps) {
  // Fetch all shop data on server-side - Client will NOT see these API calls
  const [shopData, productsData] = await Promise.all([
    serverMarketplaceApi.getShopProfile(params.id),
    serverMarketplaceApi.getShopProducts(params.id, { page: 1, limit: 12 }),
  ]);

  if (!shopData || shopData.error) {
    notFound();
  }

  const shop = {
    id: shopData.id,
    name: shopData.name || 'Shop',
    description: shopData.description || '',
    logo: shopData.logo,
    rating: shopData.rating || 0,
    totalSales: shopData.totalSales || 0,
    totalProducts: shopData.totalProducts || 0,
    isVerified: shopData.isVerified || false,
    joinDate: shopData.joinDate || new Date().toISOString(),
  };

  const products = productsData.products || [];
  const pagination = productsData.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 };

  return (
    <ShopPageClient 
      shop={shop}
      initialProducts={products}
      initialPagination={pagination}
    />
  );
}
