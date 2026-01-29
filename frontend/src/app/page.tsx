import { serverMarketplaceApi } from '@/lib/server-api';
import HomePageClient from './HomePageClient';

/**
 * Server Component - Fetches ALL data on server
 * NO API calls visible in browser Network tab!
 */
export default async function HomePage() {
  // Fetch ALL data on server-side - Client will NOT see these API calls
  const [featuredProducts, latestProducts, categories, banners, auctionWinners] = await Promise.all([
    serverMarketplaceApi.getFeaturedProducts(),
    serverMarketplaceApi.getLatestProducts(),
    serverMarketplaceApi.getCategories(),
    serverMarketplaceApi.getBanners(),
    serverMarketplaceApi.getAuctionWinners(),
  ]);

  // Pass all data to client component
  return (
    <HomePageClient 
      initialFeaturedProducts={featuredProducts}
      initialLatestProducts={latestProducts}
      initialCategories={categories}
      initialBanners={banners}
      initialAuctionWinners={auctionWinners}
    />
  );
}
