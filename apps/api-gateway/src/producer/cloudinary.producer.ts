import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Injectable } from '@nestjs/common';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { DeleteImagePayload } from '../../../../libs/cloudinary/payload/cloudinary.payload';
import { CloudinaryEvent } from '@app/common/enums/queue/cloudinary-event.enum';
import { addJobWithRetry } from '@app/common/helpers/queue.helper';

@Injectable()
export class CloudinaryProducer {
  constructor(
    @InjectQueue(QueueName.CLOUDINARY)
    private readonly cloudinaryQueue: Queue,
  ) {}
  async deleteImage(payload: DeleteImagePayload): Promise<void> {
    await addJobWithRetry(this.cloudinaryQueue, CloudinaryEvent.DELETE_IMAGE, payload);
  }
}
