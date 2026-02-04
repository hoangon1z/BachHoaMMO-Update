import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Chuẩn hóa product từ API: map salePrice -> originalPrice (giá gốc) để code dễ hiểu. 
 * Sản phẩm có variants: tính minPrice/maxPrice để hiển thị price range.
 */
export function normalizeProduct<T extends { salePrice?: number | null; originalPrice?: number | null; price?: number; variants?: Array<{ salePrice?: number | null; originalPrice?: number | null; price?: number }> }>(p: T): T {
  let productOriginalPrice = p.originalPrice ?? p.salePrice ?? null
  const normalized = { ...p, originalPrice: productOriginalPrice } as T & { minPrice?: number; maxPrice?: number; hasVariants?: boolean }
  
  if (normalized.variants?.length) {
    // Normalize variants
    (normalized as any).variants = normalized.variants.map((v: any) => ({
      ...v,
      originalPrice: v.originalPrice ?? v.salePrice,
    }))
    
    // Calculate price range from variants
    const variantPrices = (normalized.variants as any[])
      .map((v) => v.price)
      .filter((x): x is number => typeof x === 'number' && x > 0)
    
    if (variantPrices.length > 1) {
      normalized.minPrice = Math.min(...variantPrices)
      normalized.maxPrice = Math.max(...variantPrices)
      normalized.hasVariants = true
    }
    
    // Get original price from variants if product doesn't have one
    const variantOriginals = (normalized.variants as any[])
      .map((v) => v.originalPrice ?? v.salePrice)
      .filter((x): x is number => typeof x === 'number' && x > 0)
    
    if (variantOriginals.length > 0 && (productOriginalPrice == null || productOriginalPrice === 0)) {
      ;(normalized as any).originalPrice = Math.max(...variantOriginals)
    }
  }
  return normalized as T
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
