'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  sold: number;
}

interface RelatedProductsProps {
  categoryId: string;
  currentProductId: string;
}

export function RelatedProducts({ categoryId, currentProductId }: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Mock related products
    const mockProducts: Product[] = [
      {
        id: '2',
        title: 'Spotify Premium 1 Tháng',
        price: 50000,
        originalPrice: 39000,
        image: 'https://picsum.photos/seed/spotify/300/300',
        rating: 4.7,
        sold: 523,
      },
      {
        id: '3',
        title: 'YouTube Premium 1 Tháng',
        price: 80000,
        originalPrice: 69000,
        image: 'https://picsum.photos/seed/youtube/300/300',
        rating: 4.9,
        sold: 892,
      },
      {
        id: '4',
        title: 'Disney+ Premium',
        price: 90000,
        image: 'https://picsum.photos/seed/disney/300/300',
        rating: 4.6,
        sold: 234,
      },
      {
        id: '5',
        title: 'Amazon Prime Video',
        price: 70000,
        originalPrice: 59000,
        image: 'https://picsum.photos/seed/amazon/300/300',
        rating: 4.5,
        sold: 345,
      },
      {
        id: '6',
        title: 'Apple TV+',
        price: 85000,
        image: 'https://picsum.photos/seed/apple/300/300',
        rating: 4.8,
        sold: 456,
      },
    ];

    setProducts(mockProducts);
  }, [categoryId, currentProductId]);

  if (products.length === 0) {
    return null;
  }

  const discount = (price: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  return (
    <>
      {products.map((product) => (
        <Link key={product.id} href={`/products/${product.id}`}>
          <div className="group bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all">
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              {product.originalPrice && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                  -{discount(product.price, product.originalPrice)}%
                </div>
              )}
            </div>
            <div className="p-3">
              <h4 className="text-sm font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                {product.title}
              </h4>
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">
                  {product.rating} | Đã bán {product.sold}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-red-600">
                  {product.price.toLocaleString('vi-VN')}đ
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-xs text-muted-foreground line-through">
                    {product.originalPrice.toLocaleString('vi-VN')}đ
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
