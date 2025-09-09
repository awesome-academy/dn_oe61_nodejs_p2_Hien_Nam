import { MailJobDataDto } from '@app/common/dto/mail.dto';
import { SendEmailOrderCreatedPayload } from '@app/common/dto/product/payload/send-email-admin-order-created.payload';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { formatDateTime } from '@app/common/utils/date.util';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class MailQueueService {
  constructor(
    @InjectQueue(QueueName.EMAIL) private mailQueue: Queue,
    private readonly loggerService: CustomLogger,
    private readonly mailerService: MailerService,
    private readonly i18nService: I18nService,
  ) {}

  async enqueueMailJob(jobName: string, data: MailJobDataDto) {
    if (!jobName) {
      this.loggerService.warn(`Missing required jobName`);
      return;
    }

    try {
      await this.mailQueue.add(jobName, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } catch (error) {
      this.loggerService.error(
        `Failed to add mail job '${jobName}' for recipient: ${data.to}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
  async sendEmailOrderCreated(payload: SendEmailOrderCreatedPayload) {
    try {
      const instance = plainToInstance(SendEmailOrderCreatedPayload, payload);
      await validateOrReject(instance);
    } catch (error) {
      this.loggerService.error(
        `[Order Created payload invalid]`,
        `Payload:: ${JSON.stringify(payload)} - Errors detail:: ${JSON.stringify(error)}`,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'Order created payload invalid ',
      });
    }
    try {
      const { subject, context } = this.buildContentSendEmailOrderCreated(payload);
      await this.mailerService.sendMail({
        to: payload.email,
        subject,
        template: 'send-email-order-created',
        context,
      });
    } catch (error) {
      this.loggerService.error(
        `[Send email order created errors]`,
        `Details:: ${(error as Error).stack}`,
      );
    }
  }
  private buildContentSendEmailOrderCreated(payload: SendEmailOrderCreatedPayload): {
    subject: string;
    context: Record<string, unknown>;
  } {
    const data = payload.data;
    const lang = payload.data.lang;
    const subject = this.i18nService.translate('common.order.notification.email.subject', {
      lang,
      args: { orderId: payload.data.orderId },
    });
    const intro = this.i18nService.translate('common.order.notification.email.intro', {
      lang,
      args: { adminName: payload.name },
    });
    const labels = this.i18nService.translate('common.order.notification.email.labels', { lang });
    const context = {
      intro,
      labels,
      order: {
        id: data.orderId,
        user: data.userName,
        paymentMethod: data.paymentMethod,
        totalPrice: data.totalAmount,
        paymentStatus: data.paymentStatus,
        createdAt: formatDateTime(data.createdAt, lang),
        url: `https://your-system.com/orders/${data.orderId}`,
      },
    };
    return { subject, context };
  }
}
