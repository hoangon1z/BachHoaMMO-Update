import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Chuẩn hóa product từ API: map salePrice -> originalPrice (giá gốc) để code dễ hiểu. Sản phẩm có variants: lấy giá gốc từ variants nếu product chưa có. */
export function normalizeProduct<T extends { salePrice?: number | null; originalPrice?: number | null; price?: number; variants?: Array<{ salePrice?: number | null; originalPrice?: number | null; price?: number }> }>(p: T): T {
  let productOriginalPrice = p.originalPrice ?? p.salePrice ?? null
  const normalized = { ...p, originalPrice: productOriginalPrice } as T
  if (normalized.variants?.length) {
    (normalized as any).variants = normalized.variants.map((v: any) => ({
      ...v,
      originalPrice: v.originalPrice ?? v.salePrice,
    }))
    const variantOriginals = (normalized.variants as any[]).map((v) => v.originalPrice ?? v.salePrice).filter((x): x is number => typeof x === 'number' && x > 0)
    if (variantOriginals.length > 0 && (productOriginalPrice == null || productOriginalPrice === 0)) {
      ;(normalized as any).originalPrice = Math.max(...variantOriginals)
    }
  }
  return normalized
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
