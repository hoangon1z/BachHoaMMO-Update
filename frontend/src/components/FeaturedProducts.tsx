'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { ProductCard } from './ProductCard';
import { ArrowRight } from 'lucide-react';

interface FeaturedProductsProps {
  products: any[];
  title: string;
}

export function FeaturedProducts({ products, title }: FeaturedProductsProps) {
  return (
    <div className="bg-white border border-gray-200 p-4 sm:p-6 rounded-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold uppercase">{title}</h2>
        <Link href="/explore">
          <Button variant="outline" className="border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-0 text-xs sm:text-sm w-full sm:w-auto">
            Khám phá
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
