export class DeleteReviewResponse {
  id: number;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt?: Date | null;
  deletedAt: Date | null;
  userId: number;
  productId: number;
}
