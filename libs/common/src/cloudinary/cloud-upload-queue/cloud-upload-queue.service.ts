import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bull';

export interface EnqueueUploadOptions {
  attempts?: number;
}

@Injectable()
export class CloudUploadQueueService {
  constructor(
    @InjectQueue('cloudUploadQueue') private readonly queue: Queue,
    private readonly logger: Logger,
  ) {}

  async enqueueUpload(
    file: Express.Multer.File,
    folder: string,
    opts: EnqueueUploadOptions = {},
  ): Promise<string> {
    if (!file) {
      this.logger.warn('Missing file for upload job');
      return '';
    }

    const { attempts = 3 } = opts;

    try {
      const job: Job = await this.queue.add(
        'cloudinaryUpload',
        {
          bufferBase64: file.buffer.toString('base64'),
          originalname: file.originalname,
          mimetype: file.mimetype,
          folder,
        },
        {
          attempts,
          backoff: {
            type: 'exponential',
            delay: 60000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      const url = await (job.finished() as Promise<string>);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to add cloud upload job for file ${file.originalname}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
