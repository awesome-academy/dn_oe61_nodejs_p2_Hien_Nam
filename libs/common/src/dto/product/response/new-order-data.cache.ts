import {
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from 'apps/product-service/generated/prisma';

export class NewOrderDataCache {
  id: number;
  userId: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
}
