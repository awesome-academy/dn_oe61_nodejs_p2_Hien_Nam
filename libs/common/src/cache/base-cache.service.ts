import { Logger } from '@nestjs/common';
import { DEFAULT_CACHE_TTL_1H, MAX_DATA_BYTES } from '../constant/cache.constant';
import { CacheOptions } from './cache.interface';
import Redis from 'ioredis';

export abstract class BaseCacheService {
  protected readonly logger: Logger;
  protected abstract redis: Redis;

  constructor(loggerName: string) {
    this.logger = new Logger(loggerName);
  }

  generateKey(
    prefix: string,
    options?: Record<string, undefined | string | number | boolean>,
  ): string {
    if (!prefix) {
      this.logger.warn('Prefix for cache key is empty!');
    }

    const keyParts = [prefix];

    if (options && Object.keys(options).length > 0) {
      Object.entries(options)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, value]) => {
          keyParts.push(`${key}:${value}`);
        });
    }
    return keyParts.join(':');
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);

      if (cached) {
        this.logger.debug(`Cache get for key: ${key}`);
        try {
          return JSON.parse(cached) as T;
        } catch (parseError) {
          this.logger.error(`JSON parse get<> error for key ${key}:`, parseError);
          await this.delete(key);
          return null;
        }
      }

      this.logger.debug(`Cache get miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, data: T, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheTTLInSeconds = options?.ttl || DEFAULT_CACHE_TTL_1H;

      if (!key) {
        throw new Error('Cache key must not be empty');
      }

      if (data === undefined || data === null) {
        this.logger.warn(`Attempting to cache empty value for key: ${key}`);
      }

      const serializedData = JSON.stringify(data);

      if (serializedData.length > MAX_DATA_BYTES) {
        this.logger.warn(`Large cache entry for key ${key}: ${serializedData.length} bytes`);
      }

      await this.redis.setex(key, cacheTTLInSeconds, serializedData);
      this.logger.debug(`Cached Set data for key: ${key} with TTL: ${cacheTTLInSeconds}s`);
      return true;
    } catch (error) {
      this.logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  async getOrSet<T>(key: string, callback: () => Promise<T>, options?: CacheOptions): Promise<T> {
    if (!key) {
      throw new Error('Cache key must not be empty');
    }

    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    try {
      const data = await callback();
      const success = await this.set(key, data, options);

      if (!success) {
        this.logger.warn(`Failed to cache data for key: ${key}`);
      }

      return data;
    } catch (error) {
      this.logger.error(`Callback error for key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      const deleted = result > 0;
      this.logger.debug(`Deleted cache key: ${key} (${deleted ? 'success' : 'not found'})`);
      return deleted;
    } catch (error) {
      this.logger.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    try {
      let deletedCount = 0;
      const pipeline = this.redis.pipeline();
      let cursor = '0';

      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          keys.forEach((key) => pipeline.del(key));
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        await pipeline.exec();
        this.logger.debug(`Deleted ${deletedCount} cache keys matching pattern: ${pattern}`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error(`Redis pattern delete error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  protected async closeRedisConnection(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing Redis connection:', error);
    }
  }
}
