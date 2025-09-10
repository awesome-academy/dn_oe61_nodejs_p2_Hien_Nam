import { REJECT_ORDER_STATUS } from '@app/common/enums/order.enum';
import { PaymentMethod } from 'apps/product-service/generated/prisma';

export class PayOutInfoResponse {
  bankCode: string;
  toAccountNumber: string;
  transactionCode: string;
  amountRefunded: number;
  userId: number;
  userRejectId: number;
}
export class RejectOrderResponse {
  status: REJECT_ORDER_STATUS;
  paymentMethod?: PaymentMethod;
  description?: string;
  orderId: number;
  payoutInfo?: PayOutInfoResponse;
  rejectedAt?: Date;
}
