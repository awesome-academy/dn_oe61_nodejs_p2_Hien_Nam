import { Job, JobOptions, Queue } from 'bull';
import {
  ATTEMPTS_DEFAULT,
  BACKOFF_TYPE_DEFAULT,
  NON_RETRY_ABLE_RRORS,
} from '../constant/queue.constant';
import { DELAY_RETRY_DEFAULT } from '../constant/rpc.constants';
import { LoggerService } from '@nestjs/common';
import { isRpcError } from '../utils/error.util';
import { TypedRpcException } from '../exceptions/rpc-exceptions';

export async function addJobWithRetry<T>(
  queue: Queue,
  event: string,
  data: T,
  options?: Partial<JobOptions>,
): Promise<void> {
  await queue.add(event, data, {
    attempts: ATTEMPTS_DEFAULT,
    backoff: {
      type: BACKOFF_TYPE_DEFAULT,
      delay: DELAY_RETRY_DEFAULT,
    },
    removeOnComplete: true,
    removeOnFail: false,
    ...options,
  });
}
export async function handleJobError(
  error: unknown,
  job: Job,
  logger: LoggerService,
  context: string,
): Promise<void> {
  if (isRpcError(error)) {
    if (NON_RETRY_ABLE_RRORS.includes(error.code)) {
      logger.error(
        `[${context}]`,
        `Details:: Error by [${NON_RETRY_ABLE_RRORS.join(', ')}] - discard job`,
      );
      await job.discard();
      return;
    }
    logger.error(`[${context}]`, `Details:: ${JSON.stringify(error)}`);
    throw new TypedRpcException(error);
  }
  logger.error(
    `[${context} - Server error]`,
    `Details:: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
  );
  throw error;
}
