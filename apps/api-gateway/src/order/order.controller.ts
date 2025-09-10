import { CurrentUser } from '@app/common';
import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { ConfirmOrderRequest } from '@app/common/dto/product/requests/confirm-order.request';
import { OrderPayload } from '@app/common/dto/product/requests/order-payload.request';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';
import { Role } from '@app/common/enums/roles/users.enum';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { Body, Controller, Headers, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { OrderService } from './order.service';

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
  @AuthRoles(Role.ADMIN)
  @Put(':orderId/reject')
  async rejectOrder(
    @CurrentUser() user: AccessTokenPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const dto: RejectOrderRequest = {
      userId: user.id,
      orderId,
    };
    return await this.orderService.rejectOrder(dto);
  }
  @AuthRoles(Role.ADMIN)
  @Put(':orderId/confirm')
  async confirmOrder(
    @CurrentUser() user: AccessTokenPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const dto: ConfirmOrderRequest = {
      userId: user.id,
      orderId,
    };
    return await this.orderService.confirmOrder(dto);
  }
}
