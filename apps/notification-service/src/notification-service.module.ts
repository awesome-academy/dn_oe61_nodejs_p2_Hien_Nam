import { PRODUCT_SERVICE, USER_SERVICE } from '@app/common';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import * as path from 'path';
import configuration from '../configuration';
import { ChatworkModule } from './chatwork/chatwork.module';
import { MailQueueModule } from './mail/mail-queue.module';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationService } from './notification-service.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task/task.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/notification-service/.env'),
      load: [configuration],
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('mail.host'),
          port: configService.get<number>('mail.port'),
          secure: false,
          auth: {
            user: configService.get<string>('mail.user'),
            pass: configService.get<string>('mail.pass'),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get('mail.from')}>`,
        },
        template: {
          dir: path.resolve(process.cwd(), 'libs/common/src/templates'),
          adapter: new PugAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: PRODUCT_SERVICE,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: USER_SERVICE,
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
    ChatworkModule,
    MailQueueModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: I18nRpcValidationPipe,
    },
    NotificationService,
    CustomLogger,
    TaskService,
  ],
  controllers: [NotificationServiceController],
})
export class NotificationServiceModule {}
