import { Queue, JobOptions } from 'bull';

export async function addJobWithRetry<T>(
  queue: Queue,
  event: string,
  data: T,
  options?: Partial<JobOptions>,
): Promise<void> {
  await queue.add(event, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: true,
    removeOnFail: false,
    ...options,
  });
}
