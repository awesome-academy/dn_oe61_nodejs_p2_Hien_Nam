import { PayLoadJWTComplete } from '@app/common/dto/user/sign-token.dto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { MailQueueService } from './mail/mail-queue.service';
import { MailJobDataDto } from '@app/common/dto/mail.dto';
import { USER_SERVICE } from '@app/common';
import { JOBNAME, SUBJECT } from '@app/common/constant/mail.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { OrderCreatedPayload } from '@app/common/dto/product/payload/order-created.payload';
import { SendEmailOrderCreatedPayload } from '@app/common/dto/product/payload/send-email-admin-order-created.payload';
import { AdminInfoResponse } from '@app/common/dto/user/responses/admin-info.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { PRODUCT_SERVICE } from '@app/common';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { ShareUrlProductResponse } from '@app/common/dto/product/response/share-url-product-response';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { NotificationEvent } from '@app/common/enums/queue/order-event.enum';
import { QueueName } from '@app/common/enums/queue/queue-name.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { callMicroservice } from '@app/common/helpers/microservices';
import { addJobWithRetry } from '@app/common/helpers/queue.helper';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bull';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productServiceClient: ClientProxy,
    private readonly mailQueueService: MailQueueService,
    private readonly loggerService: CustomLogger,
    private readonly configService: ConfigService,
    @InjectQueue(QueueName.CHATWORK) private readonly chatworkQueue: Queue,
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
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
      if (error instanceof Error) {
        this.loggerService.error('SendEmail NotificationService error', error.message);
      }
      throw new RpcException('common.errors.internalServerError');
    }
  }

  getShareProduct(product: UserProductDetailResponse): ShareUrlProductResponse {
    if (!product) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.action.getById.failed',
      });
    }

    const shareUrls = this.generateShareUrls(product);

    if (Object.values(shareUrls).some((url) => !url)) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.action.shareProduct.failed',
      });
    }

    return shareUrls;
  }

  private generateShareUrls(product: UserProductDetailResponse): ShareUrlProductResponse {
    const frontendUrl = this.configService.get<string>('frontendUrl') || '';
    const facebookAppId = this.configService.get<string>('facebook.appID') || '';
    const sharePostUrl = this.configService.get<string>('facebook.sharePostUrl') || '';
    const shareMessengerUrl = this.configService.get<string>('facebook.shareMessengerUrl') || '';

    const productUrl = `${frontendUrl}/user/products/${product.skuId}`;
    const encodedProductUrl = encodeURIComponent(productUrl);

    const quoteText = encodeURIComponent(
      `${product.name} - Giá: ${Number(product.basePrice).toLocaleString('vi-VN')} VND`,
    );

    const messengerShare = this.buildMessengerShareUrl(
      facebookAppId,
      encodedProductUrl,
      frontendUrl,
      shareMessengerUrl,
    );

    const facebookShare = this.buildFacebookShareUrl(
      facebookAppId,
      encodedProductUrl,
      sharePostUrl,
      quoteText,
    );

    return {
      messengerShare,
      facebookShare,
      productUrl,
    };
  }
  private buildFacebookShareUrl(
    appId: string,
    encodedUrl: string,
    sharePostUrl: string,
    quote: string,
  ): string {
    return `${sharePostUrl}?app_id=${appId}&display=popup&href=${encodedUrl}&quote=${quote}`;
  }
  private buildMessengerShareUrl(
    appId: string,
    encodedUrl: string,
    redirectUrl: string,
    shareMessengerUrl: string,
  ): string {
    try {
      return `${shareMessengerUrl}?app_id=${appId}&link=${encodedUrl}&redirect_uri=${encodeURIComponent(
        redirectUrl,
      )}`;
    } catch (error) {
      this.loggerService.error('SendEmail NotificationService error', (error as Error).stack);
      throw new RpcException('common.errors.internalServerError');
    }
  }
  async fetchAllAdmins(): Promise<AdminInfoResponse[]> {
    const adminsDetail = await callMicroservice<AdminInfoResponse[]>(
      this.userClient.send(UserMsgPattern.GET_ALL_ADMIN, {}),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
    return adminsDetail ?? [];
  }
  async sendNotificationOrderCreated(payload: OrderCreatedPayload) {
    try {
      await addJobWithRetry(this.chatworkQueue, NotificationEvent.ORDER_CREATED, payload);
    } catch (error) {
      this.loggerService.error(`[Add job chatwork errors]`, `Details:: ${(error as Error).stack}`);
    }
    try {
      const adminsDetail: AdminInfoResponse[] = (await this.fetchAllAdmins()).filter(
        (admin) => admin?.email,
      );
      if (!adminsDetail || adminsDetail.length === 0) {
        return;
      }
      for (const admin of adminsDetail) {
        const payloadSendEmail: SendEmailOrderCreatedPayload = {
          email: admin.email!,
          name: admin.name,
          data: payload,
        };
        await addJobWithRetry(this.emailQueue, NotificationEvent.ORDER_CREATED, payloadSendEmail);
      }
    } catch (error) {
      this.loggerService.error(`[Add job email errors]`, `Details:: ${(error as Error).stack}`);
    }
  }
}
