export class PayOSPayloadDto {
  orderCode: number;
  amount: number;
  description: string;
  expiredAt: number;
  returnUrl: string;
  cancelUrl: string;
}
