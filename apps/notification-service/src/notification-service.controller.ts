import { Controller } from '@nestjs/common';
import { NotificationService } from './notification-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Notifications } from '@app/common/enums/message-patterns/notification.pattern';
import { PayLoadJWTComplete } from '@app/common/dto/user/sign-token.dto';

@Controller()
export class NotificationServiceController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern(Notifications.SEND_EMAIL_COMPLETE)
  async sendEmailComplete(@Payload() data: PayLoadJWTComplete) {
    return await this.notificationService.sendEmailComplete(data);
  }
}
