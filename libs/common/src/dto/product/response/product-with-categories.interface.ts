export interface ProductWithCategories {
  id: number;
  skuId: string;
  name: string;
  description: string | null;
  status: string;
  basePrice: any;
  quantity: number;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  categories: {
    category: {
      id: number;
      name: string;
      parentId: number | null;
    };
  }[];
}
