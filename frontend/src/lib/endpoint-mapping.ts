/**
 * Obfuscated endpoint mapping
 * Maps hashed IDs to actual backend endpoints
 */

import { generateEndpointId } from './encryption';

// Endpoint definitions
const ENDPOINT_DEFS: Record<string, string> = {
  // Auth endpoints
  'auth.login': 'auth/login',
  'auth.register': 'auth/register',
  'auth.me': 'auth/me',
  'auth.2fa.verify': 'auth/2fa/verify',
  'auth.2fa.resend': 'auth/2fa/resend',
  
  // Categories endpoints
  'categories.list': 'categories',
  'categories.get': 'categories/get',
  'categories.slug': 'categories/slug',
  
  // Products endpoints
  'products.list': 'products',
  'products.get': 'products/get',
  'products.featured': 'products/featured',
  'products.latest': 'products/latest',
  'products.create': 'products/create',
  'products.update': 'products/update',
  'products.delete': 'products/delete',
  
  // Payment endpoints (PayOS)
  'payment.create': 'payos/create-payment',
  'payment.status': 'payos/status',
  'payment.check': 'payos/check-and-approve',
  'payment.config': 'payos/config-status',
  'payment.webhook': 'payos/webhook',
  
  // Wallet endpoints
  'wallet.balance': 'wallet/balance',
  'wallet.transactions': 'wallet/transactions',
  'wallet.recharge': 'wallet/recharge',
};

// Lazy initialization
let _endpointMap: Record<string, string> | null = null;
let _reverseEndpointMap: Record<string, string> | null = null;

function initializeMaps() {
  if (!_endpointMap) {
    _endpointMap = {};
    for (const [key, value] of Object.entries(ENDPOINT_DEFS)) {
      _endpointMap[key] = generateEndpointId(value);
    }
  }
  
  if (!_reverseEndpointMap) {
    _reverseEndpointMap = {};
    for (const [key, value] of Object.entries(_endpointMap)) {
      _reverseEndpointMap[value] = key;
    }
  }
}

// Get endpoint map
export function getEndpointMap(): Record<string, string> {
  initializeMaps();
  return _endpointMap!;
}

// Get reverse endpoint map
export function getReverseEndpointMap(): Record<string, string> {
  initializeMaps();
  return _reverseEndpointMap!;
}

/**
 * Get obfuscated endpoint URL
 * Note: baseURL in axios is '/api', so we only return '/v1/q/:id'
 */
export function getObfuscatedUrl(endpoint: string, params?: Record<string, any>): string {
  const endpointMap = getEndpointMap();
  const id = endpointMap[endpoint];
  if (!id) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }
  
  // Don't include '/api' prefix as it's already in axios baseURL
  let url = `/v1/q/${id}`;
  
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  return url;
}

/**
 * Get endpoint key from obfuscated ID
 */
export function getEndpointKey(id: string): string | null {
  const reverseMap = getReverseEndpointMap();
  return reverseMap[id] || null;
}
