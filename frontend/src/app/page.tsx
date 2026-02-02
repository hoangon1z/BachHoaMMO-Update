import { serverMarketplaceApi } from '@/lib/server-api';
import HomePageClient from './HomePageClient';

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bachhoammo.store';

/** JSON-LD structured data for SEO (Google Rich Results) */
function HomePageStructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'BachHoaMMO',
        description: 'Nền tảng mua bán tài khoản game, vật phẩm game, dịch vụ MMO uy tín hàng đầu Việt Nam',
        inLanguage: 'vi-VN',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/explore?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'BachHoaMMO',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/logobachhoa.png` },
        description: 'Chợ MMO mua bán tài khoản game uy tín hàng đầu Việt Nam',
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

/**
 * Server Component - Fetches ALL data on server
 * NO API calls visible in browser Network tab!
 */
export default async function HomePage() {
  // Fetch ALL data on server-side - Client will NOT see these API calls
  const [featuredProducts, latestProducts, categories, banners, auctionWinners] = await Promise.all([
    serverMarketplaceApi.getFeaturedProducts(),
    serverMarketplaceApi.getLatestProducts(),
    serverMarketplaceApi.getCategories(true), // Only parent categories for homepage
    serverMarketplaceApi.getBanners(),
    serverMarketplaceApi.getAuctionWinners(),
  ]);

  // Pass all data to client component
  return (
    <>
      <HomePageStructuredData />
      <HomePageClient 
        initialFeaturedProducts={featuredProducts}
        initialLatestProducts={latestProducts}
        initialCategories={categories}
        initialBanners={banners}
        initialAuctionWinners={auctionWinners}
      />
    </>
  );
}
