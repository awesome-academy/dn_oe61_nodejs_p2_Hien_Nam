import { CurrentUser } from '@app/common';
import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { RetryPaymentRequest } from '@app/common/dto/product/requests/retry-payment.requqest';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { Controller, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
  @Post('/retry/:orderId')
  async retryPayment(
    @CurrentUser() user: AccessTokenPayload,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Headers('lang') lang: SupportedLocalesType,
  ) {
    const dto: RetryPaymentRequest = {
      userId: user.id,
      orderId: orderId,
      lang: lang,
    };
    return await this.paymentService.retryPayment(dto);
  }
}
