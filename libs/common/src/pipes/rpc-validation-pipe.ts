import { ValidationPipe, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { HTTP_ERROR_CODE } from '../enums/errors/http-error-code';
import { TypedRpcException } from '../exceptions/rpc-exceptions';
import { formatValidationErrors } from '../utils/error.util';

@Injectable()
export class I18nRpcValidationPipe extends ValidationPipe {
  constructor(i18nService: I18nService) {
    super({
      transform: true,
      whitelist: true,
      stopAtFirstError: true,
      exceptionFactory: async (errors) => {
        const messages = await formatValidationErrors(errors, i18nService);
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: i18nService.translate('common.validation.error'),
          details: messages,
        });
      },
    });
  }
}
