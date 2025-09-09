import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import configuration from '../configuration';
import { MailQueueModule } from './mail/mail-queue.module';
import { APP_PIPE } from '@nestjs/core';
import { NotificationService } from './notification-service.service';
import { NotificationServiceController } from './notification-service.controller';
import { BullModule } from '@nestjs/bull';
import { MailerModule } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from '@app/common';
import { CustomLogger } from '@app/common/logger/custom-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/notification-service/.env'),
      load: [configuration],
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
    ]),
    MailQueueModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: I18nRpcValidationPipe,
    },
    NotificationService,
    CustomLogger,
  ],
  controllers: [NotificationServiceController],
})
export class NotificationServiceModule {}
