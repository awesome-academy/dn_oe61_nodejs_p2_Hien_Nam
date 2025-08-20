import { PayLoadJWTComplete } from '@app/common/dto/user/sign-token.dto';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { ShareUrlProductResponse } from '@app/common/dto/product/response/share-url-product-response';
import { Notifications } from '@app/common/enums/message-patterns/notification.pattern';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification-service.service';
import { NotificationEvent } from '@app/common/enums/queue/order-event.enum';
import { OrderCreatedPayload } from '@app/common/dto/product/payload/order-created.payload';

@Controller()
export class NotificationServiceController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern(Notifications.SEND_EMAIL_COMPLETE)
  async sendEmailComplete(@Payload() data: PayLoadJWTComplete) {
    return await this.notificationService.sendEmailComplete(data);
  }

  @MessagePattern(ProductPattern.GET_SHARE_INFO)
  getShareProduct(@Payload() payLoad: UserProductDetailResponse): ShareUrlProductResponse {
    return this.notificationService.getShareProduct(payLoad);
  }
  @MessagePattern(NotificationEvent.ORDER_CREATED)
  async sendEmailOrder(@Payload() data: OrderCreatedPayload) {
    return await this.notificationService.sendNotificationOrderCreated(data);
  }
}
