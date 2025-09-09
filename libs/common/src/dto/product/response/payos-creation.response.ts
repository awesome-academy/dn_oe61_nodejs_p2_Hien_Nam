export class PayOSCreatePaymentDataDto {
  checkoutUrl: string;
  qrCode: string;
  orderCode: number;
  orderId: number;
  amount: number;
  description: string;
}
export class PayOSCreatePaymentResponseDto {
  desc: string;
  data: PayOSCreatePaymentDataDto;
}
