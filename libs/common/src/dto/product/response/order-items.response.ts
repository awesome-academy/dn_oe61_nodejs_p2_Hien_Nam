export class OrderItemResponse {
  id: number;
  productVariantId: number;
  productName: string;
  productSize: string;
  quantity: number;
  price: number;
  note: string | null;
}
