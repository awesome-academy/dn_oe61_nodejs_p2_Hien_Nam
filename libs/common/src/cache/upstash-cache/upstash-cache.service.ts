import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BaseCacheService } from '../base-cache.service';

@Injectable()
export class UpstashCacheService extends BaseCacheService implements OnModuleDestroy {
  protected readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super(UpstashCacheService.name);

    const redisUrl = this.configService.get<string>('UPSTASH_REDIS_URL');
    if (!redisUrl) {
      throw new Error('UPSTASH_REDIS_URL environment variable is required');
    }

    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
    });

    this.redis.on('connect', () => this.logger.log('Upstash Redis connected'));
    this.redis.on('error', (err) => this.logger.error('Upstash Redis error:', err));
    this.redis.on('close', () => this.logger.warn('Upstash Redis closed'));
  }

  async onModuleDestroy() {
    await this.closeRedisConnection();
  }
}
