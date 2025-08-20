import { PaymentStatus } from 'apps/product-service/generated/prisma';
export class PaymentPaidInfo {
  amount: number;
  referenceCode: string;
  paidAt: Date;
}
export class PaymentPaidResponse {
  status: PaymentStatus;
  info?: PaymentPaidInfo;
}
