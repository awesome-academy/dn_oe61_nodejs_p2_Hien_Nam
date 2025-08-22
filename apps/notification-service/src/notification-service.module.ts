import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import configuration from '../configuration';
import { MailQueueModule } from './mail/mail-queue.module';
import { APP_PIPE } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/notification-service/.env'),
      load: [configuration],
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    MailQueueModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: I18nRpcValidationPipe,
    },
  ],
})
export class NotificationServiceModule {}
