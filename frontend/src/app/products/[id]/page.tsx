import { serverMarketplaceApi } from '@/lib/server-api';
import ProductDetailClient from './ProductDetailClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/** JSON-LD Product structured data for Google Rich Results */
function ProductStructuredData({ product, productUrl }: { product: any; productUrl: string }) {
  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
  const imageUrl = images?.[0]
    ? (images[0].startsWith('http') ? images[0] : `${SITE_URL}${images[0]}`)
    : `${SITE_URL}/images/logobachhoa.png`;

  const price = product.originalPrice || product.price;
  const description = typeof product.description === 'string'
    ? product.description.replace(/<[^>]*>/g, '').slice(0, 500)
    : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: description || `Mua ${product.title} uy tín tại BachHoaMMO`,
    image: imageUrl,
    url: productUrl,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'BachHoaMMO',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'VND',
      price: price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      availability: product.stock > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller?.sellerProfile?.shopName || product.seller?.name || 'BachHoaMMO',
      },
    },
    ...(product.rating && product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        ratingCount: product.sales || 1,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    category: product.category?.name || 'Sản phẩm số',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/** Breadcrumb structured data */
function BreadcrumbStructuredData({ product, productUrl }: { product: any; productUrl: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Trang chủ',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category?.name || 'Sản phẩm',
        item: `${SITE_URL}/explore?category=${product.category?.id || ''}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: productUrl,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await serverMarketplaceApi.getProduct(id);
  if (!data) return { title: 'Sản phẩm | BachHoaMMO' };

  const title = `${data.title} | BachHoaMMO`;
  const description =
    (typeof data.description === 'string'
      ? data.description.replace(/<[^>]*>/g, '').slice(0, 160)
      : '') || `Mua ${data.title} uy tín tại BachHoaMMO`;
  const images = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
  const imageUrl = images?.[0]
    ? (images[0].startsWith('http') ? images[0] : `${SITE_URL}${images[0]}`)
    : `${SITE_URL}/images/logobachhoa.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${id}`,
      type: 'website',
      images: [{ url: imageUrl, width: 800, height: 600, alt: data.title }],
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `${SITE_URL}/products/${id}` },
  };
}

/**
 * Server Component - Fetches product data on server
 * NO API calls visible in browser Network tab!
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Fetch product on server-side - Client will NOT see this API call
  const data = await serverMarketplaceApi.getProduct(id);

  if (!data) {
    notFound();
  }

  // Transform data
  const images = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
  
  // Public backend URL for images (accessible from client browser)
  // Use NEXT_PUBLIC_SOCKET_URL which is the public backend URL
  const publicBackendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.BACKEND_URL || 'http://localhost:3001';
  
  // Helper function to transform image URLs
  const transformImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads')) return `${publicBackendUrl}${url}`;
    return `${publicBackendUrl}${url}`;
  };
  
  // Transform seller avatar URL to include full backend path
  const sellerAvatar = transformImageUrl(data.seller?.avatar);
  
  const product = {
    id: data.id,
    title: data.title,
    description: data.description,
    price: data.price,
    originalPrice: data.originalPrice ?? data.salePrice,
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
      shopLogo: transformImageUrl(data.seller?.sellerProfile?.shopLogo) || sellerAvatar,
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
      originalPrice: v.originalPrice ?? v.salePrice,
      stock: v.stock,
      sku: v.sku,
      attributes: v.attributes,
    })) || [],
    // Auto delivery mode
    autoDelivery: data.autoDelivery,
    // Product type: STANDARD or UPGRADE
    productType: data.productType || 'STANDARD',
    // Required buyer fields for UPGRADE products (parse JSON if string)
    requiredBuyerFields: data.requiredBuyerFields 
      ? (typeof data.requiredBuyerFields === 'string' 
          ? JSON.parse(data.requiredBuyerFields) 
          : data.requiredBuyerFields)
      : ['email'],
  };

  const productUrl = `${SITE_URL}/products/${id}`;
  
  return (
    <>
      <ProductStructuredData product={data} productUrl={productUrl} />
      <BreadcrumbStructuredData product={data} productUrl={productUrl} />
      <ProductDetailClient product={product} />
    </>
  );
}
