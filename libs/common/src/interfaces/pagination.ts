import { ProductResponse } from '../dto/product/response/product-response';

export interface PaginationParmas {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  itemsOnPage: number;
}

export interface PaginationResult<TEntity> {
  items: TEntity[];
  paginations: PaginationMeta;
}

export interface getAllResult {
  items: ProductResponse[];
  paginations: PaginationMeta;
}
