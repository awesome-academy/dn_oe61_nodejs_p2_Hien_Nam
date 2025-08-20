import { PaymentMethod } from 'apps/product-service/generated/prisma';

export class PaymentPaidPayloadDto {
  orderId: number;
  amount: number;
  method: PaymentMethod;
  accountNumber: string;
  reference: string;
  counterAccountBankId: string;
  counterAccounName: string;
  counterAccountNumber: string;
}
