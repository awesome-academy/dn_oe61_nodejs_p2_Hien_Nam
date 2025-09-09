import { Body, Controller, Headers, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { CurrentUser } from '@app/common';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { OrderPayload } from '@app/common/dto/product/requests/order-payload.request';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { SupportedLocalesType } from '@app/common/constant/locales.constant';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}
  @Post('')
  async createOrder(
    @CurrentUser() user: AccessTokenPayload,
    @Body() payload: OrderPayload,
    @Headers('accept-language') lang: SupportedLocalesType,
  ) {
    const dto: OrderRequest = {
      userId: user.id,
      ...payload,
      lang,
    };
    return await this.orderService.createOrder(dto);
  }
}
