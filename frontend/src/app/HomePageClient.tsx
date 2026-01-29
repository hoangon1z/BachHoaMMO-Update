'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { SmartCategories } from '@/components/SmartCategories';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { SupportWidgets } from '@/components/SupportWidgets';
import { Footer } from '@/components/Footer';
import { TopShops } from '@/components/TopShops';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  link: string;
  gradient?: string;
  discount?: string;
  price?: string;
  originalPrice?: string;
  position: number;
  isActive: boolean;
}

interface AuctionWinner {
  position: number;
  sellerId: string;
  shopName: string;
  shopLogo?: string;
  shopDescription?: string;
  rating: number;
  totalSales: number;
  amount: number;
}

interface HomePageClientProps {
  initialFeaturedProducts: any[];
  initialLatestProducts: any[];
  initialCategories: Category[];
  initialBanners: Banner[];
  initialAuctionWinners?: AuctionWinner[];
}

export default function HomePageClient({ 
  initialFeaturedProducts,
  initialLatestProducts,
  initialCategories,
  initialBanners,
  initialAuctionWinners = [],
}: HomePageClientProps) {
  const { user, logout, checkAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    // Only check auth once on mount
    checkAuth();
  }, []); // Empty deps to run once

  const handleLogout = () => {
    logout();
  };

  // Search is now handled directly in Header component

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header Component - Only show after auth check */}
      <Header 
        user={isInitialized ? user : null} 
        onLogout={handleLogout}
      />

      {/* Hero Section - Data from server */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <HeroSection banners={initialBanners} />
      </div>

      {/* Top Shops from Auction */}
      {initialAuctionWinners.length > 0 && (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <TopShops winners={initialAuctionWinners} />
        </div>
      )}

      {/* Categories - Data from server */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <SmartCategories categories={initialCategories} />
      </div>

      {/* Featured Products - Data from server */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <FeaturedProducts 
          products={initialFeaturedProducts} 
          title="Sản phẩm nổi bật"
        />
      </div>

      {/* Latest Products - Data from server */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <FeaturedProducts 
          products={initialLatestProducts} 
          title="Sản phẩm mới nhất"
        />
      </div>

      {/* Support Widgets */}
      <SupportWidgets />

      {/* Footer */}
      <Footer />
    </div>
  );
}
