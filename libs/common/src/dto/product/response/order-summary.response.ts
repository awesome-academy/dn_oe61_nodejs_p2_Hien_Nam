import { OrderItemResponse } from './order-items.response';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentInfo {
  @ApiProperty({
    description: 'Unique identifier for the payment',
    example: 1,
    type: 'integer',
  })
  id: number;

  @ApiProperty({
    description: 'Payment amount',
    example: 29.99,
    type: 'number',
  })
  amount: number;

  @ApiProperty({
    description: 'Current payment status',
    example: 'COMPLETED',
  })
  paymentStatus: string;

  @ApiProperty({
    description: 'Type of payment method used',
    example: 'CREDIT_CARD',
  })
  paymentType: string;

  @ApiProperty({
    description: 'Date and time when payment was made',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  paidAt: Date;
}
export class OrderSummaryResponse {
  @ApiProperty({
    description: 'Unique identifier for the order',
    example: 1,
    type: 'integer',
  })
  id: number;

  @ApiProperty({
    description: 'ID of the user who placed the order',
    example: 123,
    type: 'integer',
  })
  userId: number;

  @ApiProperty({
    description: 'Delivery address for the order',
    example: '123 Main Street, City, State 12345',
  })
  deliveryAddress: string;

  @ApiProperty({
    description: 'Optional note for the order',
    example: 'Please deliver after 6 PM',
    nullable: true,
  })
  note: string | null;

  @ApiProperty({
    description: 'Payment method used for the order',
    example: 'CREDIT_CARD',
  })
  paymentMethod: string;

  @ApiProperty({
    description: 'Current payment status',
    example: 'PENDING',
  })
  paymentStatus: string;

  @ApiProperty({
    description: 'Current order status',
    example: 'PROCESSING',
  })
  status: string;

  @ApiProperty({
    description: 'Total price of the order',
    example: 29.99,
    type: 'number',
  })
  totalPrice: number;

  @ApiProperty({
    description: 'List of items in the order',
    type: () => [OrderItemResponse],
    isArray: true,
  })
  items: OrderItemResponse[];

  @ApiProperty({
    description: 'Payment information history',
    type: () => [PaymentInfo],
    isArray: true,
  })
  paymentInfo: PaymentInfo[];

  @ApiProperty({
    description: 'Order creation date and time',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;
}
