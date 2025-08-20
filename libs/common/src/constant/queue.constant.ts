import { HTTP_ERROR_CODE } from '../enums/errors/http-error-code';

export const ATTEMPTS_DEFAULT = 3;
export const DELAY_RETRY_DEFAULT = 5000;
export const BACKOFF_TYPE_DEFAULT = 'exponential';
export const NON_RETRY_ABLE_RRORS: HTTP_ERROR_CODE[] = [
  HTTP_ERROR_CODE.CONFLICT,
  HTTP_ERROR_CODE.BAD_REQUEST,
  HTTP_ERROR_CODE.NOT_FOUND,
];
