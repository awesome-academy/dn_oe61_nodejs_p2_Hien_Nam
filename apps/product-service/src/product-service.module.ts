import { Logger, Module } from '@nestjs/common';
import { ProductServiceController } from './product-service.controller';
import { ProductService } from './product-service.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/prisma';
import * as path from 'path';
import configuration from '../configuration';
import { PrismaClient } from '../generated/prisma';
import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { PaginationService } from '@app/common/shared/pagination.shared';

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
  ],
  controllers: [ProductServiceController],
  providers: [
    ProductService,
    Logger,
    PaginationService,
    {
      provide: 'APP_PIPE',
      useClass: I18nRpcValidationPipe,
    },
  ],
})
export class ProductServiceModule {}
