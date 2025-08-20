import { Controller } from '@nestjs/common';
import { NotificationService } from './notification-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Notifications } from '@app/common/enums/message-patterns/notification.pattern';
import { PayLoadJWTComplete } from '@app/common/dto/user/sign-token.dto';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { ShareUrlProductResponse } from '@app/common/dto/product/response/share-url-product-response';

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
}
