import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UserProductController } from '../../src/product/user/user-product.controller';
import { UserProductService } from '../../src/product/user/user-product.service';
import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { UserProductResponse } from '@app/common/dto/product/response/product-response';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { ImageRes } from '@app/common/dto/product/response/images-response';
import { CategoryResponse } from '@app/common/dto/product/response/category-response';
import { SizeResponse } from '@app/common/dto/product/response/size-response';
import { Decimal } from '@prisma/client/runtime/library';
import { I18nService } from 'nestjs-i18n';
import { BadRequestException } from '@nestjs/common';

describe('UserProductController', () => {
  let controller: UserProductController;

  const mockUserProductService = {
    listProductsForUser: jest.fn(),
    getProductDetailForUser: jest.fn(),
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
    ): BaseResponse<UserProductResponse[]> => ({
      statusKey: StatusKey.SUCCESS,
      data,
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
      expect(result.data).toHaveLength(1);
      if (result.data && result.data.length > 0) {
        expect(result.data[0].name).toBe('Test Product');
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
      if (result.data && result.data.length > 0) {
        expect(result.data[0].name).toBe('Test Product');
      }
    });

    it('should return empty array when no products found', async () => {
      const mockResponse = createMockResponse([]);
      const query: GetAllProductUserDto = { page: 1, pageSize: 50 };

      mockUserProductService.listProductsForUser.mockResolvedValue(mockResponse);

      const result = await controller.listProductsForUser(query);

      expect(mockUserProductService.listProductsForUser).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(0);
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
      if (result.data && result.data.length > 0) {
        expect(result.data[0].name).toBe('Pizza');
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
      if (result.data && result.data.length > 0) {
        expect(result.data[0].basePrice).toBeDefined();
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
      if (
        result.data &&
        result.data.length > 0 &&
        result.data[0].reviews &&
        result.data[0].reviews.length > 0
      ) {
        expect(result.data[0].reviews[0].rating).toEqual(new Decimal(5));
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
      expect(Array.isArray(result.data)).toBe(true);

      // Verify product structure if data exists
      if (result.data && result.data.length > 0) {
        const product = result.data[0];
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
      if (result1.data && result1.data.length > 0) {
        expect(result1.data[0].name).toBe('Product 1');
      }
      if (result2.data && result2.data.length > 0) {
        expect(result2.data[0].name).toBe('Product 2');
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
});
