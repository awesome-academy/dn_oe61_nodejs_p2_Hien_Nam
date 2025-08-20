import { Module } from '@nestjs/common';
import { ProductServiceController } from './product-service.controller';
import { ProductServiceService } from './product-service.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/prisma';
import * as path from 'path';
import configuration from '../configuration';
import { PrismaClient } from '../generated/prisma';
import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';

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
  ],
  controllers: [ProductServiceController],
  providers: [
    ProductServiceService,
    {
      provide: 'APP_PIPE',
      useClass: I18nRpcValidationPipe,
    },
  ],
})
export class ProductServiceModule {}
