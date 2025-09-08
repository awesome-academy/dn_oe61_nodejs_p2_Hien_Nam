import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';
import { UpstashCacheService } from './upstash-cache/upstash-cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService, UpstashCacheService],
  exports: [CacheService, UpstashCacheService],
})
export class CacheModule {}
