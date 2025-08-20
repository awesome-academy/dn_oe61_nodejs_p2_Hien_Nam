import { USER_SERVICE } from '@app/common/constant/service.constant';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import * as path from 'path';
import configuration from '../configuration';
import { AuthServiceController } from './auth-service.controller';
import { AuthService } from './auth-service.service';
import { APP_FILTER } from '@nestjs/core';
import { RpcExceptionsFilter } from '@app/common/filters/rpc-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/auth-service/.env'),
      load: [configuration],
    }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secretKey'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
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
  controllers: [AuthServiceController],
  providers: [
    AuthService,
    CustomLogger,
    {
      provide: APP_FILTER,
      useClass: RpcExceptionsFilter,
    },
  ],
})
export class AuthServiceModule {}
