import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BaseCacheService } from './base-cache.service';

@Injectable()
export class CacheService extends BaseCacheService implements OnModuleDestroy {
  protected readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super(CacheService.name);

    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT'),
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 10000,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleDestroy() {
    await this.closeRedisConnection();
  }
}
