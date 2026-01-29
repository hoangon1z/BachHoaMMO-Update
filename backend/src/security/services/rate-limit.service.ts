import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SECURITY_CONSTANTS, SecurityEventType } from '../constants/security.constants';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blocked: boolean;
  blockUntil?: number;
}

interface SlidingWindowEntry {
  timestamps: number[];
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  
  // In-memory stores (use Redis in production)
  private readonly fixedWindowStore = new Map<string, RateLimitEntry>();
  private readonly slidingWindowStore = new Map<string, SlidingWindowEntry>();
  private readonly tokenBucketStore = new Map<string, { tokens: number; lastRefill: number }>();
  
  // Blocked IPs (temporary blocks)
  private readonly blockedIps = new Map<string, number>();
  
  // Suspicious activity tracking
  private readonly suspiciousActivity = new Map<string, number>();

  constructor(private configService: ConfigService) {
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Check rate limit using sliding window algorithm (more accurate)
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    let entry = this.slidingWindowStore.get(key);
    
    if (!entry) {
      entry = { timestamps: [] };
      this.slidingWindowStore.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

    const count = entry.timestamps.length;
    const remaining = Math.max(0, limit - count);
    const resetAt = entry.timestamps.length > 0 
      ? entry.timestamps[0] + windowMs 
      : now + windowMs;

    if (count >= limit) {
      this.logger.warn(`Rate limit exceeded for key: ${key}`);
      return { allowed: false, remaining: 0, resetAt };
    }

    // Add current request
    entry.timestamps.push(now);

    return { allowed: true, remaining: remaining - 1, resetAt };
  }

  /**
   * Check rate limit using token bucket algorithm (allows bursts)
   */
  async checkTokenBucket(
    key: string,
    bucketSize: number,
    refillRate: number, // tokens per second
  ): Promise<{ allowed: boolean; tokens: number }> {
    const now = Date.now();
    let bucket = this.tokenBucketStore.get(key);

    if (!bucket) {
      bucket = { tokens: bucketSize, lastRefill: now };
      this.tokenBucketStore.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    bucket.tokens = Math.min(bucketSize, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      return { allowed: false, tokens: bucket.tokens };
    }

    bucket.tokens -= 1;
    return { allowed: true, tokens: bucket.tokens };
  }

  /**
   * Check if IP is blocked
   */
  isIpBlocked(ip: string): boolean {
    const blockUntil = this.blockedIps.get(ip);
    if (!blockUntil) return false;
    
    if (Date.now() > blockUntil) {
      this.blockedIps.delete(ip);
      return false;
    }
    
    return true;
  }

  /**
   * Block IP temporarily
   */
  blockIp(ip: string, durationSeconds: number, reason: string): void {
    const blockUntil = Date.now() + (durationSeconds * 1000);
    this.blockedIps.set(ip, blockUntil);
    this.logger.warn(`Blocked IP ${ip} for ${durationSeconds}s. Reason: ${reason}`);
  }

  /**
   * Track suspicious activity
   */
  trackSuspiciousActivity(ip: string): number {
    const current = this.suspiciousActivity.get(ip) || 0;
    const newCount = current + 1;
    this.suspiciousActivity.set(ip, newCount);

    // Auto-block after 10 suspicious activities
    if (newCount >= 10) {
      this.blockIp(ip, 3600, 'Excessive suspicious activity'); // 1 hour block
      this.suspiciousActivity.delete(ip);
    }

    return newCount;
  }

  /**
   * Get rate limit key based on context
   */
  getRateLimitKey(
    ip: string,
    userId?: string,
    endpoint?: string,
  ): string {
    const parts = ['rl'];
    if (userId) parts.push(`user:${userId}`);
    else parts.push(`ip:${ip}`);
    if (endpoint) parts.push(`ep:${endpoint}`);
    return parts.join(':');
  }

  /**
   * Get rate limit config for endpoint
   */
  getRateLimitConfig(endpoint: string): { limit: number; window: number } {
    const { RATE_LIMIT } = SECURITY_CONSTANTS;

    // Auth endpoints
    if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
      return RATE_LIMIT.AUTH;
    }

    // Sensitive endpoints
    if (
      endpoint.includes('/admin') ||
      endpoint.includes('/wallet') ||
      endpoint.includes('/password')
    ) {
      return RATE_LIMIT.SENSITIVE;
    }

    // Upload endpoints
    if (endpoint.includes('/upload')) {
      return RATE_LIMIT.UPLOAD;
    }

    // Default API rate limit
    return RATE_LIMIT.API;
  }

  /**
   * Generate rate limit headers
   */
  getRateLimitHeaders(
    limit: number,
    remaining: number,
    resetAt: number,
  ): Record<string, string> {
    return {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
      'Retry-After': remaining <= 0 
        ? Math.ceil((resetAt - Date.now()) / 1000).toString() 
        : '0',
    };
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Cleanup sliding window
    for (const [key, entry] of this.slidingWindowStore.entries()) {
      entry.timestamps = entry.timestamps.filter(ts => ts > now - maxAge);
      if (entry.timestamps.length === 0) {
        this.slidingWindowStore.delete(key);
      }
    }

    // Cleanup fixed window
    for (const [key, entry] of this.fixedWindowStore.entries()) {
      if (now - entry.lastRequest > maxAge) {
        this.fixedWindowStore.delete(key);
      }
    }

    // Cleanup expired blocks
    for (const [ip, blockUntil] of this.blockedIps.entries()) {
      if (now > blockUntil) {
        this.blockedIps.delete(ip);
      }
    }

    // Decay suspicious activity
    for (const [ip, count] of this.suspiciousActivity.entries()) {
      const newCount = count - 1;
      if (newCount <= 0) {
        this.suspiciousActivity.delete(ip);
      } else {
        this.suspiciousActivity.set(ip, newCount);
      }
    }
  }

  /**
   * Get current stats
   */
  getStats(): {
    activeRateLimits: number;
    blockedIps: number;
    suspiciousIps: number;
  } {
    return {
      activeRateLimits: this.slidingWindowStore.size,
      blockedIps: this.blockedIps.size,
      suspiciousIps: this.suspiciousActivity.size,
    };
  }
}
