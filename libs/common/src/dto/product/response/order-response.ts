import { OrderItemResponse } from './order-items.response';
export class PaymentInfoResponse {
  qrCodeUrl: string;
  expiredAt: string;
}
export class OrderResponse {
  id: number;
  userId: number;
  deliveryAddress: string;
  note: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  totalPrice: number;
  items: OrderItemResponse[];
  paymentInfo?: PaymentInfoResponse;
  createdAt: Date;
}
