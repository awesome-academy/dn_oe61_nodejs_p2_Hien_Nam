import { NOTIFICATION_SERVICE } from '@app/common';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaModule } from '@app/prisma';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import * as path from 'path';
import configuration from '../configuration';
import { PrismaClient } from '../generated/prisma';
import { ProductServiceController } from './product-service.controller';
import { ProductService } from './product-service.service';
import { ProductProcessor } from './product.processor';
import { ProductProducer } from './product.producer';
import { CacheModule } from '@app/common/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/product-service/.env'),
      load: [configuration],
    }),
    PrismaModule.forRoot({
      isGlobal: true,
      client: PrismaClient,
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: NOTIFICATION_SERVICE,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    BullModule.registerQueue({
      name: QueueName.PRODUCT,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(process.cwd(), 'libs/common/src/locales/'),
        watch: true,
      },
      loader: I18nJsonLoader,
      resolvers: [
        {
          use: AcceptLanguageResolver,
          options: ['x-custom-lang'],
        },
      ],
    }),
    CacheModule,
  ],
  controllers: [ProductServiceController],
  providers: [
    ProductService,
    CustomLogger,
    PaginationService,
    {
      provide: 'APP_PIPE',
      useClass: I18nRpcValidationPipe,
    },
    ProductProcessor,
    ProductProducer,
  ],
})
export class ProductServiceModule {}
