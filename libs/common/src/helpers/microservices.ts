import { ServiceUnavailableException } from '@nestjs/common';
import {
  catchError,
  firstValueFrom,
  Observable,
  of,
  retry,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import { HTTP_ERROR_CODE } from '../enums/errors/http-error-code';
import { TypedRpcException } from '../exceptions/rpc-exceptions';
import { CustomLogger } from '../logger/custom-logger.service';
import { isRpcError } from '../utils/error.util';

export async function callMicroservice<T>(
  observable$: Observable<T>,
  serviceName: string,
  loggerService: CustomLogger,
  options?: {
    timeoutMs?: number;
    retries?: number;
    delayRetry?: number;
    fallbackFn?: () => T | null;
  },
): Promise<T> {
  const { timeoutMs = 3000, retries = 0, delayRetry = 500, fallbackFn } = options || {};
  const result = await firstValueFrom(
    observable$.pipe(
      timeout(timeoutMs),
      retry({ count: retries, delay: delayRetry }),
      catchError((err) => {
        if (fallbackFn) {
          const fallback = fallbackFn();
          if (fallback !== undefined && fallback !== null) {
            loggerService.warn(
              `[${serviceName}] Fallback value used in callMicroservice`,
              `fallback:: ${JSON.stringify(fallback)}`,
            );
            return of(fallback);
          }
        }
        return throwErrorMicroservice(err as Error, serviceName, loggerService);
      }),
    ),
  );
  return result;
}

function throwErrorMicroservice(
  error: Error,
  serviceName: string,
  loggerService: CustomLogger,
): Observable<never> {
  if (error instanceof TimeoutError || error instanceof ServiceUnavailableException) {
    loggerService.error(`[${serviceName}] unavailable`, `details:: ${error.stack}`);
    return throwError(
      () =>
        new TypedRpcException({
          code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
          message: 'common.errors.serviceUnavailable',
        }),
    );
  }
  if (isRpcError(error)) {
    return throwError(() => error);
  }
  return throwError(
    () =>
      new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      }),
  );
}
