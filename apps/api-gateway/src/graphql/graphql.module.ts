import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { CategoryResolver } from './resolvers/category.resolver';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PRODUCT_SERVICE } from '@app/common/constant/service.constant';
import { CategoryService } from './services/category.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Request, Response } from 'express';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLTransformInterceptor } from '@app/common/interceptors/graphql-transform.interceptor';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/api-gateway/src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
      formatError: (error) => {
        return {
          message: error.message,
          code: error.extensions?.code,
          timestamp: new Date().toISOString(),
        };
      },
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: join(process.cwd(), 'libs/common/src/locales/'),
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
  ],
  providers: [
    CategoryResolver,
    CategoryService,
    CustomLogger,
    {
      provide: APP_INTERCEPTOR,
      useClass: GraphQLTransformInterceptor,
    },
  ],
  exports: [CategoryService],
})
export class GraphQLAppModule {}
