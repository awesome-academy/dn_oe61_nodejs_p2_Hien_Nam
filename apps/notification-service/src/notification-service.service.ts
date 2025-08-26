import { PayLoadJWTComplete } from '@app/common/dto/user/sign-token.dto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { MailQueueService } from './mail/mail-queue.service';
import { MailJobDataDto } from '@app/common/dto/mail.dto';
import { JOBNAME, SUBJECT } from '@app/common/constant/mail.constant';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';

@Injectable()
export class NotificationService {
  constructor(
    private mailQueueService: MailQueueService,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  async sendEmailComplete(data: PayLoadJWTComplete) {
    if (!data) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.sendEmailComplete.dataNotFound',
      });
    }

    const { user, token } = data;
    const baseUrl = this.configService.get<string>('app.frontendUrl');
    const jobName = JOBNAME.SEND_REDMINED_EMAIL;
    const email = user.email as string;
    const name = user.name;
    const userName = user.userName;
    const subject = SUBJECT.COMPLETE_USER;
    const context = {
      baseUrl: baseUrl,
      name: name,
      userName: userName,
      token: token,
    };

    await this.sendEmail(jobName, email, subject, 'sendEmailComplete', context);
    return 'common.auth.action.sendEmailComplete.complete';
  }

  private async sendEmail(
    jobName: string,
    email: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ) {
    try {
      const mailJobDataDto: MailJobDataDto = {
        to: email,
        subject: subject,
        template: template,
        context: context,
      };

      await this.mailQueueService.enqueueMailJob(jobName, mailJobDataDto);
    } catch (error) {
      this.logger.error('SendEmail NotificationService error', error);
      throw new RpcException('common.errors.internalServerError');
    }
  }
}
