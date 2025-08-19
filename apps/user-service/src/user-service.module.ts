import { Module } from '@nestjs/common';
import { UserServiceController } from './user-service.controller';
import { UserServiceService } from './user-service.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../configuration';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/user-service/.env'),
      load: [configuration],
    }),
  ],
  controllers: [UserServiceController],
  providers: [UserServiceService],
})
export class UserServiceModule {}
