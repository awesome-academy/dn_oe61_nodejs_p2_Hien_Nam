export class ReviewResponse {
  id: number;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt?: Date;
  userId: number;
  productId: number;
}

export class ReviewDetailResponse extends ReviewResponse {
  product?: {
    id: number;
    skuId: string;
    name: string;
    basePrice: number;
  };
}

export class CreateReviewResponse {
  id: number;
  rating: number;
  comment?: string;
  createdAt: Date;
  userId: number;
  productId: number;
}
