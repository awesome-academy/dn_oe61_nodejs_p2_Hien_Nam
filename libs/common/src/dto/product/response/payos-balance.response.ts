export class PayBalanceDataDto {
  accountNumber: string;
  accountName: string;
  currency: string;
  balance: number;
}
export class PayBalanceResponseDto {
  desc: string;
  code: string;
  data: PayBalanceDataDto;
}
