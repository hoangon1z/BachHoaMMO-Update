'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Package } from 'lucide-react';

interface RelProduct {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  images: string;
  rating: number;
  sales: number;
}

interface RelatedProductsProps {
  categoryId: string;
  currentProductId: string;
}

export function RelatedProducts({ categoryId, currentProductId }: RelatedProductsProps) {
  const [products, setProducts] = useState<RelProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const res = await fetch(`/api/products?categoryId=${categoryId}&take=12`);
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.products || [])
            .filter((p: any) => p.id !== currentProductId)
            .slice(0, 10);
          setProducts(filtered);
        }
      } catch (err) {
        console.error('Failed to load related products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (categoryId) fetchRelated();
  }, [categoryId, currentProductId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-5 py-3.5 border-b border-gray-50">
          <h3 className="text-[14px] font-semibold text-gray-800">Sản phẩm liên quan</h3>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-100 rounded-xl mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-5 py-3.5 border-b border-gray-50">
        <h3 className="text-[14px] font-semibold text-gray-800">Sản phẩm liên quan</h3>
      </div>
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map((product) => {
            let images: string[] = [];
            try { images = JSON.parse(product.images); } catch { }
            const img = images[0] || '';
            const discount = product.originalPrice && product.originalPrice > product.price
              ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
              : 0;

            return (
              <Link key={product.id} href={`/products/${product.id}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50 mb-2">
                  {img ? (
                    <img
                      src={img}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-200" />
                    </div>
                  )}
                  {discount > 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                      -{discount}%
                    </span>
                  )}
                </div>
                <h4 className="text-[13px] font-medium text-gray-800 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors leading-snug">
                  {product.title}
                </h4>
                <div className="flex items-center gap-1 mb-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-[11px] text-gray-400">
                    {product.rating.toFixed(1)} | {product.sales} đã bán
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[14px] font-bold text-[#ee4d2d]">
                    {product.price.toLocaleString('vi-VN')}đ
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-[11px] text-gray-400 line-through">
                      {product.originalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
