import { Module } from '@nestjs/common';
import { ProductServiceController } from './product-service.controller';
import { ProductServiceService } from './product-service.service';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import configuration from '../configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), 'apps/product-service/.env'),
      load: [configuration],
    }),
  ],
  controllers: [ProductServiceController],
  providers: [ProductServiceService],
})
export class ProductServiceModule {}
