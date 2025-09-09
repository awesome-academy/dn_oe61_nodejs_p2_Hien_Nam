import { ArgumentsHost, Catch } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';

interface I18nTranslateService {
  translate(key: string, options?: unknown): string;
}

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  constructor(private readonly i18nService?: I18nTranslateService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<string>() !== 'graphql') {
      return exception;
    }

    if (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      'message' in exception
    ) {
      const rpcError = exception as { exception?: string; message?: string; code?: string };
      return {
        success: false,
        message: this.i18nService?.translate
          ? this.i18nService.translate(rpcError.message || 'common.errors.internalServerError')
          : rpcError.message || 'Internal server error',
        data: null,
        code: rpcError.code ?? 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      };
    }

    const errorMessage = exception instanceof Error ? exception.message : 'Internal server error';
    return {
      success: false,
      message: this.i18nService?.translate
        ? this.i18nService.translate(errorMessage)
        : errorMessage,
      data: null,
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    };
  }
}
