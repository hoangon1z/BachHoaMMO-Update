/**
 * Slug utility for generating SEO-friendly URLs
 * Supports Vietnamese text with proper diacritics removal
 */

// Vietnamese character mapping
const vietnameseMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
    'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
    'Đ': 'D',
};

/**
 * Remove Vietnamese diacritics from a string
 */
export function removeVietnameseDiacritics(str: string): string {
    return str
        .split('')
        .map((char) => vietnameseMap[char] || char)
        .join('');
}

/**
 * Generate a URL-friendly slug from text
 * @param text - Input text (supports Vietnamese)
 * @param maxLength - Maximum slug length (default: 80)
 * @returns SEO-friendly slug
 * 
 * @example
 * generateSlug('Tài khoản Netflix Premium 1 tháng') 
 * // => 'tai-khoan-netflix-premium-1-thang'
 * 
 * generateSlug('Mua key Windows 10 Pro - Giá rẻ nhất!')
 * // => 'mua-key-windows-10-pro-gia-re-nhat'
 */
export function generateSlug(text: string, maxLength: number = 80): string {
    if (!text) return '';

    let slug = text
        .toLowerCase()
        .trim();

    // Remove Vietnamese diacritics
    slug = removeVietnameseDiacritics(slug);

    // Replace special characters and spaces with hyphens
    slug = slug
        .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-')           // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens

    // Truncate to maxLength, ensuring we don't cut in the middle of a word
    if (slug.length > maxLength) {
        slug = slug.substring(0, maxLength);
        const lastHyphen = slug.lastIndexOf('-');
        if (lastHyphen > maxLength - 15) {
            slug = slug.substring(0, lastHyphen);
        }
    }

    return slug;
}

/**
 * Generate a unique slug by appending a suffix if needed
 * @param baseSlug - The base slug
 * @param checkExists - Async function to check if slug exists
 * @returns Unique slug
 */
export async function generateUniqueSlug(
    baseSlug: string,
    checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await checkExists(slug)) {
        // Add random suffix for uniqueness
        const suffix = counter < 5 ? counter : Math.random().toString(36).substring(2, 6);
        slug = `${baseSlug}-${suffix}`;
        counter++;
    }

    return slug;
}

/**
 * Generate slug from text and ensure uniqueness
 * Convenience function combining generateSlug and generateUniqueSlug
 */
export async function createUniqueSlug(
    text: string,
    checkExists: (slug: string) => Promise<boolean>,
    maxLength: number = 80,
): Promise<string> {
    const baseSlug = generateSlug(text, maxLength);
    return generateUniqueSlug(baseSlug, checkExists);
}
