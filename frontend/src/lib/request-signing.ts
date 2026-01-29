/**
 * Request signing to prevent replay attacks and tampering
 */

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'your-super-secret-encryption-key-change-in-production-2024';

/**
 * Generate a simple hash for signing
 */
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate request signature
 * Combines: timestamp + method + url + body
 */
export function generateSignature(
  timestamp: number,
  method: string,
  url: string,
  body?: any
): string {
  const bodyString = body ? JSON.stringify(body) : '';
  const payload = `${timestamp}|${method}|${url}|${bodyString}|${SECRET_KEY}`;
  return simpleHash(payload);
}

/**
 * Verify request signature
 */
export function verifySignature(
  signature: string,
  timestamp: number,
  method: string,
  url: string,
  body?: any
): boolean {
  const expectedSignature = generateSignature(timestamp, method, url, body);
  return signature === expectedSignature;
}

/**
 * Generate request headers with timestamp and signature
 */
export function generateSecureHeaders(
  method: string,
  url: string,
  body?: any
): Record<string, string> {
  const timestamp = Date.now();
  const signature = generateSignature(timestamp, method, url, body);
  
  return {
    'x-request-timestamp': timestamp.toString(),
    'x-request-signature': signature,
  };
}
