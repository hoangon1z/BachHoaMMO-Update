import { serverMarketplaceApi } from '@/lib/server-api';
import { normalizeProduct } from '@/lib/utils';
import ShopPageClient from './ShopPageClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Disable caching so admin-updated stats (totalSales, rating) appear immediately
export const revalidate = 0;

// Public backend URL for images (accessible from client browser)
const PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

// Helper to get full image URL (use public URL so it works in browser)
function getFullImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${PUBLIC_BACKEND_URL}${url}`;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const shopData = await serverMarketplaceApi.getShopProfile(id);

  if (!shopData || shopData.error) {
    return { title: 'Shop | BachHoaMMO' };
  }

  const shopName = shopData.name || 'Shop';
  const description = shopData.description || `Mua sản phẩm số uy tín tại ${shopName} trên BachHoaMMO`;
  const logoUrl = getFullImageUrl(shopData.logo) || `${SITE_URL}/images/logobachhoa.png`;

  return {
    title: `${shopName} - Cửa hàng sản phẩm số | BachHoaMMO`,
    description: description.slice(0, 160),
    openGraph: {
      title: `${shopName} | BachHoaMMO`,
      description,
      url: `${SITE_URL}/shop/${id}`,
      type: 'profile',
      images: [{ url: logoUrl, width: 200, height: 200, alt: shopName }],
    },
    alternates: { canonical: `${SITE_URL}/shop/${id}` },
  };
}

/** Shop structured data */
function ShopStructuredData({ shop, shopUrl }: { shop: any; shopUrl: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    description: shop.description || `Cửa hàng ${shop.name} trên BachHoaMMO`,
    url: shopUrl,
    image: shop.logo || `${SITE_URL}/images/logobachhoa.png`,
    ...(shop.rating && shop.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: shop.rating,
        ratingCount: shop.totalSales || 1,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * Server Component - Fetches shop data on server
 * NO API calls visible in browser Network tab!
 */
export default async function ShopPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch all shop data on server-side - Client will NOT see these API calls
  const [shopData, productsData] = await Promise.all([
    serverMarketplaceApi.getShopProfile(id),
    serverMarketplaceApi.getShopProducts(id, { page: 1, limit: 12 }),
  ]);

  if (!shopData || shopData.error) {
    notFound();
  }

  const shop = {
    id: shopData.id,
    sellerId: shopData.id, // User ID of the seller
    name: shopData.name || 'Shop',
    description: shopData.description || '',
    logo: getFullImageUrl(shopData.logo),
    rating: shopData.rating || 0,
    totalSales: shopData.totalSales || 0,
    totalProducts: shopData.totalProducts || 0,
    isVerified: shopData.isVerified || false,
    insuranceLevel: shopData.insuranceLevel || 0,
    insuranceTier: shopData.insuranceTier || null,
    isProfileComplete: shopData.isProfileComplete || false,
    joinDate: shopData.joinDate || new Date().toISOString(),
  };

  const products = (productsData.products || []).map((p: any) => normalizeProduct(p));
  const pagination = productsData.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 };
  const shopUrl = `${SITE_URL}/shop/${id}`;

  return (
    <>
      <ShopStructuredData shop={shop} shopUrl={shopUrl} />
      <ShopPageClient
        shop={shop}
        initialProducts={products}
        initialPagination={pagination}
      />
    </>
  );
}
