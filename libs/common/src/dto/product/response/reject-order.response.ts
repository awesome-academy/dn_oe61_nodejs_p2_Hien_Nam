import { REJECT_ORDER_STATUS } from '@app/common/enums/order.enum';
import { PaymentMethod } from 'apps/product-service/generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayOutInfoResponse {
  @ApiProperty({
    description: 'Bank code for the refund',
    example: 'VCB',
  })
  bankCode: string;

  @ApiProperty({
    description: 'Account number to receive the refund',
    example: '1234567890',
  })
  toAccountNumber: string;

  @ApiProperty({
    description: 'Transaction code for the refund',
    example: 'TXN123456789',
  })
  transactionCode: string;

  @ApiProperty({
    description: 'Amount refunded to the user',
    example: 29.99,
    type: 'number',
  })
  amountRefunded: number;

  @ApiProperty({
    description: 'ID of the user receiving the refund',
    example: 123,
    type: 'integer',
  })
  userId: number;

  @ApiProperty({
    description: 'ID of the user who rejected the order',
    example: 456,
    type: 'integer',
  })
  userRejectId: number;
}
export class RejectOrderResponse {
  @ApiProperty({
    description: 'Status of the rejected order',
    example: 'REJECTED',
  })
  status: REJECT_ORDER_STATUS;

  @ApiPropertyOptional({
    description: 'Payment method used for the original order',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Description or reason for rejection',
    example: 'Order cancelled due to unavailable items',
  })
  description?: string;

  @ApiProperty({
    description: 'ID of the rejected order',
    example: 789,
    type: 'integer',
  })
  orderId: number;

  @ApiPropertyOptional({
    description: 'Payout information for refunds',
    type: PayOutInfoResponse,
  })
  payoutInfo?: PayOutInfoResponse;

  @ApiPropertyOptional({
    description: 'Date and time when the order was rejected',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  rejectedAt?: Date;
}
