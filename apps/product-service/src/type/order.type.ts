import { Decimal } from '@prisma/client/runtime/library';
import {
  Order,
  OrderItem,
  PaymentType,
  ProductVariant,
} from 'apps/product-service/generated/prisma';

export type OrderItemInputForNested = {
  amount: number;
  quantity: number;
  note?: string;
  productVariant: { connect: { id: number } };
};
export type OrderWithItems = Order & {
  items: (OrderItem & {
    productVariant: ProductVariant & {
      product: { id: number; name: string };
      size: { nameSize: string };
    };
  })[];
};
export type OrderSummaryType = Order & {
  items: (OrderItem & {
    productVariant: ProductVariant & {
      product: { id: number; name: string };
      size: { nameSize: string };
    };
  })[];
  payments: {
    id: number;
    amount: Decimal;
    status: string;
    paymentType: PaymentType;
    createdAt: Date;
  }[];
};
