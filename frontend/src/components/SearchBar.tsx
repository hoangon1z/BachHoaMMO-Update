'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/config';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
  return url;
}

interface SearchResult {
  id: string;
  slug?: string;
  title: string;
  price: number;
  images: string;
  thumbnail?: string;
  rating: number;
  sales: number;
}

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  fullRounded?: boolean;
}

export function SearchBar({ onSearch, placeholder = "Tìm kiếm sản phẩm...", fullRounded = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const router = useRouter();

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

  // Debounced search
  const searchProducts = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await apiFetch(`/products?search=${encodeURIComponent(q.trim())}&take=6`);
      if (res.ok) {
        const data = await res.json();
        const products = data.products || data || [];
        setResults(Array.isArray(products) ? products.slice(0, 6) : []);
        setShowDropdown(true);
      }
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => searchProducts(query), 300);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchProducts]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      onSearch?.(query.trim());
    }
  };

  const handleResultClick = (product: SearchResult) => {
    setShowDropdown(false);
    setQuery('');
    router.push(`/products/${product.slug || product.id}`);
  };

  const getThumb = (product: SearchResult) => {
    try {
      const imgs = JSON.parse(product.images || '[]');
      return getImageUrl(imgs[0] || product.thumbnail || '');
    } catch {
      return getImageUrl(product.thumbnail || '');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className={`
          flex items-center h-10 bg-gray-50 border overflow-hidden transition-all duration-200
          rounded-lg
          ${isFocused ? 'border-blue-400 bg-white shadow-[0_0_0_3px_rgba(59,130,246,0.1)]' : 'border-gray-200 hover:border-gray-300'}
        `}>
          {/* Search icon */}
          <div className="pl-3 flex items-center">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <Search className={`w-4 h-4 transition-colors ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
            )}
          </div>

          {/* Input */}
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { setIsFocused(true); if (results.length > 0) setShowDropdown(true); }}
            onBlur={() => setIsFocused(false)}
            className="flex-1 h-full px-2.5 text-[13px] bg-transparent border-0 outline-none placeholder:text-gray-400 text-gray-700"
            autoComplete="off"
          />

          {/* Clear */}
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }}
              className="p-1.5 mr-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}

          {/* Search button */}
          <button
            type="submit"
            className="h-full px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors flex items-center"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* ── Suggestions Dropdown ── */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {results.length > 0 ? (
            <>
              <div className="max-h-[360px] overflow-y-auto">
                {results.map((product) => {
                  const thumb = getThumb(product);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleResultClick(product)}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">N/A</div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-gray-700 truncate">{product.title}</p>
                        <p className="text-[12px] font-semibold text-[#ee4d2d]">{formatPrice(product.price)}</p>
                      </div>
                      {/* Sales */}
                      <span className="text-[11px] text-gray-400 flex-shrink-0">
                        Đã bán {product.sales}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* View all results */}
              <button
                type="button"
                className="w-full px-3 py-2.5 bg-gray-50 text-[13px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium transition-colors flex items-center justify-center gap-1 border-t border-gray-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setShowDropdown(false); onSearch?.(query.trim()); }}
              >
                Xem tất cả kết quả cho &ldquo;{query}&rdquo;
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : !isSearching ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Không tìm thấy sản phẩm cho &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
