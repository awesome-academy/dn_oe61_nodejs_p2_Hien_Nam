import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { I18nService } from 'nestjs-i18n';
import { of, throwError } from 'rxjs';
import { UserProductService } from '../../src/product/user/user-product.service';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';
import { CreateReviewResponse } from '@app/common/dto/product/response/review-response.dto';
import { BaseResponse } from '@app/common/interfaces/data-type';
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

describe('UserProductService - createReview', () => {
  let service: UserProductService;
  let mockProductClient: ClientProxy;
  let mockNotificationClient: ClientProxy;
  let mockI18nService: I18nService;
  let mockLoggerService: CustomLogger;
  let mockCacheService: CacheService;
  let mockUpstashCacheService: UpstashCacheService;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockCallMicroservice.mockClear();
    mockBuildBaseResponse.mockClear();

    // Mock implementations
    mockedCallMicroservice.mockImplementation(mockCallMicroservice);
    mockedBuildBaseResponse.mockImplementation(mockBuildBaseResponse);

    // Create mock clients and services
    mockProductClient = {
      send: jest.fn(),
    } as unknown as ClientProxy;

    mockNotificationClient = {
      send: jest.fn(),
    } as unknown as ClientProxy;

    mockI18nService = {
      translate: jest.fn().mockReturnValue('Review creation failed'),
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
      deleteByPattern: jest.fn().mockResolvedValue(0),
      generateKey: jest.fn(),
    } as unknown as CacheService;

    mockUpstashCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deleteByPattern: jest.fn().mockResolvedValue(0),
      generateKey: jest.fn(),
    } as unknown as UpstashCacheService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProductService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClient,
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
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: UpstashCacheService,
          useValue: mockUpstashCacheService,
        },
      ],
    }).compile();

    service = module.get<UserProductService>(UserProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful scenarios', () => {
    it('should create review successfully with all fields', async () => {
      // Arrange
      const skuId = 'TEST-SKU-001';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4.5,
        comment: 'Great product!',
      };
      const expectedReviewData = {
        ...createReviewDto,
        userId,
        skuId,
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 4.5,
        comment: 'Great product!',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProductClient.send).toHaveBeenCalledTimes(1);
      // Verify cache invalidation is called when result exists
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCacheService.deleteByPattern).toHaveBeenCalledWith('user_products:*');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockUpstashCacheService.deleteByPattern).toHaveBeenCalledWith(
        'user_product_details:*',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.CREATE_REVIEW,
        expectedReviewData,
      );
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(), // Observable from productClient.send
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: 3000, // TIMEOUT_MS_DEFAULT
          retries: 2, // RETRIES_DEFAULT
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledTimes(1);
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockCreateReviewResponse,
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should create review successfully with minimum rating', async () => {
      // Arrange
      const skuId = 'TEST-SKU-002';
      const userId = 2;
      const createReviewDto: CreateReviewDto = {
        rating: 1,
        comment: 'Not satisfied',
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 2,
        rating: 1,
        comment: 'Not satisfied',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 2,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(result.data?.rating).toBe(1);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should create review successfully with maximum rating', async () => {
      // Arrange
      const skuId = 'TEST-SKU-003';
      const userId = 3;
      const createReviewDto: CreateReviewDto = {
        rating: 5,
        comment: 'Excellent!',
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 3,
        rating: 5,
        comment: 'Excellent!',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 3,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(result.data?.rating).toBe(5);
      expect(result.data?.comment).toBe('Excellent!');
    });

    it('should create review successfully without comment', async () => {
      // Arrange
      const skuId = 'TEST-SKU-004';
      const userId = 4;
      const createReviewDto: CreateReviewDto = {
        rating: 3,
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 4,
        rating: 3,
        comment: undefined,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 4,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(result.data?.comment).toBeUndefined();
      expect(result.data?.rating).toBe(3);
    });

    it('should create review successfully with decimal rating', async () => {
      // Arrange
      const skuId = 'TEST-SKU-005';
      const userId = 5;
      const createReviewDto: CreateReviewDto = {
        rating: 3.7,
        comment: 'Good product',
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 5,
        rating: 3.7,
        comment: 'Good product',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 5,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(result.data?.rating).toBe(3.7);
    });
  });

  describe('error scenarios', () => {
    it('should throw BadRequestException when callMicroservice returns null', async () => {
      // Arrange
      const skuId = 'TEST-SKU-NULL';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'Test comment',
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(null));
      mockCallMicroservice.mockResolvedValue(null);
      mockI18nService.translate = jest.fn().mockReturnValue('Review creation failed');

      // Act & Assert
      await expect(service.createReview(skuId, createReviewDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createReview(skuId, createReviewDto, userId)).rejects.toThrow(
        'Review creation failed',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockI18nService.translate).toHaveBeenCalledWith('review.errors.createFailed');
      // Verify cache is NOT cleared when result is null
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCacheService.deleteByPattern).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockUpstashCacheService.deleteByPattern).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when callMicroservice returns undefined', async () => {
      // Arrange
      const skuId = 'TEST-SKU-UNDEFINED';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'Test comment',
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(undefined));
      mockCallMicroservice.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.createReview(skuId, createReviewDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate error when callMicroservice throws error', async () => {
      // Arrange
      const skuId = 'TEST-SKU-ERROR';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'Test comment',
      };
      const microserviceError = new Error('Microservice error');

      mockProductClient.send = jest.fn().mockReturnValue(throwError(() => microserviceError));
      mockCallMicroservice.mockRejectedValue(microserviceError);

      // Act & Assert
      await expect(service.createReview(skuId, createReviewDto, userId)).rejects.toThrow(
        'Microservice error',
      );
    });

    it('should propagate BadRequestException from microservice', async () => {
      // Arrange
      const skuId = 'TEST-SKU-BAD-REQUEST';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'Test comment',
      };
      const badRequestError = new BadRequestException('Product not found');

      mockProductClient.send = jest.fn().mockReturnValue(throwError(() => badRequestError));
      mockCallMicroservice.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(service.createReview(skuId, createReviewDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createReview(skuId, createReviewDto, userId)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should handle timeout errors from microservice', async () => {
      // Arrange
      const skuId = 'TEST-SKU-TIMEOUT';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'Test comment',
      };
      const timeoutError = new Error('Request timeout');

      mockProductClient.send = jest.fn().mockReturnValue(throwError(() => timeoutError));
      mockCallMicroservice.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.createReview(skuId, createReviewDto, userId)).rejects.toThrow(
        'Request timeout',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very long comment', async () => {
      // Arrange
      const skuId = 'TEST-SKU-LONG-COMMENT';
      const userId = 1;
      const longComment = 'A'.repeat(1000);
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: longComment,
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 4,
        comment: longComment,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(result.data?.comment).toBe(longComment);
      expect(result.data?.comment?.length).toBe(1000);
    });

    it('should handle special characters in skuId', async () => {
      // Arrange
      const skuId = 'TEST-SKU-@#$%^&*()';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'Special SKU test',
      };
      const expectedReviewData = {
        ...createReviewDto,
        userId,
        skuId,
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 4,
        comment: 'Special SKU test',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.CREATE_REVIEW,
        expectedReviewData,
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle special characters in comment', async () => {
      // Arrange
      const skuId = 'TEST-SKU-SPECIAL-COMMENT';
      const userId = 1;
      const specialComment = 'Great product! 🎉 Very good 👍 5/5 ⭐⭐⭐⭐⭐';
      const createReviewDto: CreateReviewDto = {
        rating: 5,
        comment: specialComment,
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 5,
        comment: specialComment,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(result.data?.comment).toBe(specialComment);
    });

    it('should handle high userId values', async () => {
      // Arrange
      const skuId = 'TEST-SKU-HIGH-USER-ID';
      const userId = 999999;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'High user ID test',
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 4,
        comment: 'High user ID test',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 999999,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(result.data?.userId).toBe(999999);
    });

    it('should handle empty string comment', async () => {
      // Arrange
      const skuId = 'TEST-SKU-EMPTY-COMMENT';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 3,
        comment: '',
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 3,
        comment: '',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(result.data?.comment).toBe('');
    });
  });

  describe('method verification', () => {
    it('should verify correct method signature and return type', async () => {
      // Arrange
      const skuId = 'TEST-SKU-SIGNATURE';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'Signature test',
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 4,
        comment: 'Signature test',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.createReview(skuId, createReviewDto, userId);

      // Assert
      expect(typeof service.createReview).toBe('function');
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('rating');
      expect(result.data).toHaveProperty('comment');
      expect(result.data).toHaveProperty('createdAt');
      expect(result.data).toHaveProperty('userId');
      expect(result.data).toHaveProperty('productId');
    });

    it('should verify parameter validation and data transformation', async () => {
      // Arrange
      const skuId = 'TEST-SKU-PARAMS';
      const userId = 123;
      const createReviewDto: CreateReviewDto = {
        rating: 4.5,
        comment: 'Parameter test',
      };
      const expectedReviewData = {
        rating: 4.5,
        comment: 'Parameter test',
        userId: 123,
        skuId: 'TEST-SKU-PARAMS',
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 4.5,
        comment: 'Parameter test',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 123,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      await service.createReview(skuId, createReviewDto, userId);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.CREATE_REVIEW,
        expectedReviewData,
      );
    });

    it('should verify service method call count and parameters', async () => {
      // Arrange
      const skuId = 'TEST-SKU-CALL-COUNT';
      const userId = 1;
      const createReviewDto: CreateReviewDto = {
        rating: 4,
        comment: 'Call count test',
      };
      const mockCreateReviewResponse: CreateReviewResponse = {
        id: 1,
        rating: 4,
        comment: 'Call count test',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse,
      };

      mockProductClient.send = jest.fn().mockReturnValue(of(mockCreateReviewResponse));
      mockCallMicroservice.mockResolvedValue(mockCreateReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      await service.createReview(skuId, createReviewDto, userId);
      await service.createReview(skuId, createReviewDto, userId);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProductClient.send).toHaveBeenCalledTimes(2);
      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockBuildBaseResponse).toHaveBeenCalledTimes(2);
    });
  });

  describe('concurrent calls', () => {
    it('should handle concurrent createReview calls', async () => {
      // Arrange
      const skuId1 = 'TEST-SKU-CONCURRENT-1';
      const skuId2 = 'TEST-SKU-CONCURRENT-2';
      const userId1 = 1;
      const userId2 = 2;
      const createReviewDto1: CreateReviewDto = {
        rating: 4,
        comment: 'Concurrent test 1',
      };
      const createReviewDto2: CreateReviewDto = {
        rating: 5,
        comment: 'Concurrent test 2',
      };
      const mockCreateReviewResponse1: CreateReviewResponse = {
        id: 1,
        rating: 4,
        comment: 'Concurrent test 1',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockCreateReviewResponse2: CreateReviewResponse = {
        id: 2,
        rating: 5,
        comment: 'Concurrent test 2',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        userId: 2,
        productId: 2,
      };
      const mockBaseResponse1: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse1,
      };
      const mockBaseResponse2: BaseResponse<CreateReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockCreateReviewResponse2,
      };

      mockProductClient.send = jest
        .fn()
        .mockReturnValueOnce(of(mockCreateReviewResponse1))
        .mockReturnValueOnce(of(mockCreateReviewResponse2));
      mockCallMicroservice
        .mockResolvedValueOnce(mockCreateReviewResponse1)
        .mockResolvedValueOnce(mockCreateReviewResponse2);
      mockBuildBaseResponse
        .mockReturnValueOnce(mockBaseResponse1)
        .mockReturnValueOnce(mockBaseResponse2);

      // Act
      const [result1, result2] = await Promise.all([
        service.createReview(skuId1, createReviewDto1, userId1),
        service.createReview(skuId2, createReviewDto2, userId2),
      ]);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockProductClient.send).toHaveBeenCalledTimes(2);
      expect(result1.data?.comment).toBe('Concurrent test 1');
      expect(result2.data?.comment).toBe('Concurrent test 2');
    });
  });
});
