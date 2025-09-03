import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { ImageRes } from '@app/common/dto/product/response/images-response';
import { ProductVariantResponse } from './product-variant-response';
import { Decimal } from '@prisma/client/runtime/library';
import { CategoryResponse } from './category-response';

export class ProductDetailResponse {
  id: number;
  name: string;
  skuId: string;
  description?: string;
  status: StatusProduct;
  basePrice: Decimal;
  quantity: number;
  images: ImageRes[];
  variants: ProductVariantResponse[];
  categories: CategoryResponse[];
  createdAt?: Date | '';
  updatedAt?: Date | '';
  deletedAt?: Date | '';
}
