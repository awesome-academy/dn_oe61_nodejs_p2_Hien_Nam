import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { I18nService } from 'nestjs-i18n';
import { of } from 'rxjs';
import { UserProductService } from '../../src/product/user/user-product.service';
import { DeleteReviewDto } from '@app/common/dto/product/requests/delete-review.dto';
import { DeleteReviewResponse } from '@app/common/dto/product/response/delete-review.response';
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

describe('UserProductService - deleteReview', () => {
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

    // Create mock clients
    mockProductClient = {
      send: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
      connect: jest.fn(),
    } as unknown as ClientProxy;

    mockNotificationClient = {
      send: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
      connect: jest.fn(),
    } as unknown as ClientProxy;

    // Create mock services
    mockI18nService = {
      translate: jest.fn().mockReturnValue('Translated message'),
    } as unknown as I18nService;

    mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as CustomLogger;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      deleteByPattern: jest.fn(),
    } as unknown as CacheService;

    mockUpstashCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      deleteByPattern: jest.fn(),
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

  describe('successful scenarios', () => {
    it('should delete review successfully', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 1,
        rating: 4.5,
        comment: 'Great product!',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      const mockObservable = of(mockDeleteReviewResponse);
      (mockProductClient.send as jest.Mock) = jest.fn().mockReturnValue(mockObservable);
      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockObservable,
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: 3000,
          retries: 2,
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockDeleteReviewResponse,
      );
      expect(result).toEqual(mockBaseResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data?.id).toBe(1);
      expect(result.data?.deletedAt).toBeInstanceOf(Date);
    });

    it('should delete review with null updatedAt', async () => {
      // Arrange
      const reviewId = 2;
      const userId = 1;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 2,
        rating: 3.0,
        comment: 'Average product',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: null,
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 2,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(result.data?.updatedAt).toBeNull();
      expect(result.data?.deletedAt).toBeInstanceOf(Date);
      expect(result.data?.id).toBe(2);
    });

    it('should delete review without comment', async () => {
      // Arrange
      const reviewId = 3;
      const userId = 1;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 3,
        rating: 5.0,
        comment: undefined,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 3,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(result.data?.comment).toBeUndefined();
      expect(result.data?.rating).toBe(5.0);
      expect(result.data?.deletedAt).toBeInstanceOf(Date);
    });

    it('should handle different user IDs', async () => {
      // Arrange
      const reviewId = 4;
      const userId = 999;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 4,
        rating: 2.5,
        comment: 'Not satisfied',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 999,
        productId: 4,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      const mockObservable = of(mockDeleteReviewResponse);
      (mockProductClient.send as jest.Mock) = jest.fn().mockReturnValue(mockObservable);
      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(result.data?.userId).toBe(999);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockObservable,
        PRODUCT_SERVICE,
        mockLoggerService,
        expect.objectContaining({
          timeoutMs: 3000,
          retries: 2,
        }),
      );
    });

    it('should handle high review and user IDs', async () => {
      // Arrange
      const reviewId = 999999;
      const userId = 888888;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: reviewId,
        rating: 1.0,
        comment: 'Terrible product',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: userId,
        productId: 5,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(result.data?.id).toBe(reviewId);
      expect(result.data?.userId).toBe(userId);
    });
  });

  describe('error scenarios', () => {
    it('should throw BadRequestException when callMicroservice returns null', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const errorMessage = 'Delete failed message';

      mockCallMicroservice.mockResolvedValue(null);
      jest.spyOn(mockI18nService, 'translate').mockReturnValue(errorMessage);

      // Act & Assert
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(BadRequestException);
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(errorMessage);
      const translateSpy = jest.spyOn(mockI18nService, 'translate');
      expect(translateSpy).toHaveBeenCalledWith('review.errors.deleteFailed');
    });

    it('should throw BadRequestException when callMicroservice returns undefined', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const errorMessage = 'Delete failed message';

      mockCallMicroservice.mockResolvedValue(undefined);
      jest.spyOn(mockI18nService, 'translate').mockReturnValue(errorMessage);

      // Act & Assert
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(BadRequestException);
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(errorMessage);
      const translateSpy = jest.spyOn(mockI18nService, 'translate');
      expect(translateSpy).toHaveBeenCalledWith('review.errors.deleteFailed');
    });

    it('should propagate BadRequestException from callMicroservice', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const errorMessage = 'Review not found';

      mockCallMicroservice.mockRejectedValue(new BadRequestException(errorMessage));

      // Act & Assert
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(BadRequestException);
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(errorMessage);
    });

    it('should handle generic microservice errors', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const genericError = new Error('Microservice connection failed');

      mockCallMicroservice.mockRejectedValue(genericError);

      // Act & Assert
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(
        'Microservice connection failed',
      );
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const timeoutError = new Error('Request timeout');

      mockCallMicroservice.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow('Request timeout');
    });

    it('should handle I18n service errors', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;

      mockCallMicroservice.mockResolvedValue(null);
      const mockTranslate = jest.fn().mockImplementation(() => {
        throw new Error('I18n service error');
      });
      (mockI18nService.translate as jest.Mock) = mockTranslate;

      // Act & Assert
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow('I18n service error');
    });
  });

  describe('edge cases', () => {
    it('should handle zero review ID', async () => {
      // Arrange
      const reviewId = 0;
      const userId = 1;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 0,
        rating: 3.5,
        comment: 'Test review',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(result.data?.id).toBe(0);
    });

    it('should handle zero user ID', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 0;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 1,
        rating: 4.0,
        comment: 'Good product',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 0,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(result.data?.userId).toBe(0);
    });

    it('should handle very long comment in response', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const longComment = 'A'.repeat(1000);
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 1,
        rating: 3.0,
        comment: longComment,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(result.data?.comment).toBe(longComment);
      expect(result.data?.comment?.length).toBe(1000);
    });

    it('should handle special characters in comment', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const specialComment = '🎉 Great product! 特別な商品 @#$%^&*()';
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 1,
        rating: 4.8,
        comment: specialComment,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(result.data?.comment).toBe(specialComment);
    });

    it('should handle negative review ID', async () => {
      // Arrange
      const reviewId = -1;
      const userId = 1;
      const errorMessage = 'Invalid review ID';

      mockCallMicroservice.mockRejectedValue(new BadRequestException(errorMessage));

      // Act & Assert
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(BadRequestException);
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(errorMessage);
    });

    it('should handle negative user ID', async () => {
      // Arrange
      const reviewId = 1;
      const userId = -1;
      const errorMessage = 'Invalid user ID';

      mockCallMicroservice.mockRejectedValue(new BadRequestException(errorMessage));

      // Act & Assert
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(BadRequestException);
      await expect(service.deleteReview(reviewId, userId)).rejects.toThrow(errorMessage);
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple concurrent delete requests', async () => {
      // Arrange
      const mockDeleteReviewResponse1: DeleteReviewResponse = {
        id: 1,
        rating: 4.0,
        comment: 'First review',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockDeleteReviewResponse2: DeleteReviewResponse = {
        id: 2,
        rating: 3.5,
        comment: 'Second review',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 2,
      };
      const mockBaseResponse1: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse1,
      };
      const mockBaseResponse2: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse2,
      };

      mockCallMicroservice
        .mockResolvedValueOnce(mockDeleteReviewResponse1)
        .mockResolvedValueOnce(mockDeleteReviewResponse2);
      mockBuildBaseResponse
        .mockReturnValueOnce(mockBaseResponse1)
        .mockReturnValueOnce(mockBaseResponse2);

      // Act
      const [result1, result2] = await Promise.all([
        service.deleteReview(1, 1),
        service.deleteReview(2, 1),
      ]);

      // Assert
      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(result1.data?.id).toBe(1);
      expect(result2.data?.id).toBe(2);
    });
  });

  describe('method verification', () => {
    it('should verify correct method signature and return type', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 1,
        rating: 4.0,
        comment: 'Test review',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteReview(reviewId, userId);

      // Assert
      expect(typeof service.deleteReview).toBe('function');
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('rating');
      expect(result.data).toHaveProperty('createdAt');
      expect(result.data).toHaveProperty('updatedAt');
      expect(result.data).toHaveProperty('deletedAt');
      expect(result.data).toHaveProperty('userId');
      expect(result.data).toHaveProperty('productId');
      expect(typeof result.data?.id).toBe('number');
      expect(typeof result.data?.rating).toBe('number');
      expect(result.data?.createdAt).toBeInstanceOf(Date);
      expect(result.data?.deletedAt).toBeInstanceOf(Date);
    });

    it('should verify parameter validation and microservice call structure', async () => {
      // Arrange
      const reviewId = 123;
      const userId = 456;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 123,
        rating: 4.0,
        comment: 'Test review',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 456,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      const mockObservable = of(mockDeleteReviewResponse);
      (mockProductClient.send as jest.Mock) = jest.fn().mockReturnValue(mockObservable);
      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      await service.deleteReview(reviewId, userId);

      // Assert
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockObservable,
        PRODUCT_SERVICE,
        mockLoggerService,
        expect.objectContaining({
          timeoutMs: 3000,
          retries: 2,
        }),
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockDeleteReviewResponse,
      );
    });

    it('should verify service method is called exactly once per request', async () => {
      // Arrange
      const reviewId = 1;
      const userId = 1;
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 1,
        rating: 4.0,
        comment: 'Test review',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 1,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      await service.deleteReview(reviewId, userId);

      // Assert
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockBuildBaseResponse).toHaveBeenCalledTimes(1);
    });

    it('should verify DeleteReviewDto structure is passed correctly', async () => {
      // Arrange
      const reviewId = 789;
      const userId = 101112;
      const expectedDeleteReviewDto: DeleteReviewDto = {
        reviewId: 789,
        userId: 101112,
      };
      const mockDeleteReviewResponse: DeleteReviewResponse = {
        id: 789,
        rating: 4.0,
        comment: 'Test review',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-03T00:00:00Z'),
        userId: 101112,
        productId: 1,
      };
      const mockBaseResponse: BaseResponse<DeleteReviewResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: mockDeleteReviewResponse,
      };

      // Mock the client.send method to capture the data
      const mockSendResult = of(mockDeleteReviewResponse);
      const sendSpy = jest.spyOn(mockProductClient, 'send').mockReturnValue(mockSendResult);
      mockCallMicroservice.mockResolvedValue(mockDeleteReviewResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      await service.deleteReview(reviewId, userId);

      // Assert
      expect(sendSpy).toHaveBeenCalledWith(ProductPattern.DELETE_REVIEW, expectedDeleteReviewDto);
    });
  });
});
