/**
 * Image URL validation utilities
 */

// Supported image extensions
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];

/**
 * Check if URL has valid image extension
 */
export function hasImageExtension(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    // Remove query params and hash
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    const extension = cleanUrl.split('.').pop();
    
    return extension ? IMAGE_EXTENSIONS.includes(extension) : false;
  } catch {
    return false;
  }
}

/**
 * Check if URL is valid format
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate image URL (check format and try to load)
 * Returns a promise that resolves with validation result
 */
export async function validateImageUrl(url: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check if empty (allow empty for optional images)
  if (!url || url.trim() === '') {
    return { valid: true };
  }

  // Check if valid URL format
  if (!isValidUrl(url)) {
    return {
      valid: false,
      error: 'URL không hợp lệ. Vui lòng nhập URL đúng định dạng (http:// hoặc https://)',
    };
  }

  // Check if has image extension
  if (!hasImageExtension(url)) {
    return {
      valid: false,
      error: `URL phải có định dạng hình ảnh (${IMAGE_EXTENSIONS.join(', ')})`,
    };
  }

  // Try to load the image to verify it exists and is accessible
  return new Promise((resolve) => {
    const img = new window.Image();
    const timeout = setTimeout(() => {
      resolve({
        valid: false,
        error: 'Không thể tải hình ảnh. Vui lòng kiểm tra URL hoặc quyền truy cập',
      });
    }, 5000); // 5 second timeout

    img.onload = () => {
      clearTimeout(timeout);
      resolve({ valid: true });
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve({
        valid: false,
        error: 'Không thể tải hình ảnh. URL có thể không tồn tại hoặc không truy cập được',
      });
    };

    img.src = url;
  });
}

/**
 * Validate all image URLs in an array
 */
export async function validateImageUrls(urls: string[]): Promise<{
  valid: boolean;
  errors: { index: number; error: string }[];
}> {
  const validationResults = await Promise.all(
    urls.map((url, index) => 
      validateImageUrl(url).then(result => ({ ...result, index }))
    )
  );

  const errors = validationResults
    .filter(result => !result.valid && result.error)
    .map(result => ({ index: result.index, error: result.error! }));

  return {
    valid: errors.length === 0,
    errors,
  };
}
