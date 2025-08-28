export class ProductCategoryResponse {
  id: number;
  categoryId: number;
  productId: number;
  createdAt: Date;
  updatedAt?: Date;

  category?: {
    id: number;
    name: string;
    parentId?: number;
  };

  product?: {
    id: number;
    name: string;
    sku: string;
  };
}
