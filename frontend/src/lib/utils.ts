import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Chuẩn hóa product từ API: map salePrice -> originalPrice (giá gốc) để code dễ hiểu */
export function normalizeProduct<T extends { salePrice?: number | null; originalPrice?: number | null; variants?: Array<{ salePrice?: number | null; originalPrice?: number | null }> }>(p: T): T {
  const normalized = { ...p, originalPrice: p.originalPrice ?? p.salePrice } as T
  if (normalized.variants?.length) {
    (normalized as any).variants = normalized.variants.map((v: any) => ({
      ...v,
      originalPrice: v.originalPrice ?? v.salePrice,
    }))
  }
  return normalized
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
