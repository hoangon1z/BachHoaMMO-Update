'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Shield, Zap, HeadphonesIcon, Sparkles, ArrowRight, Play, Music, Bot } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Helper to get full image URL
function getImageUrl(url: string): string {
  if (!url) return '';
  // If it's already an absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // If it's a relative URL starting with /uploads, prepend the API base URL
  if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
  return url;
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

interface HeroSectionProps {
  banners: Banner[];
}

/**
 * HeroSection - Modern Bento Grid Style
 */
export function HeroSection({ banners }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!banners || banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  const hasBanners = banners && banners.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
      {/* Main Banner - Takes 8 columns on desktop */}
      <div className="lg:col-span-8 relative group">
        <div className="relative h-[200px] sm:h-[280px] lg:h-full lg:min-h-[320px] rounded-2xl overflow-hidden">
          {hasBanners ? (
            <>
              {banners.map((banner, index) => (
                <Link
                  key={banner.id}
                  href={banner.link}
                  aria-label={`Banner: ${banner.title}`}
                  className={`absolute inset-0 transition-all duration-700 ${
                    index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                  style={{ pointerEvents: index === currentSlide ? 'auto' : 'none' }}
                >
                  <div className="w-full h-full">
                    {banner.image && (
                      <img 
                        src={getImageUrl(banner.image)} 
                        alt={banner.title || 'Banner khuyến mãi'}
                        className="absolute inset-0 w-full h-full object-cover"
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    )}
                  </div>
                </Link>
              ))}

              {/* Slide indicators */}
              {banners.length > 1 && (
                <div className="absolute bottom-5 right-5 sm:right-8 flex gap-1.5 z-20" role="tablist" aria-label="Chọn banner">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      role="tab"
                      aria-label={`Xem banner ${index + 1}`}
                      aria-selected={index === currentSlide}
                      onClick={(e) => { e.preventDefault(); setCurrentSlide(index); }}
                      className={`h-2.5 min-w-[10px] rounded-full transition-all ${
                        index === currentSlide ? 'w-6 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Navigation */}
              {banners.length > 1 && (
                <>
                  <button
                    aria-label="Banner trước"
                    onClick={(e) => { e.preventDefault(); setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    aria-label="Banner tiếp theo"
                    onClick={(e) => { e.preventDefault(); setCurrentSlide((prev) => (prev + 1) % banners.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center">
              <div className="text-center text-white p-6">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">BachHoaMMO</h2>
                <p className="text-white/80">Chợ tài khoản số uy tín #1 Việt Nam</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Featured Categories */}
      <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4 lg:grid-rows-3">
        {/* Netflix Category */}
        <Link href="/explore?category=netflix" className="group/card relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-red-800 p-4 lg:p-5 h-[100px] lg:h-full">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Play className="w-5 h-5 text-white" />
              <span className="text-xs font-bold text-white/90 uppercase tracking-wide">Netflix</span>
            </div>
            <p className="text-lg lg:text-xl font-bold text-white">Tài khoản Premium</p>
            <p className="text-xs text-white/70 hidden lg:block mt-1">Xem phim không giới hạn</p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-white/50 group-hover/card:text-white group-hover/card:translate-x-1 transition-all" />
        </Link>

        {/* Spotify Category */}
        <Link href="/explore?category=spotify" className="group/card relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 p-4 lg:p-5 h-[100px] lg:h-full">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Music className="w-5 h-5 text-white" />
              <span className="text-xs font-bold text-white/90 uppercase tracking-wide">Spotify</span>
            </div>
            <p className="text-lg lg:text-xl font-bold text-white">Nghe nhạc Premium</p>
            <p className="text-xs text-white/70 hidden lg:block mt-1">Không quảng cáo</p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-white/50 group-hover/card:text-white group-hover/card:translate-x-1 transition-all" />
        </Link>

        {/* AI Tools Category - Hidden on mobile */}
        <Link href="/explore?category=ai" className="hidden lg:flex group/card relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 h-full">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-5 h-5 text-violet-200" />
              <span className="text-xs font-bold text-white/90 uppercase tracking-wide">AI Tools</span>
            </div>
            <p className="text-xl font-bold text-white">ChatGPT, Midjourney</p>
            <p className="text-xs text-white/70 mt-1">Công cụ AI hàng đầu</p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-white/50 group-hover/card:text-white group-hover/card:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Bottom Trust Bar - Full width */}
      <div className="lg:col-span-12 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-900">Bảo hành 100%</p>
            <p className="text-[10px] text-gray-500">Hoàn tiền nếu lỗi</p>
          </div>
          <span className="sm:hidden text-xs font-medium text-gray-700">Bảo hành 100%</span>
        </div>
        
        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-green-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-900">Giao hàng tự động</p>
            <p className="text-[10px] text-gray-500">Nhận ngay sau thanh toán</p>
          </div>
          <span className="sm:hidden text-xs font-medium text-gray-700">Giao tự động</span>
        </div>
        
        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <HeadphonesIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-900">Hỗ trợ 24/7</p>
            <p className="text-[10px] text-gray-500">Luôn sẵn sàng giúp đỡ</p>
          </div>
          <span className="sm:hidden text-xs font-medium text-gray-700">Hỗ trợ 24/7</span>
        </div>
        
        <div className="w-px h-8 bg-gray-200 flex-shrink-0 hidden sm:block" />
        
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">Uy tín #1</p>
            <p className="text-[10px] text-gray-500">10.000+ đánh giá tốt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
