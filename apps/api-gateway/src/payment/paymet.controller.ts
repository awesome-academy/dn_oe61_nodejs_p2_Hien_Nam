import { CurrentUser } from '@app/common';
import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import { RetryPaymentRequest } from '@app/common/dto/product/requests/retry-payment.requqest';
import { PayOSWebhookDTO } from '@app/common/dto/product/response/payos-webhook.dto';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { Body, Controller, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '@app/common/decorators/metadata.decorator';
import { ApiResponseRetryPaymentV1 } from '@app/common/swagger/documents/payment/retry-payment.example';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
  @ApiBearerAuth('access-token')
  @ApiResponseRetryPaymentV1()
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
  @Public()
  @Post('/webhook')
  handleWebhook(@Body() payload: PayOSWebhookDTO) {
    return this.paymentService.callbackWebHook(payload);
  }
}
