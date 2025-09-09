import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UserProductController } from '../../src/product/user/user-product.controller';
import { UserProductService } from '../../src/product/user/user-product.service';
import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { UserProductResponse } from '@app/common/dto/product/response/product-response';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { ShareUrlProductResponse } from '@app/common/dto/product/response/share-url-product-response';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';
import { GetProductReviewsDto } from '@app/common/dto/product/requests/get-product-reviews.dto';
import {
  CreateReviewResponse,
  ReviewResponse,
} from '@app/common/dto/product/response/review-response.dto';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { ImageRes } from '@app/common/dto/product/response/images-response';
import { CategoryResponse } from '@app/common/dto/product/response/category-response';
import { SizeResponse } from '@app/common/dto/product/response/size-response';
import { Decimal } from '@prisma/client/runtime/library';
import { I18nService } from 'nestjs-i18n';
import { BadRequestException } from '@nestjs/common';
import { User } from 'apps/user-service/generated/prisma';

describe('UserProductController', () => {
  let controller: UserProductController;

  const mockUserProductService = {
    listProductsForUser: jest.fn(),
    getProductDetailForUser: jest.fn(),
    shareProduct: jest.fn(),
    createReview: jest.fn(),
    getProductReviews: jest.fn(),
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

  describe('listProductsForUser', () => {
    const createMockProduct = (id: number, name: string): UserProductResponse => {
      const now = new Date();
      return {
        id,
        name,
        skuId: `SKU${id}`,
        description: `Description for ${name}`,
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal(10.99),
        quantity: 100,
        createdAt: now,
        updatedAt: now,
        deletedAt: undefined,
        images: [
          {
            id: 1,
            url: 'https://example.com/image1.jpg',
            altText: 'Product image',
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          } as ImageRes,
        ],
        variants: [
          {
            id: 1,
            price: 10.99,
            startDate: now,
            endDate: undefined,
            sizeId: 1,
          },
        ],
        categories: [
          {
            id: 1,
            name: 'Food',
            parentId: 0,
            createdAt: now,
            updatedAt: now,
          },
        ],
        reviews: [
          {
            id: 1,
            rating: new Decimal(5),
            comment: 'Great product!',
            createdAt: now,
            updatedAt: now,
            userId: 1,
            productId: id,
          },
        ],
      };
    };
    const createMockResponse = (
      data: UserProductResponse[],
    ): BaseResponse<PaginationResult<UserProductResponse>> => ({
      statusKey: StatusKey.SUCCESS,
      data: {
        items: data,
        paginations: {
          currentPage: 1,
          totalPages: 1,
          pageSize: 50,
          totalItems: data.length,
          itemsOnPage: data.length,
        },
      },
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should return products successfully', async () => {
      const mockProducts = [createMockProduct(1, 'Test Product')];
      const mockResponse = createMockResponse(mockProducts);
      const query: GetAllProductUserDto = { page: 1, pageSize: 50 };

      mockUserProductService.listProductsForUser.mockResolvedValue(mockResponse);

      const result = await controller.listProductsForUser(query);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.data?.items).toHaveLength(1);
      if (result.data?.items && result.data.items.length > 0) {
        const product = result.data.items[0];
        expect(product.name).toBe('Test Product');
      }
    });

    it('should return products with name filter', async () => {
      const query: GetAllProductUserDto = {
        page: 1,
        pageSize: 50,
        name: 'Test Product',
      };

      const mockProducts = [createMockProduct(1, 'Test Product')];
      const mockResponse = createMockResponse(mockProducts);

      mockUserProductService.listProductsForUser.mockResolvedValue(mockResponse);

      const result = await controller.listProductsForUser(query);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
      if (result.data?.items && result.data.items.length > 0) {
        const product = result.data.items[0];
        expect(product.name).toBe('Test Product');
      }
    });

    it('should return empty array when no products found', async () => {
      const mockResponse = createMockResponse([]);
      const query: GetAllProductUserDto = { page: 1, pageSize: 50 };

      mockUserProductService.listProductsForUser.mockResolvedValue(mockResponse);

      const result = await controller.listProductsForUser(query);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
      expect(result.data?.items).toHaveLength(0);
    });

    it('should propagate service errors', async () => {
      const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
      const error = new Error('Service error');

      mockUserProductService.listProductsForUser.mockRejectedValue(error);

      await expect(controller.listProductsForUser(query)).rejects.toThrow('Service error');
      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
    });

    it('should handle service returning empty result', async () => {
      const query: GetAllProductUserDto = {
        page: 1,
        pageSize: 50,
      };

      const emptyResponse: BaseResponse<UserProductResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: [],
      };

      mockUserProductService.listProductsForUser.mockResolvedValue(emptyResponse);

      const result = await controller.listProductsForUser(query);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle filtering by name', async () => {
      const mockProducts = [createMockProduct(1, 'Pizza')];
      const mockResponse = createMockResponse(mockProducts);
      const query: GetAllProductUserDto = { page: 1, pageSize: 50, name: 'Pizza' };

      mockUserProductService.listProductsForUser.mockResolvedValue(mockResponse);

      const result = await controller.listProductsForUser(query);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
      if (result.data?.items && result.data.items.length > 0) {
        const product = result.data.items[0];
        expect(product.name).toBe('Pizza');
      }
    });

    it('should handle filtering by price range', async () => {
      const mockProducts = [createMockProduct(1, 'Expensive Item')];
      const mockResponse = createMockResponse(mockProducts);
      const query: GetAllProductUserDto = {
        page: 1,
        pageSize: 50,
        minPrice: 10,
        maxPrice: 20,
      };

      mockUserProductService.listProductsForUser.mockResolvedValue(mockResponse);

      const result = await controller.listProductsForUser(query);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
      if (result.data?.items && result.data.items.length > 0) {
        const product = result.data.items[0];
        expect(product.basePrice).toBeDefined();
      }
    });

    it('should handle edge case with maximum rating filter', async () => {
      const query: GetAllProductUserDto = {
        page: 1,
        pageSize: 50,
        rating: 5,
      };

      const mockProducts = [createMockProduct(1, 'Test Product')];
      const mockResponse = createMockResponse(mockProducts);

      mockUserProductService.listProductsForUser.mockResolvedValue(mockResponse);

      const result = await controller.listProductsForUser(query);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
      if (result.data?.items && result.data.items.length > 0) {
        const product = result.data.items[0];
        if (product.reviews && product.reviews.length > 0) {
          expect(product.reviews[0].rating).toEqual(new Decimal(5));
        }
      }
    });

    it('should verify correct method signature and return type', async () => {
      const query: GetAllProductUserDto = {
        page: 1,
        pageSize: 50,
      };

      const mockProducts = [createMockProduct(1, 'Test Product')];
      const mockResponse = createMockResponse(mockProducts);

      mockUserProductService.listProductsForUser.mockResolvedValue(mockResponse);

      const result = await controller.listProductsForUser(query);

      // Verify the result structure
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('paginations');
      expect(Array.isArray(result.data?.items)).toBe(true);

      // Verify product structure if data exists
      if (result.data?.items && result.data.items.length > 0) {
        const product = result.data.items[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('skuId');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('description');
        expect(product).toHaveProperty('status');
        expect(product).toHaveProperty('basePrice');
        expect(product).toHaveProperty('quantity');
        expect(product).toHaveProperty('createdAt');
        expect(product).toHaveProperty('updatedAt');
        expect(product).toHaveProperty('deletedAt');
        expect(product).toHaveProperty('images');
        expect(product).toHaveProperty('categories');
        expect(product).toHaveProperty('variants');
        expect(product).toHaveProperty('reviews');
      }
    });

    it('should handle concurrent requests', async () => {
      const mockProducts1 = [createMockProduct(1, 'Product 1')];
      const mockProducts2 = [createMockProduct(2, 'Product 2')];
      const mockResponse1 = createMockResponse(mockProducts1);
      const mockResponse2 = createMockResponse(mockProducts2);
      const query1: GetAllProductUserDto = { page: 1, pageSize: 50, name: 'Product 1' };
      const query2: GetAllProductUserDto = { page: 1, pageSize: 50, name: 'Product 2' };

      mockUserProductService.listProductsForUser
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const [result1, result2] = await Promise.all([
        controller.listProductsForUser(query1),
        controller.listProductsForUser(query2),
      ]);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledTimes(2);
      if (result1.data?.items && result1.data.items.length > 0) {
        const product1 = result1.data.items[0];
        expect(product1.name).toBe('Product 1');
      }
      if (result2.data?.items && result2.data.items.length > 0) {
        const product2 = result2.data.items[0];
        expect(product2.name).toBe('Product 2');
      }
    });
  });

  describe('getProductDetailForUser', () => {
    const createMockProductDetail = (id: number, skuId: string): UserProductDetailResponse => {
      const now = new Date();
      return {
        id,
        name: `Product ${id}`,
        skuId,
        description: `Description for product ${id}`,
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal(25.99),
        quantity: 50,
        createdAt: now,
        updatedAt: now,
        deletedAt: undefined,
        images: [
          {
            id: 1,
            url: 'https://example.com/product-detail.jpg',
            altText: 'Product detail image',
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          } as ImageRes,
        ],
        variants: [
          {
            id: 1,
            price: new Decimal(25.99),
            startDate: now,
            endDate: undefined,
            size: {
              id: '1',
              nameSize: 'Medium',
              description: 'Medium size',
            } as SizeResponse,
          },
        ],
        categories: [
          {
            rootCategory: {
              id: 1,
              name: 'Premium Food',
              parent: 0,
            },
            childCategories: [],
          } as CategoryResponse,
        ],
        reviews: [
          {
            id: 1,
            rating: new Decimal(4.5),
            comment: 'Excellent product quality!',
            createdAt: now,
            updatedAt: now,
            userId: 1,
            productId: id,
          },
        ],
      };
    };

    const createMockDetailResponse = (
      data: UserProductDetailResponse,
    ): BaseResponse<UserProductDetailResponse> => ({
      statusKey: StatusKey.SUCCESS,
      data,
    });

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should return product detail successfully with valid skuId', async () => {
      const skuId = 'SKU123';
      const dto: GetByIdProductDto = { skuId };
      const mockProductDetail = createMockProductDetail(1, skuId);
      const mockResponse = createMockDetailResponse(mockProductDetail);

      mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

      const result = await controller.getProductDetailForUser(dto);

      expect(mockUserProductService.getProductDetailForUser).toHaveBeenCalledWith(dto);
      expect(mockUserProductService.getProductDetailForUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.data?.skuId).toBe(skuId);
      expect(result.data?.name).toBe('Product 1');
    });

    it('should return product detail with all required properties', async () => {
      const skuId = 'SKU456';
      const dto: GetByIdProductDto = { skuId };
      const mockProductDetail = createMockProductDetail(2, skuId);
      const mockResponse = createMockDetailResponse(mockProductDetail);

      mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

      const result = await controller.getProductDetailForUser(dto);

      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('skuId');
      expect(result.data).toHaveProperty('description');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('basePrice');
      expect(result.data).toHaveProperty('quantity');
      expect(result.data).toHaveProperty('images');
      expect(result.data).toHaveProperty('variants');
      expect(result.data).toHaveProperty('categories');
      expect(result.data).toHaveProperty('reviews');
      expect(result.data).toHaveProperty('createdAt');
      expect(result.data).toHaveProperty('updatedAt');
      expect(result.data).toHaveProperty('deletedAt');
    });

    it('should handle product with multiple images', async () => {
      const skuId = 'SKU789';
      const dto: GetByIdProductDto = { skuId };
      const mockProductDetail = createMockProductDetail(3, skuId);
      const now = new Date();

      // Add multiple images
      mockProductDetail.images = [
        {
          id: 1,
          url: 'https://example.com/image1.jpg',
          altText: 'Image 1',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        } as ImageRes,
        {
          id: 2,
          url: 'https://example.com/image2.jpg',
          altText: 'Image 2',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        } as ImageRes,
      ];

      const mockResponse = createMockDetailResponse(mockProductDetail);
      mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

      const result = await controller.getProductDetailForUser(dto);

      expect(result.data?.images).toHaveLength(2);
      expect(result.data?.images[0].url).toBe('https://example.com/image1.jpg');
      expect(result.data?.images[1].url).toBe('https://example.com/image2.jpg');
    });

    it('should handle product with multiple reviews', async () => {
      const skuId = 'SKU101112';
      const dto: GetByIdProductDto = { skuId };
      const mockProductDetail = createMockProductDetail(4, skuId);
      const now = new Date();

      // Add multiple reviews
      mockProductDetail.reviews = [
        {
          id: 1,
          rating: new Decimal(5),
          comment: 'Perfect!',
          createdAt: now,
          updatedAt: now,
          userId: 1,
          productId: 4,
        },
        {
          id: 2,
          rating: new Decimal(4),
          comment: 'Very good',
          createdAt: now,
          updatedAt: now,
          userId: 2,
          productId: 4,
        },
      ];

      const mockResponse = createMockDetailResponse(mockProductDetail);
      mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

      const result = await controller.getProductDetailForUser(dto);

      expect(result.data?.reviews).toHaveLength(2);
      expect(result.data?.reviews[0].rating).toEqual(new Decimal(5));
      expect(result.data?.reviews[1].rating).toEqual(new Decimal(4));
    });

    it('should propagate BadRequestException when product not found', async () => {
      const skuId = 'INVALID_SKU';
      const dto: GetByIdProductDto = { skuId };
      const error = new BadRequestException('Product not found');

      mockUserProductService.getProductDetailForUser.mockRejectedValue(error);

      await expect(controller.getProductDetailForUser(dto)).rejects.toThrow(BadRequestException);
      await expect(controller.getProductDetailForUser(dto)).rejects.toThrow('Product not found');
      expect(mockUserProductService.getProductDetailForUser).toHaveBeenCalledWith(dto);
    });

    it('should propagate generic service errors', async () => {
      const skuId = 'SKU999';
      const dto: GetByIdProductDto = { skuId };
      const error = new Error('Database connection failed');

      mockUserProductService.getProductDetailForUser.mockRejectedValue(error);

      await expect(controller.getProductDetailForUser(dto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockUserProductService.getProductDetailForUser).toHaveBeenCalledWith(dto);
    });

    it('should handle product with empty arrays for optional fields', async () => {
      const skuId = 'SKU_EMPTY';
      const dto: GetByIdProductDto = { skuId };
      const mockProductDetail = createMockProductDetail(5, skuId);

      // Set empty arrays
      mockProductDetail.images = [];
      mockProductDetail.variants = [];
      mockProductDetail.categories = [];
      mockProductDetail.reviews = [];

      const mockResponse = createMockDetailResponse(mockProductDetail);
      mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

      const result = await controller.getProductDetailForUser(dto);

      expect(result.data?.images).toHaveLength(0);
      expect(result.data?.variants).toHaveLength(0);
      expect(result.data?.categories).toHaveLength(0);
      expect(result.data?.reviews).toHaveLength(0);
    });

    it('should handle different product statuses', async () => {
      const testCases = [
        { skuId: 'SKU_IN_STOCK', status: StatusProduct.IN_STOCK },
        { skuId: 'SKU_SOLD_OUT', status: StatusProduct.SOLD_OUT },
        { skuId: 'SKU_PRE_SALE', status: StatusProduct.PRE_SALE },
      ];

      for (const testCase of testCases) {
        const dto: GetByIdProductDto = { skuId: testCase.skuId };
        const mockProductDetail = createMockProductDetail(1, testCase.skuId);
        mockProductDetail.status = testCase.status;
        const mockResponse = createMockDetailResponse(mockProductDetail);

        mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

        const result = await controller.getProductDetailForUser(dto);

        expect(result.data?.status).toBe(testCase.status);
      }
    });

    it('should handle different price values including zero and decimal places', async () => {
      const testCases = [
        { skuId: 'SKU_FREE', price: new Decimal(0) },
        { skuId: 'SKU_DECIMAL', price: new Decimal(19.99) },
        { skuId: 'SKU_HIGH', price: new Decimal(999.99) },
      ];

      for (const testCase of testCases) {
        const dto: GetByIdProductDto = { skuId: testCase.skuId };
        const mockProductDetail = createMockProductDetail(1, testCase.skuId);
        mockProductDetail.basePrice = testCase.price;
        const mockResponse = createMockDetailResponse(mockProductDetail);

        mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

        const result = await controller.getProductDetailForUser(dto);

        expect(result.data?.basePrice).toEqual(testCase.price);
      }
    });

    it('should handle special characters in skuId', async () => {
      const specialSkuIds = ['SKU-123', 'SKU_456', 'SKU.789', 'SKU@ABC'];

      for (const skuId of specialSkuIds) {
        const dto: GetByIdProductDto = { skuId };
        const mockProductDetail = createMockProductDetail(1, skuId);
        const mockResponse = createMockDetailResponse(mockProductDetail);

        mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

        const result = await controller.getProductDetailForUser(dto);

        expect(result.data?.skuId).toBe(skuId);
        expect(mockUserProductService.getProductDetailForUser).toHaveBeenCalledWith(dto);
      }
    });

    it('should verify correct method signature and return type', async () => {
      const skuId = 'SKU_TYPE_CHECK';
      const dto: GetByIdProductDto = { skuId };
      const mockProductDetail = createMockProductDetail(1, skuId);
      const mockResponse = createMockDetailResponse(mockProductDetail);

      mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

      const result = await controller.getProductDetailForUser(dto);

      // Verify the result structure matches BaseResponse<UserProductDetailResponse>
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(typeof result.data).toBe('object');
      expect(result.data).not.toBeNull();
      expect(result.data).not.toBeUndefined();
    });

    it('should handle concurrent requests for different products', async () => {
      const dto1: GetByIdProductDto = { skuId: 'SKU_CONCURRENT_1' };
      const dto2: GetByIdProductDto = { skuId: 'SKU_CONCURRENT_2' };

      const mockProductDetail1 = createMockProductDetail(1, 'SKU_CONCURRENT_1');
      const mockProductDetail2 = createMockProductDetail(2, 'SKU_CONCURRENT_2');

      const mockResponse1 = createMockDetailResponse(mockProductDetail1);
      const mockResponse2 = createMockDetailResponse(mockProductDetail2);

      mockUserProductService.getProductDetailForUser
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const [result1, result2] = await Promise.all([
        controller.getProductDetailForUser(dto1),
        controller.getProductDetailForUser(dto2),
      ]);

      expect(mockUserProductService.getProductDetailForUser).toHaveBeenCalledTimes(2);
      expect(result1.data?.skuId).toBe('SKU_CONCURRENT_1');
      expect(result2.data?.skuId).toBe('SKU_CONCURRENT_2');
    });

    it('should handle timeout errors from service', async () => {
      const skuId = 'SKU_TIMEOUT';
      const dto: GetByIdProductDto = { skuId };
      const timeoutError = new Error('Request timeout');

      mockUserProductService.getProductDetailForUser.mockRejectedValue(timeoutError);

      await expect(controller.getProductDetailForUser(dto)).rejects.toThrow('Request timeout');
      expect(mockUserProductService.getProductDetailForUser).toHaveBeenCalledWith(dto);
    });

    it('should handle null and undefined values in optional fields', async () => {
      const skuId = 'SKU_NULL_VALUES';
      const dto: GetByIdProductDto = { skuId };
      const mockProductDetail = createMockProductDetail(1, skuId);

      // Set optional fields to undefined
      mockProductDetail.description = undefined;
      mockProductDetail.deletedAt = undefined;
      mockProductDetail.createdAt = undefined;
      mockProductDetail.updatedAt = undefined;

      const mockResponse = createMockDetailResponse(mockProductDetail);
      mockUserProductService.getProductDetailForUser.mockResolvedValue(mockResponse);

      const result = await controller.getProductDetailForUser(dto);

      expect(result.data?.description).toBeUndefined();
      expect(result.data?.deletedAt).toBeUndefined();
      expect(result.data?.createdAt).toBeUndefined();
      expect(result.data?.updatedAt).toBeUndefined();
    });
  });

  describe('shareProduct', () => {
    const mockSkuId: GetByIdProductDto = { skuId: 'test-sku-123' };
    const mockShareUrlResponse: ShareUrlProductResponse = {
      messengerShare: 'https://m.me/share?link=https://example.com/product/test-sku-123',
      facebookShare:
        'https://www.facebook.com/sharer/sharer.php?u=https://example.com/product/test-sku-123',
      productUrl: 'https://example.com/product/test-sku-123',
    };
    const mockBaseResponse: BaseResponse<ShareUrlProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockShareUrlResponse,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully share a product and return share URLs', async () => {
      // Arrange
      mockUserProductService.shareProduct.mockResolvedValue(mockBaseResponse);

      // Act
      const result = await controller.shareProduct(mockSkuId);

      // Assert
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(1);
      expect(mockUserProductService.shareProduct).toHaveBeenCalledWith(mockSkuId);
      expect(result).toEqual(mockBaseResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toBeDefined();
      expect(result.data?.messengerShare).toBe(mockShareUrlResponse.messengerShare);
      expect(result.data?.facebookShare).toBe(mockShareUrlResponse.facebookShare);
      expect(result.data?.productUrl).toBe(mockShareUrlResponse.productUrl);
    });

    it('should handle service errors when sharing product fails', async () => {
      // Arrange
      const mockError = new Error('Share service unavailable');
      mockUserProductService.shareProduct.mockRejectedValue(mockError);

      // Act & Assert
      await expect(controller.shareProduct(mockSkuId)).rejects.toThrow('Share service unavailable');
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(1);
      expect(mockUserProductService.shareProduct).toHaveBeenCalledWith(mockSkuId);
    });

    it('should handle BadRequestException when product not found', async () => {
      // Arrange
      const badRequestError = new BadRequestException('Product not found');
      mockUserProductService.shareProduct.mockRejectedValue(badRequestError);

      // Act & Assert
      await expect(controller.shareProduct(mockSkuId)).rejects.toThrow(BadRequestException);
      await expect(controller.shareProduct(mockSkuId)).rejects.toThrow('Product not found');
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(2);
      expect(mockUserProductService.shareProduct).toHaveBeenCalledWith(mockSkuId);
    });

    it('should handle empty skuId parameter', async () => {
      // Arrange
      const emptySkuId: GetByIdProductDto = { skuId: '' };
      const validationError = new BadRequestException('Invalid SKU ID');
      mockUserProductService.shareProduct.mockRejectedValue(validationError);

      // Act & Assert
      await expect(controller.shareProduct(emptySkuId)).rejects.toThrow(BadRequestException);
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(1);
      expect(mockUserProductService.shareProduct).toHaveBeenCalledWith(emptySkuId);
    });

    it('should handle null/undefined response from service', async () => {
      // Arrange
      const nullResponse = null as unknown as BaseResponse<ShareUrlProductResponse>;
      mockUserProductService.shareProduct.mockResolvedValue(nullResponse);

      // Act
      const result = await controller.shareProduct(mockSkuId);

      // Assert
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(1);
      expect(mockUserProductService.shareProduct).toHaveBeenCalledWith(mockSkuId);
      expect(result).toBeNull();
    });

    it('should handle service returning error status', async () => {
      // Arrange
      const errorResponse: BaseResponse<ShareUrlProductResponse> = {
        statusKey: StatusKey.FAILED,
        data: null as unknown as ShareUrlProductResponse,
      };
      mockUserProductService.shareProduct.mockResolvedValue(errorResponse);

      // Act
      const result = await controller.shareProduct(mockSkuId);

      // Assert
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(1);
      expect(mockUserProductService.shareProduct).toHaveBeenCalledWith(mockSkuId);
      expect(result).toEqual(errorResponse);
      expect(result.statusKey).toBe(StatusKey.FAILED);
      expect(result.data).toBeNull();
    });

    it('should verify method signature and return type', async () => {
      // Arrange
      mockUserProductService.shareProduct.mockResolvedValue(mockBaseResponse);

      // Act
      const result = await controller.shareProduct(mockSkuId);

      // Assert
      expect(typeof controller.shareProduct).toBe('function');
      expect(result).toBeInstanceOf(Object);
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(typeof result.statusKey).toBe('string');
      expect(result.data).toBeInstanceOf(Object);
    });

    it('should handle concurrent share requests for same product', async () => {
      // Arrange
      mockUserProductService.shareProduct.mockResolvedValue(mockBaseResponse);

      // Act
      const promises = [
        controller.shareProduct(mockSkuId),
        controller.shareProduct(mockSkuId),
        controller.shareProduct(mockSkuId),
      ];
      const results = await Promise.all(promises);

      // Assert
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(3);
      results.forEach((result) => {
        expect(result).toEqual(mockBaseResponse);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
      });
    });

    it('should handle different SKU ID formats', async () => {
      // Arrange
      const testCases: GetByIdProductDto[] = [
        { skuId: 'SKU-123' },
        { skuId: 'product_456' },
        { skuId: '789-abc-def' },
        { skuId: 'FOOD-ITEM-001' },
      ];
      mockUserProductService.shareProduct.mockResolvedValue(mockBaseResponse);

      // Act & Assert
      for (const testCase of testCases) {
        const result = await controller.shareProduct(testCase);
        expect(result).toEqual(mockBaseResponse);
        expect(mockUserProductService.shareProduct).toHaveBeenCalledWith(testCase);
      }

      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle timeout errors from service', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockUserProductService.shareProduct.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(controller.shareProduct(mockSkuId)).rejects.toThrow('Request timeout');
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(1);
      expect(mockUserProductService.shareProduct).toHaveBeenCalledWith(mockSkuId);
    });

    it('should verify controller method is properly decorated', () => {
      // Assert
      expect(controller).toHaveProperty('shareProduct');
      expect(typeof controller.shareProduct).toBe('function');

      // Verify the method exists on the controller prototype
      const controllerPrototype = Object.getPrototypeOf(controller) as Record<string, unknown>;
      expect(controllerPrototype.shareProduct).toBeDefined();
    });

    it('should handle malformed response data structure', async () => {
      // Arrange
      const malformedResponse = {
        statusKey: StatusKey.SUCCESS,
        data: {
          // Missing required properties
          invalidProperty: 'test',
        } as unknown as ShareUrlProductResponse,
      } as BaseResponse<ShareUrlProductResponse>;
      mockUserProductService.shareProduct.mockResolvedValue(malformedResponse);

      // Act
      const result = await controller.shareProduct(mockSkuId);

      // Assert
      expect(mockUserProductService.shareProduct).toHaveBeenCalledTimes(1);
      expect(result).toEqual(malformedResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });
  });

  describe('createReview', () => {
    const mockSkuId: GetByIdProductDto = { skuId: 'TEST-SKU-001' };
    const mockCreateReviewDto: CreateReviewDto = {
      rating: 4.5,
      comment: 'Great product!',
    };
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      userName: 'testuser',
      imageUrl: null,
      isActive: true,
      status: 'ACTIVE' as const,
      roleId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as User;

    beforeEach(() => {
      jest.clearAllMocks();
    });

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

      it('should create review with minimum rating (1 star)', async () => {
        // Arrange
        const minRatingDto: CreateReviewDto = {
          rating: 1,
          comment: 'Poor quality',
        };
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 2,
            rating: 1,
            comment: 'Poor quality',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 2,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, minRatingDto, mockUser);

        // Assert
        expect(mockUserProductService.createReview).toHaveBeenCalledTimes(1);
        expect(mockUserProductService.createReview).toHaveBeenCalledWith(
          mockSkuId.skuId,
          minRatingDto,
          mockUser.id,
        );
        expect(result).toEqual(mockResponse);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data?.rating).toBe(1);
      });

      it('should create review with maximum rating (5 stars)', async () => {
        // Arrange
        const maxRatingDto: CreateReviewDto = {
          rating: 5,
          comment: 'Excellent!',
        };
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 3,
            rating: 5,
            comment: 'Excellent!',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 3,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, maxRatingDto, mockUser);

        // Assert
        expect(result.data?.rating).toBe(5);
        expect(result.data?.comment).toBe('Excellent!');
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

      it('should propagate error when user already reviewed product', async () => {
        // Arrange
        const alreadyReviewedError = new BadRequestException('User already reviewed this product');
        mockUserProductService.createReview.mockRejectedValue(alreadyReviewedError);

        // Act & Assert
        await expect(
          controller.createReview(mockSkuId, mockCreateReviewDto, mockUser),
        ).rejects.toThrow('User already reviewed this product');
      });

      it('should propagate error when product does not exist', async () => {
        // Arrange
        const productNotFoundError = new BadRequestException('Product not found');
        mockUserProductService.createReview.mockRejectedValue(productNotFoundError);

        // Act & Assert
        await expect(
          controller.createReview(mockSkuId, mockCreateReviewDto, mockUser),
        ).rejects.toThrow('Product not found');
      });

      it('should handle service returning null response', async () => {
        // Arrange
        mockUserProductService.createReview.mockResolvedValue(null);

        // Act
        const result = await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(result).toBeNull();
        expect(mockUserProductService.createReview).toHaveBeenCalledTimes(1);
      });

      it('should handle service returning undefined response', async () => {
        // Arrange
        mockUserProductService.createReview.mockResolvedValue(undefined);

        // Act
        const result = await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(result).toBeUndefined();
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

    describe('edge cases', () => {
      it('should handle very long comment', async () => {
        // Arrange
        const longComment = 'A'.repeat(1000);
        const longCommentDto: CreateReviewDto = {
          rating: 4,
          comment: longComment,
        };
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 5,
            rating: 4,
            comment: longComment,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 5,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, longCommentDto, mockUser);

        // Assert
        expect(result.data?.comment).toBe(longComment);
        expect(result.data?.comment?.length).toBe(1000);
      });

      it('should handle special characters in skuId', async () => {
        // Arrange
        const specialSkuId: GetByIdProductDto = { skuId: 'TEST-SKU-@#$%^&*()' };
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 6,
            rating: 3.5,
            comment: 'Test with special SKU',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 6,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(specialSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(mockUserProductService.createReview).toHaveBeenCalledWith(
          specialSkuId.skuId,
          mockCreateReviewDto,
          mockUser.id,
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle decimal rating values', async () => {
        // Arrange
        const decimalRatingDto: CreateReviewDto = {
          rating: 3.7,
          comment: 'Decimal rating test',
        };
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 7,
            rating: 3.7,
            comment: 'Decimal rating test',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 7,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, decimalRatingDto, mockUser);

        // Assert
        expect(result.data?.rating).toBe(3.7);
      });

      it('should handle high userId values', async () => {
        // Arrange
        const highUserIdDto: CreateReviewDto = {
          rating: 4,
          comment: 'High user ID test',
        };
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 8,
            rating: 4,
            comment: 'High user ID test',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 999999,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, highUserIdDto, mockUser);

        // Assert
        expect(result.data?.userId).toBe(999999);
      });
    });

    describe('method verification', () => {
      it('should verify correct method signature and return type', async () => {
        // Arrange
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 9,
            rating: 4,
            comment: 'Method verification test',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 9,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(typeof controller.createReview).toBe('function');
        expect(result).toHaveProperty('statusKey');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('rating');
        expect(result.data).toHaveProperty('createdAt');
        expect(result.data).toHaveProperty('userId');
        expect(result.data).toHaveProperty('productId');
      });

      it('should verify parameter validation', async () => {
        // Arrange
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 10,
            rating: 5,
            comment: 'Parameter validation test',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 10,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(mockUserProductService.createReview).toHaveBeenCalledWith(
          expect.stringMatching(/.+/),
          expect.objectContaining({
            rating: mockCreateReviewDto.rating,
          }),
          mockUser.id,
        );
      });

      it('should verify service method call count and parameters', async () => {
        // Arrange
        const mockResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 11,
            rating: 2,
            comment: 'Service call verification',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 11,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(mockResponse);

        // Act
        await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);
        await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(mockUserProductService.createReview).toHaveBeenCalledTimes(2);
        expect(mockUserProductService.createReview).toHaveBeenNthCalledWith(
          1,
          mockSkuId.skuId,
          mockCreateReviewDto,
          mockUser.id,
        );
        expect(mockUserProductService.createReview).toHaveBeenNthCalledWith(
          2,
          mockSkuId.skuId,
          mockCreateReviewDto,
          mockUser.id,
        );
      });
    });

    describe('response structure validation', () => {
      it('should handle malformed response from service', async () => {
        // Arrange
        const malformedResponse = {
          statusKey: StatusKey.SUCCESS,
          data: {
            // Missing required properties
            invalidProperty: 'test',
          } as unknown as CreateReviewResponse,
        } as BaseResponse<CreateReviewResponse>;
        mockUserProductService.createReview.mockResolvedValue(malformedResponse);

        // Act
        const result = await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(mockUserProductService.createReview).toHaveBeenCalledTimes(1);
        expect(result).toEqual(malformedResponse);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
      });

      it('should handle response with different status keys', async () => {
        // Arrange
        const errorResponse: BaseResponse<CreateReviewResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            id: 12,
            rating: 1,
            comment: 'Error status test',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 12,
            productId: 1,
          },
        };
        mockUserProductService.createReview.mockResolvedValue(errorResponse);

        // Act
        const result = await controller.createReview(mockSkuId, mockCreateReviewDto, mockUser);

        // Assert
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('getProductReviews', () => {
    const mockSkuId: GetByIdProductDto = { skuId: 'TEST-SKU-001' };
    const mockQuery: GetProductReviewsDto = {
      page: 1,
      pageSize: 10,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

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

      it('should get product reviews with custom pagination', async () => {
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

      it('should propagate error when product does not exist', async () => {
        // Arrange
        const productNotFoundError = new BadRequestException('Product not found');
        mockUserProductService.getProductReviews.mockRejectedValue(productNotFoundError);

        // Act & Assert
        await expect(controller.getProductReviews(mockSkuId, mockQuery)).rejects.toThrow(
          'Product not found',
        );
      });

      it('should handle service returning null response', async () => {
        // Arrange
        mockUserProductService.getProductReviews.mockResolvedValue(null);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(result).toBeNull();
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledTimes(1);
      });

      it('should handle service returning undefined response', async () => {
        // Arrange
        mockUserProductService.getProductReviews.mockResolvedValue(undefined);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(result).toBeUndefined();
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

      it('should handle validation errors from query parameters', async () => {
        // Arrange
        const validationError = new BadRequestException('Invalid pagination parameters');
        mockUserProductService.getProductReviews.mockRejectedValue(validationError);

        // Act & Assert
        await expect(controller.getProductReviews(mockSkuId, mockQuery)).rejects.toThrow(
          'Invalid pagination parameters',
        );
      });
    });

    describe('pagination scenarios', () => {
      it('should handle first page pagination', async () => {
        // Arrange
        const firstPageQuery: GetProductReviewsDto = {
          page: 1,
          pageSize: 3,
        };
        const mockReviews: ReviewResponse[] = [
          {
            id: 1,
            rating: 4.0,
            comment: 'First review',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 1,
            productId: 1,
          },
          {
            id: 2,
            rating: 3.0,
            comment: 'Second review',
            createdAt: new Date('2024-01-02T00:00:00Z'),
            userId: 2,
            productId: 1,
          },
          {
            id: 3,
            rating: 5.0,
            comment: 'Third review',
            createdAt: new Date('2024-01-03T00:00:00Z'),
            userId: 3,
            productId: 1,
          },
        ];
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: mockReviews,
          paginations: {
            currentPage: 1,
            totalPages: 4,
            pageSize: 3,
            totalItems: 10,
            itemsOnPage: 3,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, firstPageQuery);

        // Assert
        expect(result.data?.paginations.currentPage).toBe(1);
        expect(result.data?.items).toHaveLength(3);
        expect(result.data?.paginations.totalPages).toBe(4);
      });

      it('should handle last page pagination', async () => {
        // Arrange
        const lastPageQuery: GetProductReviewsDto = {
          page: 4,
          pageSize: 3,
        };
        const mockReviews: ReviewResponse[] = [
          {
            id: 10,
            rating: 2.5,
            comment: 'Last review',
            createdAt: new Date('2024-01-10T00:00:00Z'),
            userId: 10,
            productId: 1,
          },
        ];
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: mockReviews,
          paginations: {
            currentPage: 4,
            totalPages: 4,
            pageSize: 3,
            totalItems: 10,
            itemsOnPage: 1,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, lastPageQuery);

        // Assert
        expect(result.data?.paginations.currentPage).toBe(4);
        expect(result.data?.items).toHaveLength(1);
        expect(result.data?.paginations.totalItems).toBe(10);
      });

      it('should handle large page size', async () => {
        // Arrange
        const largePageQuery: GetProductReviewsDto = {
          page: 1,
          pageSize: 100,
        };
        const mockPaginationResult: PaginationResult<ReviewResponse> = {
          items: [],
          paginations: {
            currentPage: 1,
            totalPages: 1,
            pageSize: 100,
            totalItems: 5,
            itemsOnPage: 0,
          },
        };
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: mockPaginationResult,
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, largePageQuery);

        // Assert
        expect(result.data?.paginations.pageSize).toBe(100);
        expect(result.data?.paginations.totalPages).toBe(1);
      });
    });

    describe('edge cases', () => {
      it('should handle reviews with null comments', async () => {
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
          {
            id: 2,
            rating: 3.0,
            comment: undefined,
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
        expect(result.data?.items[0]?.comment).toBeUndefined();
        expect(result.data?.items[1]?.comment).toBeUndefined();
      });

      it('should handle special characters in skuId', async () => {
        // Arrange
        const specialSkuId: GetByIdProductDto = { skuId: 'TEST-SKU-@#$%^&*()' };
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
        const result = await controller.getProductReviews(specialSkuId, mockQuery);

        // Assert
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledWith(
          specialSkuId,
          mockQuery,
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle very long comments', async () => {
        // Arrange
        const longComment = 'A'.repeat(2000);
        const mockReviews: ReviewResponse[] = [
          {
            id: 1,
            rating: 4.0,
            comment: longComment,
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
        expect(result.data?.items[0]?.comment).toBe(longComment);
        expect(result.data?.items[0]?.comment?.length).toBe(2000);
      });

      it('should handle high user and product IDs', async () => {
        // Arrange
        const mockReviews: ReviewResponse[] = [
          {
            id: 999999,
            rating: 4.0,
            comment: 'High ID test',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            userId: 888888,
            productId: 777777,
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
        expect(result.data?.items[0]?.id).toBe(999999);
        expect(result.data?.items[0]?.userId).toBe(888888);
        expect(result.data?.items[0]?.productId).toBe(777777);
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
        expect(result.data?.paginations).toHaveProperty('pageSize');
        expect(result.data?.paginations).toHaveProperty('totalPages');
      });

      it('should verify parameter validation', async () => {
        // Arrange
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            items: [],
            paginations: {
              currentPage: 1,
              totalPages: 0,
              pageSize: 10,
              totalItems: 0,
              itemsOnPage: 0,
            },
          },
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledWith(
          expect.objectContaining({
            skuId: mockSkuId.skuId,
          }),
          expect.objectContaining({
            page: mockQuery.page,
            pageSize: mockQuery.pageSize,
          }),
        );
      });

      it('should verify service method call count and parameters', async () => {
        // Arrange
        const mockResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            items: [],
            paginations: {
              currentPage: 1,
              totalPages: 0,
              pageSize: 10,
              totalItems: 0,
              itemsOnPage: 0,
            },
          },
        };
        mockUserProductService.getProductReviews.mockResolvedValue(mockResponse);

        // Act
        await controller.getProductReviews(mockSkuId, mockQuery);
        await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledTimes(2);
        expect(mockUserProductService.getProductReviews).toHaveBeenNthCalledWith(
          1,
          mockSkuId,
          mockQuery,
        );
        expect(mockUserProductService.getProductReviews).toHaveBeenNthCalledWith(
          2,
          mockSkuId,
          mockQuery,
        );
      });
    });

    describe('response structure validation', () => {
      it('should handle malformed response from service', async () => {
        // Arrange
        const malformedResponse = {
          statusKey: StatusKey.SUCCESS,
          data: {
            // Missing required pagination properties
            invalidProperty: 'test',
          } as unknown as PaginationResult<ReviewResponse>,
        } as BaseResponse<PaginationResult<ReviewResponse>>;
        mockUserProductService.getProductReviews.mockResolvedValue(malformedResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(mockUserProductService.getProductReviews).toHaveBeenCalledTimes(1);
        expect(result).toEqual(malformedResponse);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
      });

      it('should handle response with different status keys', async () => {
        // Arrange
        const successResponse: BaseResponse<PaginationResult<ReviewResponse>> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            items: [],
            paginations: {
              currentPage: 1,
              totalPages: 0,
              pageSize: 10,
              totalItems: 0,
              itemsOnPage: 0,
            },
          },
        };
        mockUserProductService.getProductReviews.mockResolvedValue(successResponse);

        // Act
        const result = await controller.getProductReviews(mockSkuId, mockQuery);

        // Assert
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data).toBeDefined();
      });
    });
  });
});
