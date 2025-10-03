import { Injectable, Logger } from '@nestjs/common';
// Lazy import type for redis client
type RedisClientType = any;

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
  keyPrefix?: string; // Prefix for Redis keys
}

export interface RateLimitInfo {
  totalRequests: number;
  remainingRequests: number;
  resetTime: Date;
  isRateLimited: boolean;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly redisClient: RedisClientType | null = null;
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyPrefix: 'rate_limit',
  };

  constructor() {
    // Initialize Redis client if REDIS_URL is provided
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const redis = require('redis');
        this.redisClient = redis.createClient({ url: redisUrl });
        this.redisClient.connect().catch((error: unknown) => {
          this.logger.error('Failed to connect to Redis for rate limiting', error as Error);
        });
      } catch (error) {
        this.logger.error('Failed to create Redis client for rate limiting', error as Error);
      }
    } else {
      this.logger.warn(
        'REDIS_URL not provided. Rate limiting will use in-memory storage (not suitable for production)',
      );
    }
  }

  /**
   * Check if a request is within rate limits
   * @param key Unique identifier for the rate limit (e.g., IP address, user ID, client ID)
   * @param config Rate limit configuration
   * @returns Rate limit information
   */
  async checkRateLimit(key: string, config?: RateLimitConfig): Promise<RateLimitInfo> {
    const effectiveConfig = { ...this.defaultConfig, ...config };
    const redisKey = `${effectiveConfig.keyPrefix}:${key}`;

    try {
      if (this.redisClient) {
        return await this.checkRateLimitWithRedis(redisKey, effectiveConfig);
      } else {
        return await this.checkRateLimitInMemory(redisKey, effectiveConfig);
      }
    } catch (error) {
      this.logger.error(`Error checking rate limit for key ${key}`, error);
      // Fail open - allow the request if there's an error
      return {
        totalRequests: 0,
        remainingRequests: effectiveConfig.maxRequests,
        resetTime: new Date(Date.now() + effectiveConfig.windowMs),
        isRateLimited: false,
      };
    }
  }

  /**
   * Reset rate limit counters for a key
   * @param key Unique identifier for the rate limit
   * @param config Rate limit configuration
   */
  async resetRateLimit(key: string, config?: RateLimitConfig): Promise<void> {
    const effectiveConfig = { ...this.defaultConfig, ...config };
    const redisKey = `${effectiveConfig.keyPrefix}:${key}`;

    try {
      if (this.redisClient) {
        await this.redisClient.del(redisKey);
      } else {
        this.inMemoryStore.delete(redisKey);
      }
    } catch (error) {
      this.logger.error(`Error resetting rate limit for key ${key}`, error);
    }
  }

  private async checkRateLimitWithRedis(
    redisKey: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    // Use Redis transactions for atomic increment and expiration
    const multi = this.redisClient.multi();
    multi.incr(redisKey);
    multi.pttl(redisKey); // Get remaining time to live in milliseconds
    const results = await multi.exec();

    const currentCount = parseInt((results[0] as any)[1] as string, 10);
    let ttl = parseInt((results[1] as any)[1] as string, 10);

    // If this is the first request or the key has expired, set the expiration
    if (ttl === -1) {
      await this.redisClient.pexpire(redisKey, config.windowMs);
      ttl = config.windowMs;
    }

    const remainingRequests = Math.max(0, config.maxRequests - currentCount);
    const isRateLimited = currentCount > config.maxRequests;

    return {
      totalRequests: currentCount,
      remainingRequests,
      resetTime: new Date(Date.now() + ttl),
      isRateLimited,
    };
  }

  // In-memory store for development/testing environments
  private inMemoryStore = new Map<
    string,
    { count: number; resetTime: number; windowMs: number }
  >();

  private async checkRateLimitInMemory(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const storeEntry = this.inMemoryStore.get(key);

    // Check if we need to reset the counter
    if (!storeEntry || storeEntry.resetTime <= now) {
      // Initialize/reset the counter
      this.inMemoryStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        windowMs: config.windowMs,
      });

      return {
        totalRequests: 1,
        remainingRequests: config.maxRequests - 1,
        resetTime: new Date(now + config.windowMs),
        isRateLimited: false,
      };
    }

    // Increment the counter
    const currentCount = storeEntry.count + 1;
    this.inMemoryStore.set(key, {
      ...storeEntry,
      count: currentCount,
    });

    const remainingRequests = Math.max(0, config.maxRequests - currentCount);
    const isRateLimited = currentCount > config.maxRequests;

    return {
      totalRequests: currentCount,
      remainingRequests,
      resetTime: new Date(storeEntry.resetTime),
      isRateLimited,
    };
  }

  /**
   * Get rate limit information without incrementing the counter
   * @param key Unique identifier for the rate limit
   * @param config Rate limit configuration
   * @returns Rate limit information
   */
  async getRateLimitInfo(key: string, config?: RateLimitConfig): Promise<RateLimitInfo> {
    const effectiveConfig = { ...this.defaultConfig, ...config };
    const redisKey = `${effectiveConfig.keyPrefix}:${key}`;

    try {
      if (this.redisClient) {
        return await this.getRateLimitInfoWithRedis(redisKey, effectiveConfig);
      } else {
        return await this.getRateLimitInfoInMemory(redisKey, effectiveConfig);
      }
    } catch (error) {
      this.logger.error(`Error getting rate limit info for key ${key}`, error);
      // Return default info if there's an error
      return {
        totalRequests: 0,
        remainingRequests: effectiveConfig.maxRequests,
        resetTime: new Date(Date.now() + effectiveConfig.windowMs),
        isRateLimited: false,
      };
    }
  }

  private async getRateLimitInfoWithRedis(
    redisKey: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    const currentCountStr = await this.redisClient.get(redisKey);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
    const ttl = await this.redisClient.pttl(redisKey);

    // If key doesn't exist or has expired
    if (ttl === -1 || ttl === -2) {
      return {
        totalRequests: 0,
        remainingRequests: config.maxRequests,
        resetTime: new Date(Date.now() + config.windowMs),
        isRateLimited: false,
      };
    }

    const remainingRequests = Math.max(0, config.maxRequests - currentCount);
    const isRateLimited = currentCount >= config.maxRequests;

    return {
      totalRequests: currentCount,
      remainingRequests,
      resetTime: new Date(Date.now() + ttl),
      isRateLimited,
    };
  }

  private async getRateLimitInfoInMemory(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const storeEntry = this.inMemoryStore.get(key);

    // If entry doesn't exist or has expired
    if (!storeEntry || storeEntry.resetTime <= now) {
      return {
        totalRequests: 0,
        remainingRequests: config.maxRequests,
        resetTime: new Date(now + config.windowMs),
        isRateLimited: false,
      };
    }

    const currentCount = storeEntry.count;
    const remainingRequests = Math.max(0, config.maxRequests - currentCount);
    const isRateLimited = currentCount >= config.maxRequests;

    return {
      totalRequests: currentCount,
      remainingRequests,
      resetTime: new Date(storeEntry.resetTime),
      isRateLimited,
    };
  }
}
