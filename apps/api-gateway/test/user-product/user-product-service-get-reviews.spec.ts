import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { I18nService } from 'nestjs-i18n';
import { of, throwError } from 'rxjs';
import { UserProductService } from '../../src/product/user/user-product.service';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { GetProductReviewsDto } from '@app/common/dto/product/requests/get-product-reviews.dto';
import { ReviewResponse } from '@app/common/dto/product/response/review-response.dto';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { CacheService } from '@app/common/cache/cache.service';
import { UpstashCacheService } from '@app/common/cache/upstash-cache/upstash-cache.service';
import { NOTIFICATION_SERVICE, PRODUCT_SERVICE } from '@app/common';

// Mock the external dependencies
jest.mock('@app/common/helpers/microservices');
jest.mock('@app/common/utils/data.util');

const mockCallMicroservice = jest.fn();
const mockBuildBaseResponse = jest.fn();

// Import after mocking
import { callMicroservice } from '@app/common/helpers/microservices';
import { buildBaseResponse } from '@app/common/utils/data.util';

// Cast mocked functions
const mockedCallMicroservice = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
const mockedBuildBaseResponse = buildBaseResponse as jest.MockedFunction<typeof buildBaseResponse>;

describe('UserProductService - getProductReviews', () => {
  let service: UserProductService;
  let mockProductClient: ClientProxy;
  let mockNotificationClient: ClientProxy;
  let mockI18nService: I18nService;
  let mockLoggerService: CustomLogger;
  let mockCacheService: CacheService;
  let mockUpstashCacheService: UpstashCacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCallMicroservice.mockClear();
    mockBuildBaseResponse.mockClear();

    mockedCallMicroservice.mockImplementation(mockCallMicroservice);
    mockedBuildBaseResponse.mockImplementation(mockBuildBaseResponse);

    mockProductClient = { send: jest.fn() } as unknown as ClientProxy;
    mockNotificationClient = { send: jest.fn() } as unknown as ClientProxy;
    mockI18nService = {
      translate: jest.fn().mockReturnValue('Fetch reviews failed'),
    } as unknown as I18nService;
    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as CustomLogger;
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    } as unknown as CacheService;
    mockUpstashCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    } as unknown as UpstashCacheService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProductService,
        { provide: PRODUCT_SERVICE, useValue: mockProductClient },
        { provide: NOTIFICATION_SERVICE, useValue: mockNotificationClient },
        { provide: I18nService, useValue: mockI18nService },
        { provide: CustomLogger, useValue: mockLoggerService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: UpstashCacheService, useValue: mockUpstashCacheService },
      ],
    }).compile();

    service = module.get<UserProductService>(UserProductService);
  });

  describe('successful scenarios', () => {
    it('should get reviews successfully with pagination', async () => {
      const skuId: GetByIdProductDto = { skuId: 'TEST-SKU-001' };
      const query: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockReviews: ReviewResponse[] = [
        { id: 1, rating: 4.5, comment: 'Great!', createdAt: new Date(), userId: 1, productId: 1 },
        { id: 2, rating: 5, comment: 'Excellent!', createdAt: new Date(), userId: 2, productId: 1 },
      ];
      const mockPaginationResult: PaginationResult<ReviewResponse> = {
        items: mockReviews,
        paginations: { currentPage: 1, totalPages: 1, pageSize: 10, totalItems: 2, itemsOnPage: 2 },
      };
      const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
        statusKey: StatusKey.SUCCESS,
        data: mockPaginationResult,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockPaginationResult));
      mockCallMicroservice.mockResolvedValue(mockPaginationResult);
      mockBuildBaseResponse.mockReturnValue(mockResponse);

      const result = await service.getProductReviews(skuId, query);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProductClient.send).toHaveBeenCalledWith(ProductPattern.GET_PRODUCT_REVIEWS, {
        ...query,
        skuId: 'TEST-SKU-001',
      });
      expect(result.data?.items).toHaveLength(2);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should get empty reviews list', async () => {
      const skuId: GetByIdProductDto = { skuId: 'TEST-SKU-EMPTY' };
      const query: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockPaginationResult: PaginationResult<ReviewResponse> = {
        items: [],
        paginations: { currentPage: 1, totalPages: 0, pageSize: 10, totalItems: 0, itemsOnPage: 0 },
      };
      const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
        statusKey: StatusKey.SUCCESS,
        data: mockPaginationResult,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockPaginationResult));
      mockCallMicroservice.mockResolvedValue(mockPaginationResult);
      mockBuildBaseResponse.mockReturnValue(mockResponse);

      const result = await service.getProductReviews(skuId, query);

      expect(result.data?.items).toHaveLength(0);
      expect(result.data?.paginations.totalItems).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should throw BadRequestException when callMicroservice returns null', async () => {
      const skuId: GetByIdProductDto = { skuId: 'TEST-SKU-NULL' };
      const query: GetProductReviewsDto = { page: 1, pageSize: 10 };

      mockProductClient.send = jest.fn().mockReturnValue(of(null));
      mockCallMicroservice.mockResolvedValue(null);

      await expect(service.getProductReviews(skuId, query)).rejects.toThrow(BadRequestException);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith('review.errors.fetchFailed');
    });

    it('should propagate microservice errors', async () => {
      const skuId: GetByIdProductDto = { skuId: 'TEST-SKU-ERROR' };
      const query: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const error = new Error('Microservice error');

      mockProductClient.send = jest.fn().mockReturnValue(throwError(() => error));
      mockCallMicroservice.mockRejectedValue(error);

      await expect(service.getProductReviews(skuId, query)).rejects.toThrow('Microservice error');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in skuId', async () => {
      const skuId: GetByIdProductDto = { skuId: 'TEST-SKU-@#$%' };
      const query: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockPaginationResult: PaginationResult<ReviewResponse> = {
        items: [],
        paginations: { currentPage: 1, totalPages: 0, pageSize: 10, totalItems: 0, itemsOnPage: 0 },
      };
      const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
        statusKey: StatusKey.SUCCESS,
        data: mockPaginationResult,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockPaginationResult));
      mockCallMicroservice.mockResolvedValue(mockPaginationResult);
      mockBuildBaseResponse.mockReturnValue(mockResponse);

      const result = await service.getProductReviews(skuId, query);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProductClient.send).toHaveBeenCalledWith(ProductPattern.GET_PRODUCT_REVIEWS, {
        ...query,
        skuId: 'TEST-SKU-@#$%',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle high page numbers', async () => {
      const skuId: GetByIdProductDto = { skuId: 'TEST-SKU-HIGH-PAGE' };
      const query: GetProductReviewsDto = { page: 999, pageSize: 50 };
      const mockPaginationResult: PaginationResult<ReviewResponse> = {
        items: [],
        paginations: {
          currentPage: 999,
          totalPages: 999,
          pageSize: 50,
          totalItems: 49950,
          itemsOnPage: 0,
        },
      };
      const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
        statusKey: StatusKey.SUCCESS,
        data: mockPaginationResult,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockPaginationResult));
      mockCallMicroservice.mockResolvedValue(mockPaginationResult);
      mockBuildBaseResponse.mockReturnValue(mockResponse);

      const result = await service.getProductReviews(skuId, query);

      expect(result.data?.paginations.currentPage).toBe(999);
      expect(result.data?.paginations.pageSize).toBe(50);
    });
  });

  describe('method verification', () => {
    it('should verify correct method signature and return type', async () => {
      const skuId: GetByIdProductDto = { skuId: 'TEST-SKU-VERIFY' };
      const query: GetProductReviewsDto = { page: 1, pageSize: 10 };
      const mockPaginationResult: PaginationResult<ReviewResponse> = {
        items: [],
        paginations: { currentPage: 1, totalPages: 0, pageSize: 10, totalItems: 0, itemsOnPage: 0 },
      };
      const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
        statusKey: StatusKey.SUCCESS,
        data: mockPaginationResult,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockPaginationResult));
      mockCallMicroservice.mockResolvedValue(mockPaginationResult);
      mockBuildBaseResponse.mockReturnValue(mockResponse);

      const result = await service.getProductReviews(skuId, query);

      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('paginations');
      expect(Array.isArray(result.data?.items)).toBe(true);
    });
  });
});
