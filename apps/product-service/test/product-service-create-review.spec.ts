import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { Decimal } from '@prisma/client/runtime/library';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('class-transformer', () => ({
  ...jest.requireActual('class-transformer'),
  plainToInstance: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('class-validator', () => ({
  ...jest.requireActual('class-validator'),
  validateOrReject: jest.fn(),
}));

const mockPlainToInstance = plainToInstance as jest.MockedFunction<typeof plainToInstance>;
const mockValidateOrReject = validateOrReject as jest.MockedFunction<typeof validateOrReject>;

describe('ProductService - createReview', () => {
  let service: ProductService;
  let loggerService: CustomLogger;

  const mockPrismaClient = {
    product: { findFirst: jest.fn() },
    review: { findFirst: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: { client: mockPrismaClient } },
        { provide: PaginationService, useValue: {} },
        { provide: CustomLogger, useValue: { log: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    loggerService = module.get<CustomLogger>(CustomLogger);

    jest.clearAllMocks();
    mockPlainToInstance.mockImplementation((_cls, obj) => obj as CreateReviewDto);
    mockValidateOrReject.mockResolvedValue(undefined);
  });

  describe('successful scenarios', () => {
    it('should create review successfully', async () => {
      const skuId = 'TEST-SKU-001';
      const userId = 1;
      const createReviewData: CreateReviewDto = {
        rating: 4.5,
        comment: 'Great product!',
      };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockCreatedReview = {
        id: 1,
        rating: new Decimal(4.5),
        comment: 'Great product!',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(null);
      mockPrismaClient.review.create.mockResolvedValue(mockCreatedReview);

      const result = await service.createReview(skuId, createReviewData, userId);

      expect(result).toEqual({
        id: 1,
        rating: 4.5,
        comment: 'Great product!',
        createdAt: new Date('2024-01-01'),
        userId: 1,
        productId: 1,
      });
      expect(mockPrismaClient.product.findFirst).toHaveBeenCalledWith({
        where: { skuId, deletedAt: null },
      });
      expect(mockPrismaClient.review.create).toHaveBeenCalledWith({
        data: {
          rating: new Decimal(4.5),
          comment: 'Great product!',
          userId: 1,
          productId: 1,
        },
      });
    });

    it('should create review without comment', async () => {
      const skuId = 'TEST-SKU-002';
      const userId = 2;
      const createReviewData: CreateReviewDto = { rating: 5 };
      const mockProduct = { id: 2, skuId, deletedAt: null };
      const mockCreatedReview = {
        id: 2,
        rating: new Decimal(5),
        comment: null,
        userId: 2,
        productId: 2,
        createdAt: new Date('2024-01-01'),
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(null);
      mockPrismaClient.review.create.mockResolvedValue(mockCreatedReview);

      const result = await service.createReview(skuId, createReviewData, userId);

      expect(result.comment).toBeUndefined();
      expect(result.rating).toBe(5);
    });

    it('should handle decimal rating conversion', async () => {
      const skuId = 'TEST-SKU-003';
      const userId = 3;
      const createReviewData: CreateReviewDto = { rating: 3.7, comment: 'Good' };
      const mockProduct = { id: 3, skuId, deletedAt: null };
      const mockCreatedReview = {
        id: 3,
        rating: new Decimal(3.7),
        comment: 'Good',
        userId: 3,
        productId: 3,
        createdAt: new Date('2024-01-01'),
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(null);
      mockPrismaClient.review.create.mockResolvedValue(mockCreatedReview);

      const result = await service.createReview(skuId, createReviewData, userId);

      expect(result.rating).toBe(3.7);
      expect(mockPrismaClient.review.create).toHaveBeenCalledTimes(1);

      // Verify that rating is converted to Decimal
      const callArgs = mockPrismaClient.review.create.mock.calls[0] as [
        { data: { rating: Decimal } },
      ];
      const passedRating = callArgs[0].data.rating;
      expect(passedRating).toBeInstanceOf(Decimal);
      expect(passedRating.toNumber()).toBe(3.7);
    });
  });

  describe('error scenarios', () => {
    it('should throw TypedRpcException when product not found', async () => {
      const skuId = 'INVALID-SKU';
      const userId = 1;
      const createReviewData: CreateReviewDto = { rating: 4, comment: 'Test' };

      mockPrismaClient.product.findFirst.mockResolvedValue(null);

      await expect(service.createReview(skuId, createReviewData, userId)).rejects.toThrow(
        TypedRpcException,
      );
    });

    it('should throw TypedRpcException when user already reviewed', async () => {
      const skuId = 'TEST-SKU-004';
      const userId = 1;
      const createReviewData: CreateReviewDto = { rating: 4, comment: 'Test' };
      const mockProduct = { id: 4, skuId, deletedAt: null };
      const existingReview = { id: 1, userId: 1, productId: 4 };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(existingReview);

      await expect(service.createReview(skuId, createReviewData, userId)).rejects.toThrow(
        TypedRpcException,
      );
    });

    it('should propagate TypedRpcException from validation', async () => {
      const skuId = 'TEST-SKU-005';
      const userId = 1;
      const createReviewData: CreateReviewDto = { rating: 4, comment: 'Test' };
      const validationError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'validation.error',
      });

      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.createReview(skuId, createReviewData, userId)).rejects.toThrow(
        TypedRpcException,
      );
    });

    it('should handle database errors and throw internal server error', async () => {
      const skuId = 'TEST-SKU-006';
      const userId = 1;
      const createReviewData: CreateReviewDto = { rating: 4, comment: 'Test' };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.product.findFirst.mockRejectedValue(dbError);

      await expect(service.createReview(skuId, createReviewData, userId)).rejects.toThrow(
        TypedRpcException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(loggerService.error).toHaveBeenCalledWith(
        'CreateReview',
        'Database connection failed',
        expect.stringMatching(/.*/),
      );
    });

    it('should handle non-Error exceptions', async () => {
      const skuId = 'TEST-SKU-007';
      const userId = 1;
      const createReviewData: CreateReviewDto = { rating: 4, comment: 'Test' };
      const nonError = 'String error';

      mockPrismaClient.product.findFirst.mockRejectedValue(nonError);

      await expect(service.createReview(skuId, createReviewData, userId)).rejects.toThrow(
        TypedRpcException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(loggerService.error).toHaveBeenCalledWith('CreateReview', 'String error', undefined);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in skuId', async () => {
      const skuId = 'TEST-SKU-@#$%';
      const userId = 1;
      const createReviewData: CreateReviewDto = { rating: 4, comment: 'Test' };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockCreatedReview = {
        id: 1,
        rating: new Decimal(4),
        comment: 'Test',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(null);
      mockPrismaClient.review.create.mockResolvedValue(mockCreatedReview);

      const result = await service.createReview(skuId, createReviewData, userId);

      expect(result.id).toBe(1);
      expect(mockPrismaClient.product.findFirst).toHaveBeenCalledWith({
        where: { skuId: 'TEST-SKU-@#$%', deletedAt: null },
      });
    });

    it('should handle very long comments', async () => {
      const skuId = 'TEST-SKU-LONG';
      const userId = 1;
      const longComment = 'A'.repeat(1000);
      const createReviewData: CreateReviewDto = { rating: 4, comment: longComment };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockCreatedReview = {
        id: 1,
        rating: new Decimal(4),
        comment: longComment,
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(null);
      mockPrismaClient.review.create.mockResolvedValue(mockCreatedReview);

      const result = await service.createReview(skuId, createReviewData, userId);

      expect(result.comment).toBe(longComment);
      expect(result.comment?.length).toBe(1000);
    });

    it('should handle high userId values', async () => {
      const skuId = 'TEST-SKU-HIGH-USER';
      const userId = 999999;
      const createReviewData: CreateReviewDto = { rating: 4, comment: 'Test' };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockCreatedReview = {
        id: 1,
        rating: new Decimal(4),
        comment: 'Test',
        userId: 999999,
        productId: 1,
        createdAt: new Date('2024-01-01'),
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(null);
      mockPrismaClient.review.create.mockResolvedValue(mockCreatedReview);

      const result = await service.createReview(skuId, createReviewData, userId);

      expect(result.userId).toBe(999999);
    });

    it('should handle minimum and maximum rating values', async () => {
      const skuId = 'TEST-SKU-RATING';
      const userId1 = 1;
      const userId2 = 2;
      const createReviewDataMin: CreateReviewDto = { rating: 1, comment: 'Min' };
      const createReviewDataMax: CreateReviewDto = { rating: 5, comment: 'Max' };
      const mockProduct = { id: 1, skuId, deletedAt: null };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(null);
      mockPrismaClient.review.create
        .mockResolvedValueOnce({
          id: 1,
          rating: new Decimal(1),
          comment: 'Min',
          userId: 1,
          productId: 1,
          createdAt: new Date('2024-01-01'),
        })
        .mockResolvedValueOnce({
          id: 2,
          rating: new Decimal(5),
          comment: 'Max',
          userId: 2,
          productId: 1,
          createdAt: new Date('2024-01-01'),
        });

      const resultMin = await service.createReview(skuId, createReviewDataMin, userId1);
      const resultMax = await service.createReview(skuId, createReviewDataMax, userId2);

      expect(resultMin.rating).toBe(1);
      expect(resultMax.rating).toBe(5);
    });
  });

  describe('method verification', () => {
    it('should verify correct method signature and return type', async () => {
      const skuId = 'TEST-SKU-VERIFY';
      const userId = 1;
      const createReviewData: CreateReviewDto = { rating: 4, comment: 'Test' };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockCreatedReview = {
        id: 1,
        rating: new Decimal(4),
        comment: 'Test',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPrismaClient.review.findFirst.mockResolvedValue(null);
      mockPrismaClient.review.create.mockResolvedValue(mockCreatedReview);

      const result = await service.createReview(skuId, createReviewData, userId);

      expect(typeof service.createReview).toBe('function');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('rating');
      expect(result).toHaveProperty('comment');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('productId');
      expect(typeof result.id).toBe('number');
      expect(typeof result.rating).toBe('number');
      expect(typeof result.userId).toBe('number');
      expect(typeof result.productId).toBe('number');
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });
});
