export class TransactionPayoutDto {
  id: string;
  referenceId: string;
  amount: number;
  description: string;
  toBin: string;
  toAccountNumber: string;
  toAccountName: string;
  reference: string;
  transactionDatetime: Date;
}
export class PayOSPayoutPaymentDataDto {
  id: string;
  referenceId: string;
  transactions: TransactionPayoutDto[];
  amount: number;
  description: string;
  toBin: string;
  toAccountNumber: string;
  toAccountName: string;
  reference: string;
  transactionDatetime: Date;
  errorMessage: string;
  errorCode: string;
}
export class PayOSPayoutPaymentResponseDto {
  desc: string;
  data: PayOSPayoutPaymentDataDto;
}
