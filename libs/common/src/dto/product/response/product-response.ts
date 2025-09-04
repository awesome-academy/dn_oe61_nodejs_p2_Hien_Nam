import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { ImageRes } from '@app/common/dto/product/response/images-response';
import { VariantRes } from '@app/common/dto/product/response/variant-response';
import { Decimal } from '@prisma/client/runtime/library';
import { CategoriesResponse } from './category-response';

export class ProductResponse {
  id: number;
  name: string;
  skuId: string;
  description?: string;
  status: StatusProduct;
  basePrice: Decimal;
  quantity: number;
  images?: ImageRes[];
  variants?: VariantRes[];
  categoryIds?: number[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class UserProductResponse {
  id: number;
  name: string;
  skuId: string;
  description?: string;
  status: StatusProduct;
  basePrice: Decimal;
  quantity: number;
  images?: ImageRes[];
  variants?: VariantRes[];
  categories?: CategoriesResponse[];
  reviews?: ReviewRes[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class ReviewRes {
  id: number;
  rating: Decimal;
  comment: string;
  createdAt: Date;
  updatedAt: Date | null;
  userId: number;
  productId: number;
}
