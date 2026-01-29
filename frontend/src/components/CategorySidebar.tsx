'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/config';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function CategorySidebar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiFetch('/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <div className="w-64 p-4">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 w-20 bg-secondary rounded-full animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="w-64 bg-white border border-border p-4">
      <h3 className="font-semibold text-sm text-foreground mb-3">DANH MỤC</h3>
      <div className="flex flex-wrap gap-2">
        <Link 
          href="/explore" 
          className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors"
        >
          Tất cả
        </Link>
        {categories.map((category) => (
          <Link 
            key={category.id} 
            href={`/explore?category=${category.id}`} 
            className="px-3 py-1.5 text-sm text-foreground border border-border rounded-full hover:border-primary hover:text-primary transition-colors"
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
