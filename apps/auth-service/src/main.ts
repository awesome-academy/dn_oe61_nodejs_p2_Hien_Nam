import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  const configService = app.get(ConfigService);

  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      host: configService.get<string>('redis.host'),
      port: configService.get<number>('redis.port'),
    },
  });

  await app.startAllMicroservices();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
