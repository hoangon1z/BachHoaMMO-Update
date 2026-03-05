'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Helper to get full image URL
function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
  return url;
}



/**
 * AutoPlayVideo component
 */
function AutoPlayVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => { });
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => { });
    const events = ['touchstart', 'click', 'scroll', 'keydown'];
    const handler = () => {
      tryPlay();
      events.forEach(e => document.removeEventListener(e, handler));
    };
    events.forEach(e => document.addEventListener(e, handler, { passive: true, once: true }));
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) tryPlay(); }); },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => { observer.disconnect(); events.forEach(e => document.removeEventListener(e, handler)); };
  }, [tryPlay]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay muted loop playsInline
      preload="none" controls={false} disablePictureInPicture
      // @ts-ignore
      webkit-playsinline="true" x-webkit-airplay="deny"
      className={className}
      style={{ pointerEvents: 'none' }}
    />
  );
}

/* ─── Types ─── */

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

interface CategoryShowcase {
  id: string;
  title: string;
  image: string;
  link: string;
  position: number;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface HeroSectionProps {
  banners: Banner[];
  showcases?: CategoryShowcase[];
  categories?: Category[];
}

/* ═══════════════════════════════════════════
   HeroSection — Bento Grid with Category Sidebar
   ═══════════════════════════════════════════ */

export function HeroSection({ banners, showcases = [], categories = [] }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const hasBanners = banners && banners.length > 0;

  const tetVideoBanner = {
    id: 'tet-video-2025',
    title: 'Chúc Mừng Năm Mới 2025',
    isVideo: true,
    videoSrc: '/images/videotet/Red and Gold Modern Happy Chinese New Year Video.mp4',
    link: '/explore',
  };

  const allBanners = hasBanners ? [tetVideoBanner, ...banners] : [tetVideoBanner];
  const totalBanners = allBanners.length;

  useEffect(() => {
    if (totalBanners <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalBanners);
    }, 6000);
    return () => clearInterval(timer);
  }, [totalBanners]);

  // Split showcases: first 2 → right column, rest → bottom row
  const rightShowcases = showcases.slice(0, 2);
  const bottomShowcases = showcases.slice(2, 6);


  return (
    <div className="flex flex-col gap-3">

      {/* ═══ Row 1: Main Banner + Right Showcases ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* Main Banner — Full width now (no sidebar) */}
        <div className="lg:col-span-9 relative group">
          <div className="relative h-[180px] sm:h-[260px] lg:h-[300px] rounded-2xl overflow-hidden">
            {allBanners.map((banner: any, index: number) => (
              <Link
                key={banner.id}
                href={banner.link}
                aria-label={`Banner: ${banner.title}`}
                className={`absolute inset-0 transition-all duration-700 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                style={{ pointerEvents: index === currentSlide ? 'auto' : 'none' }}
              >
                <div className="w-full h-full">
                  {banner.isVideo ? (
                    <AutoPlayVideo src={banner.videoSrc} className="absolute inset-0 w-full h-full object-cover" />
                  ) : banner.image && (
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
            {totalBanners > 1 && (
              <div className="absolute bottom-4 right-4 sm:right-6 flex gap-1.5 z-20" role="tablist" aria-label="Chọn banner">
                {allBanners.map((_: any, index: number) => (
                  <button
                    key={index}
                    role="tab"
                    aria-label={`Xem banner ${index + 1}`}
                    aria-selected={index === currentSlide}
                    onClick={(e) => { e.preventDefault(); setCurrentSlide(index); }}
                    className={`h-2 min-w-[8px] rounded-full transition-all ${index === currentSlide ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            )}

            {/* Navigation arrows */}
            {totalBanners > 1 && (
              <>
                <button
                  aria-label="Banner trước"
                  onClick={(e) => { e.preventDefault(); setCurrentSlide((prev) => (prev - 1 + totalBanners) % totalBanners); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  aria-label="Banner tiếp theo"
                  onClick={(e) => { e.preventDefault(); setCurrentSlide((prev) => (prev + 1) % totalBanners); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column — 3 cols, 2 stacked showcases */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-3 lg:grid-rows-2">
          {rightShowcases.length > 0 && (
            rightShowcases.map((item) => (
              <Link key={item.id} href={item.link} className="block overflow-hidden rounded-2xl group relative">
                <img
                  src={getImageUrl(item.image)}
                  alt={item.title}
                  className="w-full h-[80px] lg:h-[144px] object-fill transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ═══ Row 2: Bottom showcases (3-4 equal items) ═══ */}
      {bottomShowcases.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {bottomShowcases.map((item, i) => (
            <Link
              key={item.id}
              href={item.link}
              className={`block overflow-hidden rounded-2xl group relative ${i === bottomShowcases.length - 1 && bottomShowcases.length % 2 !== 0 ? 'col-span-2 lg:col-span-1' : ''
                }`}
            >
              <img
                src={getImageUrl(item.image)}
                alt={item.title}
                className="w-full h-[80px] lg:h-[140px] object-fill transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          ))}
        </div>
      )}

      {/* ═══ Category Strip ═══ */}
      {categories.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Link
              href="/explore"
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-[12px] font-medium hover:bg-blue-700 transition-colors"
            >
              Tất cả
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/explore?category=${cat.id}`}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-gray-50 text-[12px] text-gray-600 font-medium hover:bg-blue-50 hover:text-blue-600 border border-gray-100 hover:border-blue-200 transition-all duration-150"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
