import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in-memory, for production use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number; blocked: boolean }>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetAt + 60000) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith('/api/v1/q/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Get or create rate limit entry
    let limitEntry = rateLimitStore.get(ip);
    
    if (!limitEntry || now > limitEntry.resetAt) {
      // Reset counter
      limitEntry = {
        count: 0,
        resetAt: now + 60000, // 1 minute window
        blocked: false,
      };
      rateLimitStore.set(ip, limitEntry);
    }
    
    // Check if IP is blocked
    if (limitEntry.blocked) {
      console.warn(`[Security] Blocked request from IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Increment counter
    limitEntry.count++;
    
    // Check limits (increased for development)
    const MAX_REQUESTS_PER_MINUTE = 300; // Increased from 60 to 300
    const BLOCK_THRESHOLD = 500; // Block if exceeds this (increased from 100)
    
    if (limitEntry.count > BLOCK_THRESHOLD) {
      // Block for 5 minutes
      limitEntry.blocked = true;
      limitEntry.resetAt = now + 5 * 60000;
      console.error(`[Security] IP blocked for excessive requests: ${ip}`);
      
      return NextResponse.json(
        { error: 'Too many requests. Blocked for 5 minutes.' },
        { status: 429 }
      );
    }
    
    if (limitEntry.count > MAX_REQUESTS_PER_MINUTE) {
      console.warn(`[Security] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429 }
      );
    }
    
    // Add rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_MINUTE.toString());
    response.headers.set('X-RateLimit-Remaining', (MAX_REQUESTS_PER_MINUTE - limitEntry.count).toString());
    response.headers.set('X-RateLimit-Reset', limitEntry.resetAt.toString());
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/v1/q/:path*',
};
