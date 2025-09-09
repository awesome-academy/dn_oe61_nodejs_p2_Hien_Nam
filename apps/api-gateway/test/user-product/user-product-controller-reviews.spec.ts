import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UserProductController } from '../../src/product/user/user-product.controller';
import { UserProductService } from '../../src/product/user/user-product.service';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';
import { GetProductReviewsDto } from '@app/common/dto/product/requests/get-product-reviews.dto';
import {
  CreateReviewResponse,
  ReviewResponse,
} from '@app/common/dto/product/response/review-response.dto';
import { DeleteReviewResponse } from '@app/common/dto/product/response/delete-review.response';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { I18nService } from 'nestjs-i18n';
import { BadRequestException } from '@nestjs/common';
import { UserStatus } from '@app/common/enums/user-status.enum';

// Mock User type for testing
interface MockUser {
  name: string;
  id: number;
  userName: string;
  imageUrl: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  status: UserStatus;
  roleId: number;
}

describe('UserProductController - Reviews', () => {
  let controller: UserProductController;

  const mockUserProductService = {
    createReview: jest.fn(),
    getProductReviews: jest.fn(),
    deleteReview: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn().mockReturnValue('Translated message'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProductController],
      providers: [
        {
          provide: UserProductService,
          useValue: mockUserProductService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<UserProductController>(UserProductController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    const mockSkuId: GetByIdProductDto = { skuId: 'TEST-SKU-001' };
    const mockCreateReviewDto: CreateReviewDto = {
      rating: 4.5,
      comment: 'Great product!',
    };
    const mockUser: MockUser = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: null,
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: null,
      deletedAt: null,
      status: UserStatus.ACTIVE,
      roleId: 1,
    };

    describe('successful scenarios', () => {
      it('should create review successfully', async () => {
        // Arrange
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 4.5,
            comment: 'Great product!',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(mockUserProductService.createReview).toHaveBeenCalledTimes(1);
        expect(mockUserProductService.createReview).toHaveBeenCalledWith(
          mockSkuId.skuId,
          mockCreateReviewDto,
          mockUser.id,
        );
        expect(result).toEqual(mockResponse);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data?.rating).toBe(4.5);
      });

      it('should create review with minimum rating', async () => {
        // Arrange
        const minRatingDto: CreateReviewDto = {
          rating: 1,
          comment: 'Not good',
        };
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 2,
            rating: 1,
            comment: 'Not good',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 2,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, minRatingDto, mockUser);

        // Assert
        expect(mockUserProductService.createReview).toHaveBeenCalledWith(
          mockSkuId.skuId,
          minRatingDto,
          mockUser.id,
        );
        expect(result.data?.rating).toBe(1);
      });

      it('should create review without comment', async () => {
        // Arrange
        const noCommentDto: CreateReviewDto = {
          rating: 3,
        };
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 4,
            rating: 3,
            comment: undefined,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 4,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, noCommentDto, mockUser);

        // Assert
        expect(result.data?.comment).toBeUndefined();
        expect(result.data?.rating).toBe(3);
      });
    });

    describe('error scenarios', () => {
      it('should propagate BadRequestException when service throws it', async () => {
        // Arrange
        const errorMessage = 'Product not found';
        mockUserProductService.createReview.mockRejectedValue(
          new BadRequestException(errorMessage),
        );

        // Act & Assert
        await expect(
          controller.createReview(mockSkuId, mockCreateReviewDto, mockUser),
        ).rejects.toThrow(BadRequestException);
        expect(mockUserProductService.createReview).toHaveBeenCalledTimes(1);
      });

      it('should handle generic service errors', async () => {
        // Arrange
        const genericError = new Error('Internal server error');
        mockUserProductService.createReview.mockRejectedValue(genericError);

        // Act & Assert
        await expect(
          controller.createReview(mockSkuId, mockCreateReviewDto, mockUser),
        ).rejects.toThrow('Internal server error');
      });
    });
  });

  describe('getProductReviews', () => {
    const mockSkuId: GetByIdProductDto = { skuId: 'TEST-SKU-001' };
    const mockQuery: GetProductReviewsDto = {
      page: 1,
      pageSize: 10,
    };

    describe('successful scenarios', () => {
      it('should get product reviews successfully with default pagination', async () => {
        // Arrange
        const mockReviews: ReviewResponse[] = [
          {
            id: 1,
            rating: 4.5,
            comment: 'Great product!',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
          {
            id: 2,
            rating: 3.0,
            comment: 'Good product',
            createdAt: new Date('2024-01-02T00:00:00Z'),
            userId: 2,
            productId: 1,
          },
        ];
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: mockReviews,
          paginations: {
            currentPage: 1,
            totalPages: 1,
            pageSize: 10,
            totalItems: 2,
            itemsOnPage: 2,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledTimes(1);
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledWith(mockSkuId, mockQuery);
        expect(result).toEqual(mockResponse);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data?.items).toHaveLength(2);
        expect(result.data?.paginations.totalItems).toBe(2);
      });

      it('should get empty reviews list when no reviews exist', async () => {
        // Arrange
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: [],
          paginations: {
            currentPage: 1,
            totalPages: 0,
            pageSize: 10,
            totalItems: 0,
            itemsOnPage: 0,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(result.data?.items).toHaveLength(0);
        expect(result.data?.paginations.totalItems).toBe(0);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
      });

      it('should get reviews with various rating values', async () => {
        // Arrange
        const mockReviews: ReviewResponse[] = [
          {
            id: 1,
            rating: 1.0,
            comment: 'Poor quality',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
          {
            id: 2,
            rating: 5.0,
            comment: 'Excellent!',
            createdAt: new Date('2024-01-02T00:00:00Z'),
            userId: 2,
            productId: 1,
          },
          {
            id: 3,
            rating: 3.7,
            comment: 'Decent product',
            createdAt: new Date('2024-01-03T00:00:00Z'),
            userId: 3,
            productId: 1,
          },
        ];
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: mockReviews,
          paginations: {
            currentPage: 1,
            totalPages: 1,
            pageSize: 10,
            totalItems: 3,
            itemsOnPage: 3,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(result.data?.items[0]?.rating).toBe(1.0);
        expect(result.data?.items[1]?.rating).toBe(5.0);
        expect(result.data?.items[2]?.rating).toBe(3.7);
      });
    });

    describe('error scenarios', () => {
      it('should propagate BadRequestException when service throws it', async () => {
        // Arrange
        const errorMessage = 'Product not found';
        mockUserProductService.getProductReviews.mockRejectedValue(
          new BadRequestException(errorMessage),
        );

        // Act & Assert
        await expect(controller.getProductReviews(mockSkuId, mockQuery)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledTimes(1);
      });

      it('should handle generic service errors', async () => {
        // Arrange
        const genericError = new Error('Database connection failed');
        mockUserProductService.getProductReviews.mockRejectedValue(genericError);

        // Act & Assert
        await expect(controller.getProductReviews(mockSkuId, mockQuery)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('pagination scenarios', () => {
      it('should handle custom pagination parameters', async () => {
        // Arrange
        const customQuery: GetProductReviewsDto = {
          page: 2,
          pageSize: 5,
        };
        const mockReviews: ReviewResponse[] = [
          {
            id: 6,
            rating: 2.5,
            comment: 'Average product',
            createdAt: new Date('2024-01-06T00:00:00Z'),
            userId: 6,
            productId: 1,
          },
        ];
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: mockReviews,
          paginations: {
            currentPage: 2,
            totalPages: 3,
            pageSize: 5,
            totalItems: 11,
            itemsOnPage: 1,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, customQuery);

        // Assert
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledWith(
          mockSkuId,
          customQuery,
        );
        expect(result.data?.paginations.currentPage).toBe(2);
        expect(result.data?.paginations.pageSize).toBe(5);
        expect(result.data?.paginations.totalPages).toBe(3);
      });
    });

    describe('edge cases', () => {
      it('should handle reviews with undefined comments', async () => {
        // Arrange
        const mockReviews: ReviewResponse[] = [
          {
            id: 1,
            rating: 4.0,
            comment: undefined,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        ];
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: mockReviews,
          paginations: {
            currentPage: 1,
            totalPages: 1,
            pageSize: 10,
            totalItems: 1,
            itemsOnPage: 1,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(result.data?.items[0]?.comment).toBeUndefined();
      });

      it('should handle special characters in skuId', async () => {
        // Arrange
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: [],
          paginations: {
            currentPage: 1,
            totalPages: 0,
            pageSize: 10,
            totalItems: 0,
            itemsOnPage: 0,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledWith(mockSkuId, mockQuery);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('method verification', () => {
      it('should verify correct method signature and return type', async () => {
        // Arrange
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: [],
          paginations: {
            currentPage: 1,
            totalPages: 0,
            pageSize: 10,
            totalItems: 0,
            itemsOnPage: 0,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(typeof controller.getProductReviews).toBe('function');
        expect(result).toHaveProperty('statusKey');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('items');
        expect(result.data).toHaveProperty('paginations');
        expect(result.data?.paginations).toHaveProperty('currentPage');
        expect(result.data?.paginations).toHaveProperty('totalPages');
        expect(result.data?.paginations).toHaveProperty('pageSize');
        expect(result.data?.paginations).toHaveProperty('totalItems');
        expect(result.data?.paginations).toHaveProperty('itemsOnPage');
      });
    });
  });

  describe('deleteReview', () => {
    const mockReviewId = 1;
    const mockUser: MockUser = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: null,
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: null,
      deletedAt: null,
      status: UserStatus.ACTIVE,
      roleId: 1,
    };

    describe('successful scenarios', () => {
      it('should delete review successfully', async () => {
        // Arrange
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 4.5,
            comment: 'Great product!',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(mockReviewId, mockUser);

        // Assert
        expect(mockUserProductService.deleteReview).toHaveBeenCalledTimes(1);
        expect(mockUserProductService.deleteReview).toHaveBeenCalledWith(mockReviewId, mockUser.id);
        expect(result).toEqual(mockResponse);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data?.id).toBe(1);
        expect(result.data?.deletedAt).toBeInstanceOf(Date);
      });

      it('should delete review with null updatedAt', async () => {
        // Arrange
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 2,
            rating: 3.0,
            comment: 'Average product',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: null,
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 2,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(2, mockUser);

        // Assert
        expect(result.data?.updatedAt).toBeNull();
        expect(result.data?.deletedAt).toBeInstanceOf(Date);
        expect(result.data?.id).toBe(2);
      });

      it('should delete review without comment', async () => {
        // Arrange
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 3,
            rating: 5.0,
            comment: undefined,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 3,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(3, mockUser);

        // Assert
        expect(result.data?.comment).toBeUndefined();
        expect(result.data?.rating).toBe(5.0);
        expect(result.data?.deletedAt).toBeInstanceOf(Date);
      });

      it('should handle different user IDs', async () => {
        // Arrange
        const differentUser: MockUser = {
          id: 999,
          name: 'Other User',
          userName: 'otheruser',
          email: 'other@example.com',
          imageUrl: null,
          isActive: true,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: null,
          deletedAt: null,
          status: UserStatus.ACTIVE,
          roleId: 1,
        };
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 4,
            rating: 2.5,
            comment: 'Not satisfied',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 999,
            productId: 4,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(4, differentUser);

        // Assert
        expect(mockUserProductService.deleteReview).toHaveBeenCalledWith(4, differentUser.id);
        expect(result.data?.userId).toBe(999);
      });

      it('should handle high review IDs', async () => {
        // Arrange
        const highReviewId = 999999;
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: highReviewId,
            rating: 1.0,
            comment: 'Terrible product',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 5,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(highReviewId, mockUser);

        // Assert
        expect(mockUserProductService.deleteReview).toHaveBeenCalledWith(highReviewId, mockUser.id);
        expect(result.data?.id).toBe(highReviewId);
      });
    });

    describe('error scenarios', () => {
      it('should propagate BadRequestException when service throws it', async () => {
        // Arrange
        const errorMessage = 'Review not found';
        mockUserProductService.deleteReview.mockRejectedValue(
          new BadRequestException(errorMessage),
        );

        // Act & Assert
        await expect(controller.deleteReview(mockReviewId, mockUser)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockUserProductService.deleteReview).toHaveBeenCalledTimes(1);
        expect(mockUserProductService.deleteReview).toHaveBeenCalledWith(mockReviewId, mockUser.id);
      });

      it('should propagate BadRequestException for unauthorized deletion', async () => {
        // Arrange
        const errorMessage = 'You can only delete your own reviews';
        mockUserProductService.deleteReview.mockRejectedValue(
          new BadRequestException(errorMessage),
        );

        // Act & Assert
        await expect(controller.deleteReview(mockReviewId, mockUser)).rejects.toThrow(
          BadRequestException,
        );
        await expect(controller.deleteReview(mockReviewId, mockUser)).rejects.toThrow(
          'You can only delete your own reviews',
        );
      });

      it('should handle generic service errors', async () => {
        // Arrange
        const genericError = new Error('Database connection failed');
        mockUserProductService.deleteReview.mockRejectedValue(genericError);

        // Act & Assert
        await expect(controller.deleteReview(mockReviewId, mockUser)).rejects.toThrow(
          'Database connection failed',
        );
        expect(mockUserProductService.deleteReview).toHaveBeenCalledTimes(1);
      });

      it('should handle service timeout errors', async () => {
        // Arrange
        const timeoutError = new Error('Request timeout');
        mockUserProductService.deleteReview.mockRejectedValue(timeoutError);

        // Act & Assert
        await expect(controller.deleteReview(mockReviewId, mockUser)).rejects.toThrow(
          'Request timeout',
        );
      });

      it('should handle null service response', async () => {
        // Arrange
        mockUserProductService.deleteReview.mockResolvedValue(null);

        // Act
        const result = await controller.deleteReview(mockReviewId, mockUser);

        // Assert
        expect(result).toBeNull();
        expect(mockUserProductService.deleteReview).toHaveBeenCalledWith(mockReviewId, mockUser.id);
      });

      it('should handle undefined service response', async () => {
        // Arrange
        mockUserProductService.deleteReview.mockResolvedValue(undefined);

        // Act
        const result = await controller.deleteReview(mockReviewId, mockUser);

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle zero review ID', async () => {
        // Arrange
        const zeroReviewId = 0;
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 0,
            rating: 3.5,
            comment: 'Test review',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(zeroReviewId, mockUser);

        // Assert
        expect(mockUserProductService.deleteReview).toHaveBeenCalledWith(zeroReviewId, mockUser.id);
        expect(result.data?.id).toBe(0);
      });

      it('should handle negative review ID', async () => {
        // Arrange
        const negativeReviewId = -1;
        const errorMessage = 'Invalid review ID';
        mockUserProductService.deleteReview.mockRejectedValue(
          new BadRequestException(errorMessage),
        );

        // Act & Assert
        await expect(controller.deleteReview(negativeReviewId, mockUser)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should handle user with zero ID', async () => {
        // Arrange
        const userWithZeroId: MockUser = {
          id: 0,
          name: 'Zero User',
          userName: 'zerouser',
          email: 'zero@example.com',
          imageUrl: null,
          isActive: true,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: null,
          deletedAt: null,
          status: UserStatus.ACTIVE,
          roleId: 1,
        };
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 4.0,
            comment: 'Good product',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 0,
            productId: 1,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(mockReviewId, userWithZeroId);

        // Assert
        expect(mockUserProductService.deleteReview).toHaveBeenCalledWith(
          mockReviewId,
          userWithZeroId.id,
        );
        expect(result.data?.userId).toBe(0);
      });

      it('should handle very long comment in response', async () => {
        // Arrange
        const longComment = 'A'.repeat(1000);
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 3.0,
            comment: longComment,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(mockReviewId, mockUser);

        // Assert
        expect(result.data?.comment).toBe(longComment);
        expect(result.data?.comment?.length).toBe(1000);
      });

      it('should handle special characters in comment', async () => {
        // Arrange
        const specialComment = '🎉 Great product! 特別な商品 @#$%^&*()';
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 4.8,
            comment: specialComment,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(mockReviewId, mockUser);

        // Assert
        expect(result.data?.comment).toBe(specialComment);
      });
    });

    describe('concurrent operations', () => {
      it('should handle multiple concurrent delete requests', async () => {
        // Arrange
        const mockResponse1: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 4.0,
            comment: 'First review',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        const mockResponse2: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 2,
            rating: 3.5,
            comment: 'Second review',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 2,
          },
        };
        mockUserProductService.deleteReview
          .mockResolvedValueOnce(mockResponse1)
          .mockResolvedValueOnce(mockResponse2);

        // Act
        const [result1, result2] = await Promise.all([
          controller.deleteReview(1, mockUser),
          controller.deleteReview(2, mockUser),
        ]);

        // Assert
        expect(mockUserProductService.deleteReview).toHaveBeenCalledTimes(2);
        expect(result1.data?.id).toBe(1);
        expect(result2.data?.id).toBe(2);
      });
    });

    describe('method verification', () => {
      it('should verify correct method signature and return type', async () => {
        // Arrange
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 4.0,
            comment: 'Test review',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.deleteReview(mockReviewId, mockUser);

        // Assert
        expect(typeof controller.deleteReview).toBe('function');
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

      it('should verify parameter types and method calls', async () => {
        // Arrange
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 4.0,
            comment: 'Test review',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        await controller.deleteReview(mockReviewId, mockUser);

        // Assert
        expect(mockUserProductService.deleteReview).toHaveBeenCalledWith(mockReviewId, mockUser.id);
      });

      it('should verify service method is called exactly once per request', async () => {
        // Arrange
        const mockResponse: BaseResponse<DeleteReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 1,
            rating: 4.0,
            comment: 'Test review',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-02T00:00:00Z'),
            deletedAt: new Date('2024-01-03T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
        };
        mockUserProductService.deleteReview.mockResolvedValue(mockResponse);

        // Act
        await controller.deleteReview(mockReviewId, mockUser);

        // Assert
        expect(mockUserProductService.deleteReview).toHaveBeenCalledTimes(1);
      });
    });
  });
});
