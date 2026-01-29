'use client';

import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface SmartCategoriesProps {
  categories: Category[];
}

/**
 * SmartCategories - Receives data from server via props
 * NO client-side API calls!
 */
export function SmartCategories({ categories }: SmartCategoriesProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link 
        href="/explore" 
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors"
      >
        Tất cả
      </Link>
      {categories.map((category) => (
        <Link 
          key={category.id} 
          href={`/explore?category=${category.id}`} 
          className="px-4 py-2 text-sm text-foreground border border-border rounded-full hover:border-primary hover:text-primary transition-colors"
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
