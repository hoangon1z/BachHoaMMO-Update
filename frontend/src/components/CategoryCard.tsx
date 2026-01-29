'use client';

import { ChevronRight, Package, FolderOpen } from 'lucide-react';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    _count?: {
      products: number;
    };
  };
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <div className="group cursor-pointer bg-white border border-gray-200 hover:bg-gray-50 transition-colors p-6 flex items-center gap-4 rounded-lg">
      <div className="w-12 h-12 bg-blue-50 flex items-center justify-center flex-shrink-0 rounded-lg">
        <FolderOpen className="w-6 h-6 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
          {category.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {category._count?.products || 0} sản phẩm
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </div>
  );
}
