import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisConfig = this.configService.get('redis');
    this.redis = new Redis(redisConfig);

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
    }
  }

  // Permission-specific cache methods
  async cacheUserPermissions(tenantId: string, userId: string, permissions: any[], ttl?: number): Promise<void> {
    const key = this.getUserPermissionsKey(tenantId, userId);
    await this.set(key, permissions, ttl || this.configService.get('redis.ttl'));
  }

  async getUserPermissions(tenantId: string, userId: string): Promise<any[] | null> {
    const key = this.getUserPermissionsKey(tenantId, userId);
    return this.get<any[]>(key);
  }

  async invalidateUserPermissions(tenantId: string, userId: string): Promise<void> {
    const key = this.getUserPermissionsKey(tenantId, userId);
    await this.del(key);
  }

  async invalidateUserPermissionsPattern(tenantId: string, userId?: string): Promise<void> {
    const pattern = userId 
      ? this.getUserPermissionsKey(tenantId, userId)
      : `${this.configService.get('redis.keyPrefix')}permissions:${tenantId}:*`;
    await this.delPattern(pattern);
  }

  // Profile-specific cache methods
  async cacheUserProfile(tenantId: string, userId: string, profile: any, ttl?: number): Promise<void> {
    const key = this.getUserProfileKey(tenantId, userId);
    await this.set(key, profile, ttl || this.configService.get('redis.ttl'));
  }

  async getUserProfile(tenantId: string, userId: string): Promise<any | null> {
    const key = this.getUserProfileKey(tenantId, userId);
    return this.get<any>(key);
  }

  async invalidateUserProfile(tenantId: string, userId: string): Promise<void> {
    const key = this.getUserProfileKey(tenantId, userId);
    await this.del(key);
  }

  // Membership-specific cache methods
  async cacheUserMemberships(tenantId: string, userId: string, memberships: any[], ttl?: number): Promise<void> {
    const key = this.getUserMembershipsKey(tenantId, userId);
    await this.set(key, memberships, ttl || this.configService.get('redis.ttl'));
  }

  async getUserMemberships(tenantId: string, userId: string): Promise<any[] | null> {
    const key = this.getUserMembershipsKey(tenantId, userId);
    return this.get<any[]>(key);
  }

  async invalidateUserMemberships(tenantId: string, userId: string): Promise<void> {
    const key = this.getUserMembershipsKey(tenantId, userId);
    await this.del(key);
  }

  // Role-specific cache methods
  async cacheUserRoles(tenantId: string, userId: string, roles: any[], ttl?: number): Promise<void> {
    const key = this.getUserRolesKey(tenantId, userId);
    await this.set(key, roles, ttl || this.configService.get('redis.ttl'));
  }

  async getUserRoles(tenantId: string, userId: string): Promise<any[] | null> {
    const key = this.getUserRolesKey(tenantId, userId);
    return this.get<any[]>(key);
  }

  async invalidateUserRoles(tenantId: string, userId: string): Promise<void> {
    const key = this.getUserRolesKey(tenantId, userId);
    await this.del(key);
  }

  // Key generation methods
  private getUserPermissionsKey(tenantId: string, userId: string): string {
    return `${this.configService.get('redis.keyPrefix')}permissions:${tenantId}:${userId}`;
  }

  private getUserProfileKey(tenantId: string, userId: string): string {
    return `${this.configService.get('redis.keyPrefix')}profile:${tenantId}:${userId}`;
  }

  private getUserMembershipsKey(tenantId: string, userId: string): string {
    return `${this.configService.get('redis.keyPrefix')}memberships:${tenantId}:${userId}`;
  }

  private getUserRolesKey(tenantId: string, userId: string): string {
    return `${this.configService.get('redis.keyPrefix')}roles:${tenantId}:${userId}`;
  }

  async onModuleDestroy() {
    await this.redis.disconnect();
  }
}