import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import configuration from '../configuration';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/auth-service/.env'),
      load: [configuration],
    }),
  ],
  controllers: [AuthServiceController],
  providers: [
    AuthServiceService,
    {
      provide: 'APP_PIPE',
      useClass: I18nRpcValidationPipe,
    },
  ],
})
export class AuthServiceModule {}
