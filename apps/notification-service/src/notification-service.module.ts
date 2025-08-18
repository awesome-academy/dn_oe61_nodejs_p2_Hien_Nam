import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import configuration from '../configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(
        process.cwd(),
        'apps/notification-service/.env',
      ),
      load: [configuration],
    }),
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
