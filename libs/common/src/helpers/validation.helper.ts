import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { formatValidationErrors } from '../utils/error.util';
import { TypedRpcException } from '../exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '../enums/errors/http-error-code';
import { ValidationError } from '@nestjs/common';

export async function validateDto<T extends object>(
  dtoClass: new () => T,
  payload: unknown,
): Promise<T> {
  const instance = plainToInstance(dtoClass, payload);
  try {
    await validateOrReject(instance);
    return instance;
  } catch (errors) {
    const validationErrors = errors as ValidationError[];
    const messages = await formatValidationErrors(validationErrors);
    throw new TypedRpcException({
      code: HTTP_ERROR_CODE.BAD_REQUEST,
      message: 'common.validation.error',
      details: messages,
    });
  }
}
