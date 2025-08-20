import { MailJobDataDto } from '@app/common/dto/mail.dto';
import { SendEmailOrderCreatedPayload } from '@app/common/dto/product/payload/send-email-admin-order-created.payload';
import { NotificationEvent } from '@app/common/enums/queue/order-event.enum';
import { handleJobError } from '@app/common/helpers/queue.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MailQueueService } from './mail-queue.service';

@Processor('mailQueue')
export class MailQueueProcessor {
  constructor(
    private readonly mailerService: MailerService,
    private readonly loggerService: CustomLogger,
    private readonly mailQueueService: MailQueueService,
  ) {}

  @Process('sendReminderEmail')
  async handleReminderEmail(job: Job<MailJobDataDto>) {
    const { to, subject, template, context } = job.data;
    if (!to || !subject || !template) {
      this.loggerService.warn(`Missing required email fields`);
      return;
    }
    try {
      await this.mailerService.sendMail({ to, subject, template, context });
    } catch (error) {
      this.loggerService.error(
        `Failed to send email to ${to}`,
        error instanceof Error ? error.stack : 'Unknown error',
        'MailQueueProcessor.handleReminderEmail',
      );
    }
  }
  @Process(NotificationEvent.ORDER_CREATED)
  async handleSendEmailOrder(job: Job<SendEmailOrderCreatedPayload>) {
    try {
      await this.mailQueueService.sendEmailOrderCreated(job.data);
    } catch (error) {
      await handleJobError(error, job, this.loggerService, '[Error send chat work message]');
    }
  }
}
