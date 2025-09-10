import { CurrentUser } from '@app/common';
import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { ConfirmOrderRequest } from '@app/common/dto/product/requests/confirm-order.request';
import { GetOrderRequest } from '@app/common/dto/product/requests/get-order.request';
import { OrderPayload } from '@app/common/dto/product/requests/order-payload.request';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';
import { Role } from '@app/common/enums/roles/users.enum';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { ApiResponseConfirmOrderV1 } from '@app/common/swagger/documents/order/confirm-order.example';
import { ApiResponseCreateOrderV1 } from '@app/common/swagger/documents/order/create-order.example';
import { ApiResponseGetHisOrdersV1 } from '@app/common/swagger/documents/order/get-his-orders.example';
import { ApiResponseGetOrdersV1 } from '@app/common/swagger/documents/order/get-orders.example';
import { ApiResponseRejectOrderV1 } from '@app/common/swagger/documents/order/reject-order.example';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { FilterGetOrdersRequest } from '@app/common/dto/product/requests/filter-get-orders.request';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}
  @Post('')
  @ApiBearerAuth('access-token')
  @ApiResponseCreateOrderV1()
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
  @ApiBearerAuth('access-token')
  @ApiResponseRejectOrderV1()
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
  @ApiBearerAuth('access-token')
  @ApiResponseConfirmOrderV1()
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
  @ApiBearerAuth('access-token')
  @ApiResponseGetHisOrdersV1()
  @Get(':orderId')
  async getOrder(
    @CurrentUser() user: AccessTokenPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const dto: GetOrderRequest = {
      userId: user.id,
      orderId,
      role: user.role as Role,
    };
    return await this.orderService.getOrder(dto);
  }
  @ApiBearerAuth('access-token')
  @ApiResponseGetOrdersV1()
  @Get()
  @AuthRoles(Role.ADMIN)
  async getOrders(@Query() filter: FilterGetOrdersRequest) {
    return await this.orderService.getOrders(filter);
  }
}
