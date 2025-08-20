import { Order, OrderItem, ProductVariant } from 'apps/product-service/generated/prisma';

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
