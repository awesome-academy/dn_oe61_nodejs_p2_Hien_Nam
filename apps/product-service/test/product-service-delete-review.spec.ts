import { NOTIFICATION_SERVICE } from '@app/common';
import { DeleteReviewDto } from '@app/common/dto/product/requests/delete-review.dto';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaService } from '@app/prisma';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import 'reflect-metadata';
import { ProductService } from '../src/product-service.service';
import { ProductProducer } from '../src/product.producer';
import { CacheService } from '@app/common/cache/cache.service';

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
const mockConfigService = {
  get: jest.fn(),
};
const mockNotificationClient = {
  emit: jest.fn(),
};

const mockI18nService = {
  translate: jest.fn(),
};

const mockProductProducer = {
  addJobRetryPayment: jest.fn(),
};
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
} as unknown as CacheService;
describe('ProductService - deleteReview', () => {
  let service: ProductService;
  let loggerService: CustomLogger;

  const mockPrismaClient = {
    review: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPaginationService = {
    queryWithPagination: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: { client: mockPrismaClient } },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: CustomLogger, useValue: { log: jest.fn(), error: jest.fn() } },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NOTIFICATION_SERVICE,
          useValue: mockNotificationClient,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: ProductProducer,
          useValue: mockProductProducer,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    loggerService = module.get<CustomLogger>(CustomLogger);

    jest.clearAllMocks();
    mockPlainToInstance.mockImplementation((_cls, obj) => obj as DeleteReviewDto);
    mockValidateOrReject.mockResolvedValue(undefined);
  });

  describe('successful scenarios', () => {
    it('should delete review successfully', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const mockExistingReview = {
        id: 1,
        rating: new Decimal(4.5),
        comment: 'Great product!',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(result).toEqual({
        id: 1,
        rating: 4.5,
        comment: 'Great product!',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        deletedAt: new Date('2024-01-03'),
        userId: 1,
        productId: 1,
      });

      expect(mockPrismaClient.review.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: 1,
          deletedAt: null,
        },
      });

      expect(mockPrismaClient.review.update).toHaveBeenCalledTimes(1);
      const updateCallArgs = mockPrismaClient.review.update.mock.calls[0] as [
        { where: { id: number }; data: { deletedAt: Date } },
      ];
      expect(updateCallArgs[0].where).toEqual({ id: 1 });
      expect(updateCallArgs[0].data.deletedAt).toBeInstanceOf(Date);
    });

    it('should delete review with null comment', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 2, userId: 2 };
      const mockExistingReview = {
        id: 2,
        rating: new Decimal(3),
        comment: null,
        userId: 2,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(result.comment).toBe('');
      expect(result.updatedAt).toBe(null);
    });

    it('should delete review with decimal rating', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 3, userId: 3 };
      const mockExistingReview = {
        id: 3,
        rating: new Decimal(3.75),
        comment: 'Good product',
        userId: 3,
        productId: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(result.rating).toBe(3.75);
    });

    it('should delete review with different user and product IDs', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 100, userId: 50 };
      const mockExistingReview = {
        id: 100,
        rating: new Decimal(5),
        comment: 'Excellent!',
        userId: 50,
        productId: 25,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(result.userId).toBe(50);
      expect(result.productId).toBe(25);
      expect(mockPrismaClient.review.findFirst).toHaveBeenCalledWith({
        where: {
          id: 100,
          userId: 50,
          deletedAt: null,
        },
      });
    });
  });

  describe('error scenarios', () => {
    it('should throw TypedRpcException when review not found', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 999, userId: 1 };

      mockPrismaClient.review.findFirst.mockResolvedValue(null);

      await expect(service.deleteReview(deleteReviewData)).rejects.toThrow(TypedRpcException);

      try {
        await service.deleteReview(deleteReviewData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(rpcError.message).toBe('common.review.errors.reviewNotFound');
      }
    });

    it('should throw TypedRpcException when review belongs to different user', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 999 };

      mockPrismaClient.review.findFirst.mockResolvedValue(null);

      await expect(service.deleteReview(deleteReviewData)).rejects.toThrow(TypedRpcException);

      expect(mockPrismaClient.review.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: 999,
          deletedAt: null,
        },
      });
    });

    it('should throw TypedRpcException when review already deleted', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };

      mockPrismaClient.review.findFirst.mockResolvedValue(null);

      await expect(service.deleteReview(deleteReviewData)).rejects.toThrow(TypedRpcException);
    });

    it('should propagate TypedRpcException from validation', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const validationError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'validation.error',
      });

      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.deleteReview(deleteReviewData)).rejects.toThrow(validationError);
    });

    it('should handle database errors during findFirst and throw original error', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.review.findFirst.mockRejectedValue(dbError);
      try {
        await service.deleteReview(deleteReviewData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(rpcError.message).toBe('common.errors.internalServerError');
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(loggerService.error).toHaveBeenCalledWith(
        'DeleteReview',
        'Database connection failed',
        expect.stringMatching(/.*/),
      );
    });

    it('should handle database errors during update and throw original error', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const mockExistingReview = {
        id: 1,
        rating: new Decimal(4),
        comment: 'Good',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await service.deleteReview(deleteReviewData);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      mockPrismaClient.review.update.mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await service.deleteReview(deleteReviewData);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
      try {
        await service.deleteReview(deleteReviewData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
      }
    });

    it('should handle non-Error exceptions', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const nonError = 'String error';

      mockPrismaClient.review.findFirst.mockRejectedValue(nonError);

      try {
        await service.deleteReview(deleteReviewData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
      }

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(loggerService.error).toHaveBeenCalledWith('DeleteReview', 'String error', undefined);
    });
  });

  describe('edge cases', () => {
    it('should handle very high review and user IDs', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 999999, userId: 888888 };
      const mockExistingReview = {
        id: 999999,
        rating: new Decimal(1),
        comment: 'Poor',
        userId: 888888,
        productId: 777777,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(result.id).toBe(999999);
      expect(result.userId).toBe(888888);
      expect(result.productId).toBe(777777);
    });

    it('should handle very long comments', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const longComment = 'A'.repeat(1000);
      const mockExistingReview = {
        id: 1,
        rating: new Decimal(3),
        comment: longComment,
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(result.comment).toBe(longComment);
      expect(result.comment?.length).toBe(1000);
    });

    it('should handle minimum rating value', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const mockExistingReview = {
        id: 1,
        rating: new Decimal(1),
        comment: 'Minimum rating',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(result.rating).toBe(1);
    });

    it('should handle maximum rating value', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const mockExistingReview = {
        id: 1,
        rating: new Decimal(5),
        comment: 'Maximum rating',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(result.rating).toBe(5);
    });

    it('should handle concurrent delete requests', async () => {
      const deleteReviewData1: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const deleteReviewData2: DeleteReviewDto = { reviewId: 2, userId: 2 };
      const mockExistingReview1 = {
        id: 1,
        rating: new Decimal(4),
        comment: 'Review 1',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };

      const mockExistingReview2 = {
        id: 2,
        rating: new Decimal(3),
        comment: 'Review 2',
        userId: 2,
        productId: 2,
        createdAt: new Date('2024-01-02'),
        updatedAt: null,
        deletedAt: null,
      };

      mockPrismaClient.review.findFirst
        .mockResolvedValueOnce(mockExistingReview1)
        .mockResolvedValueOnce(mockExistingReview2);

      mockPrismaClient.review.update
        .mockResolvedValueOnce({ ...mockExistingReview1, deletedAt: new Date('2024-01-03') })
        .mockResolvedValueOnce({ ...mockExistingReview2, deletedAt: new Date('2024-01-03') });

      const [result1, result2] = await Promise.all([
        service.deleteReview(deleteReviewData1),
        service.deleteReview(deleteReviewData2),
      ]);

      expect(result1.id).toBe(1);
      expect(result2.id).toBe(2);
      expect(mockPrismaClient.review.findFirst).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.review.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('method verification', () => {
    it('should verify correct method signature and return type', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const mockExistingReview = {
        id: 1,
        rating: new Decimal(4),
        comment: 'Test',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      const result = await service.deleteReview(deleteReviewData);

      expect(typeof service.deleteReview).toBe('function');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('rating');
      expect(result).toHaveProperty('comment');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('deletedAt');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('productId');
      expect(typeof result.id).toBe('number');
      expect(typeof result.rating).toBe('number');
      expect(typeof result.userId).toBe('number');
      expect(typeof result.productId).toBe('number');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });

    it('should verify parameter validation and data transformation', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const mockExistingReview = {
        id: 1,
        rating: new Decimal(4),
        comment: 'Test',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      await service.deleteReview(deleteReviewData);

      expect(mockPlainToInstance).toHaveBeenCalledWith(DeleteReviewDto, deleteReviewData);
      expect(mockValidateOrReject).toHaveBeenCalledWith(deleteReviewData);
    });

    it('should verify service method call count', async () => {
      const deleteReviewData: DeleteReviewDto = { reviewId: 1, userId: 1 };
      const mockExistingReview = {
        id: 1,
        rating: new Decimal(4),
        comment: 'Test',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      };
      const mockDeletedReview = {
        ...mockExistingReview,
        deletedAt: new Date('2024-01-03'),
      };

      mockPrismaClient.review.findFirst.mockResolvedValue(mockExistingReview);
      mockPrismaClient.review.update.mockResolvedValue(mockDeletedReview);

      await service.deleteReview(deleteReviewData);

      expect(mockPrismaClient.review.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.review.update).toHaveBeenCalledTimes(1);
      expect(mockPlainToInstance).toHaveBeenCalledTimes(1);
      expect(mockValidateOrReject).toHaveBeenCalledTimes(1);
    });
  });
});
