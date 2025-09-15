import { OrderItemResponse } from './order-items.response';

export class PaymentInfo {
  id: number;
  amount: number;
  paymentStatus: string;
  paymentType: string;
  paidAt: Date;
}
export class OrderSummaryResponse {
  id: number;
  userId: number;
  deliveryAddress: string;
  note: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  totalPrice: number;
  items: OrderItemResponse[];
  paymentInfo: PaymentInfo[];
  createdAt: Date;
}
