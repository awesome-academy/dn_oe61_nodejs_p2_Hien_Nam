import { Injectable, ValidationPipe } from '@nestjs/common';
import { HTTP_ERROR_CODE } from '../enums/errors/http-error-code';
import { TypedRpcException } from '../exceptions/rpc-exceptions';
import { formatValidationErrors } from '../utils/error.util';

@Injectable()
export class I18nRpcValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      stopAtFirstError: true,
      exceptionFactory: async (errors) => {
        const messages = await formatValidationErrors(errors);
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.validation.error',
          details: messages,
        });
      },
    });
  }
}
