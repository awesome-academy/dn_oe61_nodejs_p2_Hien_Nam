import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { ImageRes } from '@app/common/dto/product/response/images-response';
import { VariantRes } from '@app/common/dto/product/response/variant-response';
import { Decimal } from '@prisma/client/runtime/library';

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
}
