import { GetStatisticByMonthRequest } from '@app/common/dto/product/requests/get-statistic-by-month.request';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from '../notification-service.service';

@Injectable()
export class TaskService {
  constructor(private readonly notificationService: NotificationService) {}
  @Cron('59 23 * * *')
  async handleSendStatisticOrderMonthly() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (tomorrow.getDate() === 1) {
      const requestStatisticOrders: GetStatisticByMonthRequest = {
        month: tomorrow.getMonth() + 1,
        year: tomorrow.getFullYear(),
      };
      await this.notificationService.sendStatisticOrderMonthly('en', requestStatisticOrders);
    }
  }
}
