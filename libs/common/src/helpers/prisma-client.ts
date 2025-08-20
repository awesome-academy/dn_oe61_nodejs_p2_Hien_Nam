import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CustomLogger } from '../logger/custom-logger.service';
import { mapPrismaErrorToHttp } from '../utils/prisma-client-error';

export function logAndThrowPrismaClientError(
  error: PrismaClientKnownRequestError,
  loggerService: CustomLogger,
  resourceService: string,
  actionFunction: string,
): never {
  loggerService.error(
    `[${resourceService} - ${actionFunction} Failed] `,
    `details:: ${error.stack}`,
  );
  throw mapPrismaErrorToHttp(error);
}
