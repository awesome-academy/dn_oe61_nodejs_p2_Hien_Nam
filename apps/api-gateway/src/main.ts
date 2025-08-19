import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port');
  await app.listen(port ?? 3000);
}
bootstrap();
