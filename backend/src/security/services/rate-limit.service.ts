import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { SECURITY_CONSTANTS } from '../constants/security.constants';

@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);

  // Redis client
  private redis: RedisClientType | null = null;
  private redisConnected = false;

  // Fallback in-memory stores (used when Redis unavailable)
  private readonly memoryStore = new Map<string, { count: number; resetAt: number }>();
  private readonly blockedIpsMemory = new Map<string, number>();
  private readonly suspiciousActivityMemory = new Map<string, number>();

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    await this.connectRedis();

    // Cleanup every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Connect to Redis with error handling
   */
  private async connectRedis(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    try {
      this.redis = createClient({ url: redisUrl });

      this.redis.on('error', (err) => {
        if (this.redisConnected) {
          this.logger.warn(`Redis connection lost: ${err.message}. Falling back to in-memory.`);
          this.redisConnected = false;
        }
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis for rate limiting');
        this.redisConnected = true;
      });

      await this.redis.connect();
    } catch (error: any) {
      this.logger.warn(`Failed to connect to Redis: ${error.message}. Using in-memory fallback.`);
      this.redis = null;
      this.redisConnected = false;
    }
  }

  /**
   * Check rate limit using Redis (with in-memory fallback)
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const resetAt = now + (windowSeconds * 1000);

    // Try Redis first
    if (this.redis && this.redisConnected) {
      try {
        const redisKey = `ratelimit:${key}`;
        const count = await this.redis.incr(redisKey);

        // Set expiry on first request
        if (count === 1) {
          await this.redis.expire(redisKey, windowSeconds);
        }

        const remaining = Math.max(0, limit - count);
        const ttl = await this.redis.ttl(redisKey);
        const actualResetAt = now + (ttl * 1000);

        if (count > limit) {
          this.logger.warn(`Rate limit exceeded for key: ${key} (count: ${count}/${limit})`);
          return { allowed: false, remaining: 0, resetAt: actualResetAt };
        }

        return { allowed: true, remaining, resetAt: actualResetAt };
      } catch (error: any) {
        this.logger.warn(`Redis error during rate limit check: ${error.message}`);
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    return this.checkRateLimitMemory(key, limit, windowSeconds);
  }

  /**
   * In-memory rate limit (fallback)
   */
  private checkRateLimitMemory(
    key: string,
    limit: number,
    windowSeconds: number,
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let entry = this.memoryStore.get(key);

    // Reset if window expired
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + (windowSeconds * 1000) };
      this.memoryStore.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, limit - entry.count);

    if (entry.count > limit) {
      this.logger.warn(`Rate limit exceeded for key: ${key} (in-memory)`);
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    return { allowed: true, remaining, resetAt: entry.resetAt };
  }

  /**
   * Check if IP is blocked
   */
  async isIpBlocked(ip: string): Promise<boolean> {
    // Try Redis first
    if (this.redis && this.redisConnected) {
      try {
        const blocked = await this.redis.get(`blocked:${ip}`);
        if (blocked) {
          const blockUntil = parseInt(blocked);
          if (Date.now() < blockUntil) {
            return true;
          }
          // Expired, delete
          await this.redis.del(`blocked:${ip}`);
        }
        return false;
      } catch (error) {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const blockUntil = this.blockedIpsMemory.get(ip);
    if (!blockUntil) return false;

    if (Date.now() > blockUntil) {
      this.blockedIpsMemory.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Block IP temporarily
   */
  async blockIp(ip: string, durationSeconds: number, reason: string): Promise<void> {
    const blockUntil = Date.now() + (durationSeconds * 1000);

    // Try Redis first
    if (this.redis && this.redisConnected) {
      try {
        await this.redis.set(`blocked:${ip}`, blockUntil.toString(), { EX: durationSeconds });
        this.logger.warn(`[Redis] Blocked IP ${ip} for ${durationSeconds}s. Reason: ${reason}`);
        return;
      } catch (error) {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    this.blockedIpsMemory.set(ip, blockUntil);
    this.logger.warn(`[Memory] Blocked IP ${ip} for ${durationSeconds}s. Reason: ${reason}`);
  }

  /**
   * Unblock IP manually
   */
  async unblockIp(ip: string): Promise<boolean> {
    let wasBlocked = false;

    // Try Redis
    if (this.redis && this.redisConnected) {
      try {
        const result = await this.redis.del(`blocked:${ip}`);
        await this.redis.del(`suspicious:${ip}`);
        if (result > 0) {
          wasBlocked = true;
          this.logger.log(`[Redis] Unblocked IP: ${ip}`);
        }
      } catch (error) {
        // Continue to in-memory
      }
    }

    // Also clear in-memory
    if (this.blockedIpsMemory.has(ip)) {
      this.blockedIpsMemory.delete(ip);
      this.suspiciousActivityMemory.delete(ip);
      wasBlocked = true;
      this.logger.log(`[Memory] Unblocked IP: ${ip}`);
    }

    return wasBlocked;
  }

  /**
   * Track suspicious activity
   */
  async trackSuspiciousActivity(ip: string): Promise<number> {
    let newCount = 1;

    // Try Redis
    if (this.redis && this.redisConnected) {
      try {
        const key = `suspicious:${ip}`;
        newCount = await this.redis.incr(key);

        // Set expiry to prevent memory leak (1 hour)
        if (newCount === 1) {
          await this.redis.expire(key, 3600);
        }

        // Auto-block after 10 suspicious activities
        if (newCount >= 10) {
          await this.blockIp(ip, 3600, 'Excessive suspicious activity');
          await this.redis.del(key);
        }

        return newCount;
      } catch (error) {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const current = this.suspiciousActivityMemory.get(ip) || 0;
    newCount = current + 1;
    this.suspiciousActivityMemory.set(ip, newCount);

    if (newCount >= 10) {
      await this.blockIp(ip, 3600, 'Excessive suspicious activity');
      this.suspiciousActivityMemory.delete(ip);
    }

    return newCount;
  }

  /**
   * Get rate limit key based on context
   */
  getRateLimitKey(ip: string, userId?: string, endpoint?: string): string {
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

    if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
      return RATE_LIMIT.AUTH;
    }

    if (endpoint.includes('/admin') || endpoint.includes('/wallet') || endpoint.includes('/password')) {
      return RATE_LIMIT.SENSITIVE;
    }

    if (endpoint.includes('/upload')) {
      return RATE_LIMIT.UPLOAD;
    }

    return RATE_LIMIT.API;
  }

  /**
   * Generate rate limit headers
   */
  getRateLimitHeaders(limit: number, remaining: number, resetAt: number): Record<string, string> {
    return {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
      'Retry-After': remaining <= 0 ? Math.ceil((resetAt - Date.now()) / 1000).toString() : '0',
    };
  }

  /**
   * Cleanup old in-memory entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Cleanup rate limit entries
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now > entry.resetAt) {
        this.memoryStore.delete(key);
      }
    }

    // Cleanup expired blocks
    for (const [ip, blockUntil] of this.blockedIpsMemory.entries()) {
      if (now > blockUntil) {
        this.blockedIpsMemory.delete(ip);
      }
    }

    // Decay suspicious activity
    for (const [ip, count] of this.suspiciousActivityMemory.entries()) {
      const newCount = count - 1;
      if (newCount <= 0) {
        this.suspiciousActivityMemory.delete(ip);
      } else {
        this.suspiciousActivityMemory.set(ip, newCount);
      }
    }
  }

  /**
   * Get current stats
   */
  async getStats(): Promise<{
    activeRateLimits: number;
    blockedIps: number;
    suspiciousIps: number;
    redisConnected: boolean;
  }> {
    let redisBlockedCount = 0;
    let redisSuspiciousCount = 0;
    let redisRateLimitCount = 0;

    if (this.redis && this.redisConnected) {
      try {
        const blockedKeys = await this.redis.keys('blocked:*');
        const suspiciousKeys = await this.redis.keys('suspicious:*');
        const rateLimitKeys = await this.redis.keys('ratelimit:*');
        redisBlockedCount = blockedKeys.length;
        redisSuspiciousCount = suspiciousKeys.length;
        redisRateLimitCount = rateLimitKeys.length;
      } catch (error) {
        // Ignore
      }
    }

    return {
      activeRateLimits: redisRateLimitCount + this.memoryStore.size,
      blockedIps: redisBlockedCount + this.blockedIpsMemory.size,
      suspiciousIps: redisSuspiciousCount + this.suspiciousActivityMemory.size,
      redisConnected: this.redisConnected,
    };
  }
}
