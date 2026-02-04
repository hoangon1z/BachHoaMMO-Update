import { serverMarketplaceApi } from '@/lib/server-api';
import ProductDetailClient from './ProductDetailClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/** JSON-LD Product structured data for Google Rich Results */
function ProductStructuredData({ product, productUrl }: { product: any; productUrl: string }) {
  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
  const imageUrls = images?.map((img: string) => 
    img.startsWith('http') ? img : `${SITE_URL}${img}`
  ) || [`${SITE_URL}/images/logobachhoa.png`];

  const price = product.price; // Giá bán (khách trả) cho SEO
  const description = typeof product.description === 'string'
    ? product.description.replace(/<[^>]*>/g, '').slice(0, 500)
    : '';

  const sellerName = product.seller?.sellerProfile?.shopName || product.seller?.name || 'BachHoaMMO';
  const shopUrl = product.seller?.id ? `${SITE_URL}/shop/${product.seller.id}` : SITE_URL;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: description || `Mua ${product.title} giá rẻ uy tín tại BachHoaMMO. Giao hàng tự động 24/7. Bảo hành trọn đời.`,
    image: imageUrls,
    url: productUrl,
    sku: product.id,
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: 'BachHoaMMO',
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'VND',
      price: price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.stock > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: sellerName,
        url: shopUrl,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'VND',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'MIN',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 5,
            unitCode: 'MIN',
          },
        },
      },
    },
    ...(product.rating && product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.sales || 1,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    category: product.category?.name || 'Sản phẩm số',
    ...(product.sales && product.sales > 0 && {
      review: {
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: product.rating || 5,
          bestRating: 5,
        },
        author: {
          '@type': 'Person',
          name: 'Khách hàng BachHoaMMO',
        },
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

  // Tạo title tối ưu SEO với brand name và category
  const categoryName = data.category?.name || 'Sản phẩm số';
  const seoTitle = `Mua ${data.title} Giá Rẻ Uy Tín | ${categoryName} | BachHoaMMO`;
  
  // Description tối ưu với từ khóa và call-to-action
  const cleanDesc = typeof data.description === 'string'
    ? data.description.replace(/<[^>]*>/g, '').trim()
    : '';
  const priceText = data.price ? `Giá chỉ ${data.price.toLocaleString('vi-VN')}đ` : 'Giá tốt';
  const seoDescription = cleanDesc
    ? `${cleanDesc.slice(0, 120)}. ${priceText}. Giao hàng tự động 24/7. Bảo hành trọn đời. Mua ngay tại BachHoaMMO!`
    : `Mua ${data.title} giá rẻ uy tín tại BachHoaMMO. ${priceText}. Giao hàng tự động 24/7. Bảo hành đổi trả miễn phí.`;
  
  const images = typeof data.images === 'string' ? JSON.parse(data.images) : data.images;
  const imageUrl = images?.[0]
    ? (images[0].startsWith('http') ? images[0] : `${SITE_URL}${images[0]}`)
    : `${SITE_URL}/images/logobachhoa.png`;

  // Extract keywords từ title và category
  const keywords = [
    `mua ${data.title.toLowerCase()}`,
    `${data.title.toLowerCase()} giá rẻ`,
    `${data.title.toLowerCase()} uy tín`,
    categoryName.toLowerCase(),
    `mua ${categoryName.toLowerCase()}`,
    'bachhoammo',
    'chợ mmo',
    'tài khoản giá rẻ',
    'giao hàng tự động',
  ];

  return {
    title: seoTitle,
    description: seoDescription.slice(0, 160), // Google limit 160 chars
    keywords: keywords,
    authors: [{ name: 'BachHoaMMO', url: SITE_URL }],
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      title: seoTitle,
      description: seoDescription.slice(0, 160),
      url: `${SITE_URL}/products/${id}`,
      siteName: 'BachHoaMMO',
      images: [
        { 
          url: imageUrl, 
          width: 1200, 
          height: 630, 
          alt: `${data.title} - BachHoaMMO`,
        }
      ],
    },
    twitter: { 
      card: 'summary_large_image', 
      title: seoTitle,
      description: seoDescription.slice(0, 160),
      images: [imageUrl],
      site: '@bachhoammo',
    },
    alternates: { 
      canonical: `${SITE_URL}/products/${id}`,
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
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
