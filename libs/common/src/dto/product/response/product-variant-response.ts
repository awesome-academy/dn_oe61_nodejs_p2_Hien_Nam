import { Decimal } from '@prisma/client/runtime/library';
import { SizeResponse } from './size-response';

export class ProductVariantResponse {
  id: number;
  price: Decimal;
  startDate: Date | null;
  endDate?: Date | null;
  size: SizeResponse;
}
