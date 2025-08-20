import { PrismaModule } from '@app/prisma';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import * as path from 'path';
import configuration from '../configuration';
import { PrismaClient } from '../generated/prisma';
import { UserServiceController } from './user-service.controller';
import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { APP_PIPE } from '@nestjs/core';
import { UserService } from './user-service.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/user-service/.env'),
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
  controllers: [UserServiceController],
  providers: [
    UserService,
    {
      provide: APP_PIPE,
      useClass: I18nRpcValidationPipe,
    },
    CustomLogger,
  ],
  exports: [],
})
export class UserServiceModule {}
