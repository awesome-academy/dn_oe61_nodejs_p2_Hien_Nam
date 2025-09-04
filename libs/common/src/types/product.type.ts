import { Product } from 'apps/product-service/generated/prisma';

export type ProductWithIncludes = Product & {
  images: unknown[];
  categories: unknown[];
  variants: unknown[];
  reviews: unknown[];
};
