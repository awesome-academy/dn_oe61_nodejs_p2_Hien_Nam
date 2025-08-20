import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { GetProductReviewsDto } from '@app/common/dto/product/requests/get-product-reviews.dto';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { Decimal } from '@prisma/client/runtime/library';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { NOTIFICATION_SERVICE } from '@app/common';
import { I18nService } from 'nestjs-i18n';
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
describe('ProductService - getProductReviews', () => {
  let service: ProductService;
  let loggerService: CustomLogger;

  const mockPrismaClient = {
    product: { findFirst: jest.fn() },
    review: {},
  };

  const mockPaginationService = {
    queryWithPagination: jest.fn(),
  };
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  } as unknown as CacheService;
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
    mockPlainToInstance.mockImplementation((_cls, obj) => obj as GetProductReviewsDto);
    mockValidateOrReject.mockResolvedValue(undefined);
  });

  describe('successful scenarios', () => {
    it('should get reviews successfully with pagination', async () => {
      const skuId = 'TEST-SKU-001';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockReviews = [
        {
          id: 1,
          rating: new Decimal(4.5),
          comment: 'Great product!',
          userId: 1,
          productId: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          rating: new Decimal(5),
          comment: 'Excellent!',
          userId: 2,
          productId: 1,
          createdAt: new Date('2024-01-02'),
          updatedAt: null,
        },
      ];
      const mockPaginationResult = {
        items: mockReviews,
        paginations: { currentPage: 1, totalPages: 1, pageSize: 10, totalItems: 2, itemsOnPage: 2 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 1,
        rating: 4.5,
        comment: 'Great product!',
        userId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });
      expect(result.items[1]).toEqual({
        id: 2,
        rating: 5,
        comment: 'Excellent!',
        userId: 2,
        productId: 1,
        createdAt: new Date('2024-01-02'),
        updatedAt: undefined,
      });
      expect(result.paginations).toEqual(mockPaginationResult.paginations);
    });

    it('should get empty reviews list', async () => {
      const skuId = 'TEST-SKU-EMPTY';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockPaginationResult = {
        items: [],
        paginations: { currentPage: 1, totalPages: 0, pageSize: 10, totalItems: 0, itemsOnPage: 0 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(result.items).toHaveLength(0);
      expect(result.paginations.totalItems).toBe(0);
    });

    it('should handle reviews with null comments', async () => {
      const skuId = 'TEST-SKU-NULL-COMMENT';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockReviews = [
        {
          id: 1,
          rating: new Decimal(4),
          comment: null,
          userId: 1,
          productId: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: null,
        },
      ];
      const mockPaginationResult = {
        items: mockReviews,
        paginations: { currentPage: 1, totalPages: 1, pageSize: 10, totalItems: 1, itemsOnPage: 1 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(result.items[0].comment).toBe('');
    });

    it('should handle different page sizes', async () => {
      const skuId = 'TEST-SKU-PAGE-SIZE';
      const getReviewsData: GetProductReviewsDto = { page: 2, pageSize: 5 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockPaginationResult = {
        items: [],
        paginations: { currentPage: 2, totalPages: 3, pageSize: 5, totalItems: 12, itemsOnPage: 0 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(result.paginations.currentPage).toBe(2);
      expect(result.paginations.pageSize).toBe(5);
      expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
        mockPrismaClient.review,
        { page: 2, pageSize: 5 },
        {
          where: { productId: 1 },
          orderBy: { createdAt: 'desc' },
        },
      );
    });
  });

  describe('error scenarios', () => {
    it('should throw TypedRpcException when product not found', async () => {
      const skuId = 'INVALID-SKU';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };

      mockPrismaClient.product.findFirst.mockResolvedValue(null);

      await expect(service.getProductReviews(skuId, getReviewsData)).rejects.toThrow(
        TypedRpcException,
      );

      try {
        await service.getProductReviews(skuId, getReviewsData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(rpcError.message).toBe('common.product.error.productNotFound');
      }
    });

    it('should propagate TypedRpcException from validation', async () => {
      const skuId = 'TEST-SKU-VALIDATION-ERROR';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const validationError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'validation.error',
      });

      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.getProductReviews(skuId, getReviewsData)).rejects.toThrow(
        validationError,
      );
    });

    it('should handle database errors and throw internal server error', async () => {
      const skuId = 'TEST-SKU-DB-ERROR';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const dbError = new Error('Database connection failed');

      mockPrismaClient.product.findFirst.mockRejectedValue(dbError);

      await expect(service.getProductReviews(skuId, getReviewsData)).rejects.toThrow(
        TypedRpcException,
      );

      try {
        await service.getProductReviews(skuId, getReviewsData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(rpcError.message).toBe('common.errors.internalServerError');
      }

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(loggerService.error).toHaveBeenCalledWith(
        'GetProductReviews',
        'Database connection failed',
        expect.stringMatching(/.*/),
      );
    });

    it('should handle pagination service errors', async () => {
      const skuId = 'TEST-SKU-PAGINATION-ERROR';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const paginationError = new Error('Pagination failed');

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockRejectedValue(paginationError);

      await expect(service.getProductReviews(skuId, getReviewsData)).rejects.toThrow(
        TypedRpcException,
      );

      try {
        await service.getProductReviews(skuId, getReviewsData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
      }
    });

    it('should handle non-Error exceptions', async () => {
      const skuId = 'TEST-SKU-NON-ERROR';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const nonError = 'String error';

      mockPrismaClient.product.findFirst.mockRejectedValue(nonError);

      await expect(service.getProductReviews(skuId, getReviewsData)).rejects.toThrow(
        TypedRpcException,
      );

      try {
        await service.getProductReviews(skuId, getReviewsData);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
      }

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(loggerService.error).toHaveBeenCalledWith(
        'GetProductReviews',
        'String error',
        undefined,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in skuId', async () => {
      const skuId = 'TEST-SKU-@#$%';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockPaginationResult = {
        items: [],
        paginations: { currentPage: 1, totalPages: 0, pageSize: 10, totalItems: 0, itemsOnPage: 0 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(mockPrismaClient.product.findFirst).toHaveBeenCalledWith({
        where: { skuId: 'TEST-SKU-@#$%', deletedAt: null },
      });
      expect(result.items).toHaveLength(0);
    });

    it('should handle high page numbers', async () => {
      const skuId = 'TEST-SKU-HIGH-PAGE';
      const getReviewsData: GetProductReviewsDto = { page: 999, pageSize: 50 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockPaginationResult = {
        items: [],
        paginations: {
          currentPage: 999,
          totalPages: 999,
          pageSize: 50,
          totalItems: 49950,
          itemsOnPage: 0,
        },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(result.paginations.currentPage).toBe(999);
      expect(result.paginations.pageSize).toBe(50);
    });

    it('should handle decimal ratings correctly', async () => {
      const skuId = 'TEST-SKU-DECIMAL';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockReviews = [
        {
          id: 1,
          rating: new Decimal(3.75),
          comment: 'Good',
          userId: 1,
          productId: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: null,
        },
      ];
      const mockPaginationResult = {
        items: mockReviews,
        paginations: { currentPage: 1, totalPages: 1, pageSize: 10, totalItems: 1, itemsOnPage: 1 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(result.items[0].rating).toBe(3.75);
    });

    it('should handle very long comments', async () => {
      const skuId = 'TEST-SKU-LONG-COMMENT';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const longComment = 'A'.repeat(1000);
      const mockReviews = [
        {
          id: 1,
          rating: new Decimal(4),
          comment: longComment,
          userId: 1,
          productId: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: null,
        },
      ];
      const mockPaginationResult = {
        items: mockReviews,
        paginations: { currentPage: 1, totalPages: 1, pageSize: 10, totalItems: 1, itemsOnPage: 1 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(result.items[0].comment).toBe(longComment);
      expect(result.items[0].comment?.length).toBe(1000);
    });
  });

  describe('method verification', () => {
    it('should verify correct method signature and return type', async () => {
      const skuId = 'TEST-SKU-VERIFY';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockPaginationResult = {
        items: [],
        paginations: { currentPage: 1, totalPages: 0, pageSize: 10, totalItems: 0, itemsOnPage: 0 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getProductReviews(skuId, getReviewsData);

      expect(typeof service.getProductReviews).toBe('function');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('paginations');
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.paginations).toBe('object');
      expect(result.paginations).toHaveProperty('currentPage');
      expect(result.paginations).toHaveProperty('totalPages');
      expect(result.paginations).toHaveProperty('pageSize');
      expect(result.paginations).toHaveProperty('totalItems');
      expect(result.paginations).toHaveProperty('itemsOnPage');
    });

    it('should verify service method calls', async () => {
      const skuId = 'TEST-SKU-CALLS';
      const getReviewsData: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockProduct = { id: 1, skuId, deletedAt: null };
      const mockPaginationResult = {
        items: [],
        paginations: { currentPage: 1, totalPages: 0, pageSize: 10, totalItems: 0, itemsOnPage: 0 },
      };

      mockPrismaClient.product.findFirst.mockResolvedValue(mockProduct);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      await service.getProductReviews(skuId, getReviewsData);

      expect(mockPrismaClient.product.findFirst).toHaveBeenCalledWith({
        where: { skuId: 'TEST-SKU-CALLS', deletedAt: null },
      });
      expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
        mockPrismaClient.review,
        { page: 1, pageSize: 10 },
        {
          where: { productId: 1 },
          orderBy: { createdAt: 'desc' },
        },
      );
    });
  });
});
