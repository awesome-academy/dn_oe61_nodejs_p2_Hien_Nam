import { DeleteSoftCartRequest } from '@app/common/dto/product/requests/delete-soft-cart.request';
import { ProductEvent } from '@app/common/enums/queue/product-event.enum';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { handleJobError } from '@app/common/helpers/queue.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { ProductService } from './product-service.service';

@Processor({ name: QueueName.PRODUCT })
@Injectable()
export class ProductProcessor {
  constructor(
    private readonly productService: ProductService,
    private readonly loggerService: CustomLogger,
  ) {}
  @Process(ProductEvent.SOFT_DELETE_CART)
  async handleSoftDeleteCart(job: Job<DeleteSoftCartRequest>) {
    try {
      await this.productService.deleteSoftCart(job.data);
    } catch (error) {
      await handleJobError(error, job, this.loggerService, '[Error delete soft cart]');
    }
  }
}
