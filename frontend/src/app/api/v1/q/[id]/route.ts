import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { encryptData, decryptData } from '@/lib/encryption';
import { getEndpointKey } from '@/lib/endpoint-mapping';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Unified API handler with encryption
 * All requests go through /api/v1/q/:id
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleRequest(request, id, 'GET');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleRequest(request, id, 'POST');
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleRequest(request, id, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleRequest(request, id, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  id: string,
  method: string
) {
  try {
    // Security: Add timestamp validation to prevent old request replay
    const timestamp = request.headers.get('x-request-timestamp');
    const now = Date.now();
    
    if (timestamp) {
      const requestTime = parseInt(timestamp);
      const timeDiff = Math.abs(now - requestTime);
      
      // Reject requests older than 10 minutes (increased from 5 for clock skew tolerance)
      if (timeDiff > 10 * 60 * 1000) {
        console.warn('[API] Request timestamp expired:', { timestamp, now, timeDiff });
        return NextResponse.json(
          { data: encryptData({ message: 'Request expired' }), encrypted: true },
          { status: 401 }
        );
      }
    }

    // Get endpoint key from obfuscated ID
    const endpointKey = getEndpointKey(id);
    
    if (!endpointKey) {
      console.error(`[Security] Invalid endpoint ID: ${id}`);
      return NextResponse.json(
        { data: encryptData({ message: 'Invalid endpoint' }) },
        { status: 404 }
      );
    }

    // Parse the endpoint key to get actual backend route
    const backendRoute = getBackendRoute(endpointKey, request);
    
    if (!backendRoute) {
      console.error(`[Security] Endpoint not found for key: ${endpointKey}`);
      return NextResponse.json(
        { data: encryptData({ message: 'Endpoint not found' }) },
        { status: 404 }
      );
    }
    
    // Log request for monitoring
    console.log(`[API] ${method} ${endpointKey} -> ${backendRoute}`);

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    // Prepare headers
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Get request body if exists
    let body = null;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        const rawBody = await request.json();
        // Decrypt body if it's encrypted
        if (rawBody.encrypted && rawBody.data) {
          body = decryptData(rawBody.data);
          console.log(`[API] Decrypted body for ${endpointKey}:`, JSON.stringify(body).substring(0, 100));
        } else {
          body = rawBody;
        }
      } catch (e) {
        console.error('[API] Failed to parse request body:', e);
      }
    }

    // Make request to backend
    const axiosConfig: any = {
      method: method,
      url: `${BACKEND_URL}${backendRoute}`,
      headers: headers,
    };
    
    // Only add data if it exists (not for GET/DELETE)
    if (body) {
      axiosConfig.data = body;
    }
    
    const response = await axios(axiosConfig);

    // Encrypt response data
    const encryptedResponse = {
      data: encryptData(response.data),
      encrypted: true,
      timestamp: Date.now(), // Add timestamp to response
    };

    // Add security headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return NextResponse.json(encryptedResponse, { headers: responseHeaders });
    
  } catch (error: any) {
    // Enhanced error logging
    console.error('[API Error]', {
      message: error.message,
      endpoint: id,
      method: method,
      status: error.response?.status,
      url: error.config?.url,
    });
    
    const errorData = {
      message: error.response?.data?.message || 'Request failed',
      statusCode: error.response?.status || 500,
      timestamp: Date.now(),
    };
    
    // Add security headers to error response
    const responseHeaders = new Headers();
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    
    return NextResponse.json(
      { data: encryptData(errorData), encrypted: true },
      { status: error.response?.status || 500, headers: responseHeaders }
    );
  }
}

/**
 * Map endpoint key to backend route
 */
function getBackendRoute(endpointKey: string, request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  
  const routes: Record<string, string> = {
    // Auth
    'auth.login': '/auth/login',
    'auth.register': '/auth/register',
    'auth.me': '/auth/me',
    'auth.2fa.verify': '/auth/2fa/verify',
    'auth.2fa.resend': '/auth/2fa/resend',
    
    // Categories
    'categories.list': '/categories',
    'categories.get': `/categories/${searchParams.get('id') || ''}`,
    'categories.slug': `/categories/slug/${searchParams.get('slug') || ''}`,
    
    // Products
    'products.list': `/products${buildQueryString(searchParams)}`,
    'products.get': `/products/${searchParams.get('id') || ''}`,
    'products.featured': '/products/featured',
    'products.latest': '/products/latest',
    'products.create': '/products',
    'products.update': `/products/${searchParams.get('id') || ''}`,
    'products.delete': `/products/${searchParams.get('id') || ''}`,
    
    // Payment (PayOS)
    'payment.create': '/payos/create-payment',
    'payment.status': `/payos/status/${searchParams.get('orderCode') || ''}`,
    'payment.check': `/payos/check-and-approve/${searchParams.get('orderCode') || ''}`,
    'payment.config': '/payos/config-status',
    'payment.webhook': '/payos/webhook',
    
    // Wallet
    'wallet.balance': `/wallet/balance/${searchParams.get('userId') || ''}`,
    'wallet.transactions': `/wallet/transactions/${searchParams.get('userId') || ''}`,
    'wallet.recharge': '/wallet/recharge',
  };
  
  return routes[endpointKey] || null;
}

/**
 * Build query string from search params
 */
function buildQueryString(searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  
  // Filter out internal params
  const internalParams = ['id', 'slug'];
  
  searchParams.forEach((value, key) => {
    if (!internalParams.includes(key)) {
      params.append(key, value);
    }
  });
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}
