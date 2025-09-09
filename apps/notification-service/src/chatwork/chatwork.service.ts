import { OrderCreatedPayload } from '@app/common/dto/product/payload/order-created.payload';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';

@Injectable()
export class ChatworkService {
  constructor(
    private readonly loggerService: CustomLogger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly i18nService: I18nService,
  ) {}
  async sendMessage(dto: OrderCreatedPayload) {
    const baseApi = this.configService.get<string>('chatwork.baseApi');
    const roomId = this.configService.get<string>('chatwork.roomId');
    const apiToken = this.configService.get<string>('chatwork.apiToken');
    const message = this.buildOrderMessage(dto);
    const params = new URLSearchParams();
    params.append('body', message);
    const url = `${baseApi}/rooms/${roomId}/messages`;
    const headers = {
      'X-ChatWorkToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    try {
      await firstValueFrom(this.httpService.post(url, params.toString(), { headers }));
    } catch (error) {
      this.loggerService.error(
        `[Send message chatwork errors]`,
        `Details:: ${(error as Error).stack}`,
      );
    }
  }
  private buildOrderMessage(order: OrderCreatedPayload) {
    const header = this.i18nService.translate('common.order.notification.chatwork.header', {
      lang: order.lang,
      args: { title: 'New Order' },
    });
    const body = this.i18nService.translate('common.order.notification.chatwork.body', {
      lang: order.lang,
      args: {
        orderId: order.orderId,
        userName: order.userName,
        paymentMethod: order.paymentMethod,
        total: order.totalAmount,
      },
    });
    const footer = this.i18nService.translate('common.order.notification.chatwork.footer', {
      lang: order.lang,
      args: {
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        orderLink: `https://your-system.com/orders/${order.orderId}`,
      },
    });
    return `${header}\n${body}\n${footer}`;
  }
}
