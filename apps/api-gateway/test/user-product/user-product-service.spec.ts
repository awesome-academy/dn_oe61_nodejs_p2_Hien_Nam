import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { UserProductService } from '../../src/product/user/user-product.service';
import { CacheService } from '@app/common/cache/cache.service';
import { UpstashCacheService } from '@app/common/cache/upstash-cache/upstash-cache.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { UserProductResponse } from '@app/common/dto/product/response/product-response';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { PRODUCT_SERVICE } from '@app/common';
import { DEFAULT_CACHE_TTL_1H } from '@app/common/constant/cache.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { Decimal } from '@prisma/client/runtime/library';
import { of, throwError } from 'rxjs';
import { BadRequestException } from '@nestjs/common';

// Mock the callMicroservice helper
jest.mock('@app/common/helpers/microservices', () => ({
  callMicroservice: jest.fn(),
}));

// Mock the buildBaseResponse utility
jest.mock('@app/common/utils/data.util', () => ({
  buildBaseResponse: jest.fn(),
}));

import { callMicroservice } from '@app/common/helpers/microservices';
import { buildBaseResponse } from '@app/common/utils/data.util';

const mockCallMicroservice = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
const mockBuildBaseResponse = buildBaseResponse as jest.MockedFunction<typeof buildBaseResponse>;

describe('UserProductService', () => {
  let service: UserProductService;

  const mockCacheService = {
    generateKey: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockUpstashCacheService = {
    generateKey: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockProductClient = {
    send: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProductService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClient,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: UpstashCacheService,
          useValue: mockUpstashCacheService,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<UserProductService>(UserProductService);
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
          },
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
      expect(service).toBeDefined();
    });

    describe('successful scenarios', () => {
      it('should return products successfully with cache miss', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockProducts = [createMockProduct(1, 'Test Product')];
        const mockResponse = createMockResponse(mockProducts);
        const cacheKey = 'user_products:page:1:pageSize:50';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of(mockProducts));
        mockCallMicroservice.mockResolvedValue(mockProducts);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.listProductsForUser(query);

        // Note: Now using genCacheKey method which calls this.cacheService.generateKey
        expect(mockCacheService.generateKey).toHaveBeenCalledWith('user_products', {
          page: query.page,
          pageSize: query.pageSize,
          name: query.name,
          categoryId: query.categoryId,
          rootCategoryId: query.rootCategoryId,
          minPrice: query.minPrice,
          maxPrice: query.maxPrice,
          rating: query.rating,
        });

        expect(mockCacheService.getOrSet).toHaveBeenCalledWith(cacheKey, expect.anything(), {
          ttl: DEFAULT_CACHE_TTL_1H,
        });

        expect(mockProductClient.send).toHaveBeenCalledWith(ProductPattern.GET_ALL_USER, query);

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          expect.anything(),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );

        expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, mockProducts);

        expect(result).toEqual(mockResponse);
      });

      it('should return products successfully with cache hit', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockProducts = [createMockProduct(1, 'Cached Product')];
        const mockResponse = createMockResponse(mockProducts);
        const cacheKey = 'user_products:page:1:pageSize:50';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockCacheService.getOrSet.mockResolvedValue(mockProducts);
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.listProductsForUser(query);

        expect(mockCacheService.getOrSet).toHaveBeenCalledWith(cacheKey, expect.anything(), {
          ttl: DEFAULT_CACHE_TTL_1H,
        });

        expect(mockProductClient.send).not.toHaveBeenCalled();
        expect(mockCallMicroservice).not.toHaveBeenCalled();

        expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, mockProducts);

        expect(result).toEqual(mockResponse);
      });

      it('should handle filtering parameters correctly', async () => {
        const query: GetAllProductUserDto = {
          page: 2,
          pageSize: 20,
          name: 'Pizza',
          categoryId: 1,
          rootCategoryId: 2,
          minPrice: 5.0,
          maxPrice: 25.0,
          rating: 4,
        };
        const mockProducts = [createMockProduct(1, 'Pizza')];
        const mockResponse = createMockResponse(mockProducts);
        const expectedCacheKey =
          'user_products:categoryId:1:maxPrice:25:minPrice:5:name:Pizza:page:2:pageSize:20:rating:4:rootCategoryId:2';

        mockCacheService.generateKey.mockReturnValue(expectedCacheKey);
        mockProductClient.send.mockReturnValue(of(mockProducts));
        mockCallMicroservice.mockResolvedValue(mockProducts);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.listProductsForUser(query);

        expect(mockCacheService.generateKey).toHaveBeenCalledWith('user_products', {
          page: 2,
          pageSize: 20,
          name: 'Pizza',
          categoryId: 1,
          rootCategoryId: 2,
          minPrice: 5.0,
          maxPrice: 25.0,
          rating: 4,
        });

        expect(mockProductClient.send).toHaveBeenCalledWith(ProductPattern.GET_ALL_USER, query);

        expect(result).toEqual(mockResponse);
      });

      it('should handle multiple products successfully', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockProducts = [
          createMockProduct(1, 'Product 1'),
          createMockProduct(2, 'Product 2'),
          createMockProduct(3, 'Product 3'),
        ];
        const mockResponse = createMockResponse(mockProducts);
        const cacheKey = 'user_products:page:1:pageSize:50';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of(mockProducts));
        mockCallMicroservice.mockResolvedValue(mockProducts);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.listProductsForUser(query);

        expect(result).toEqual(mockResponse);
        expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, mockProducts);
      });
    });

    describe('error scenarios', () => {
      it('should return empty array when microservice returns empty array', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const cacheKey = 'user_products:page:1:pageSize:50';
        const mockResponse = createMockResponse([]);

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of([]));
        mockCallMicroservice.mockResolvedValue([]);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.listProductsForUser(query);

        expect(result).toEqual(mockResponse);
        expect(result.data).toEqual([]);
        expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, []);
      });

      it('should throw error when microservice returns null', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const cacheKey = 'user_products:page:1:pageSize:50';
        const errorMessage = 'Failed to get products';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of(null));
        mockCallMicroservice.mockResolvedValue(null);
        mockI18nService.translate.mockReturnValue(errorMessage);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );

        await expect(service.listProductsForUser(query)).rejects.toThrow(Error);
        await expect(service.listProductsForUser(query)).rejects.toThrow(errorMessage);

        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.action.getAll.failed',
        );
      });

      it('should propagate microservice errors', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const cacheKey = 'user_products:page:1:pageSize:50';
        const microserviceError = new Error('Microservice connection failed');

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(throwError(() => microserviceError));
        mockCallMicroservice.mockRejectedValue(microserviceError);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );

        await expect(service.listProductsForUser(query)).rejects.toThrow(
          'Microservice connection failed',
        );

        expect(mockCallMicroservice).toHaveBeenCalled();
      });

      it('should handle cache service errors', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const cacheKey = 'user_products:page:1:pageSize:50';
        const cacheError = new Error('Cache service unavailable');

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockCacheService.getOrSet.mockRejectedValue(cacheError);

        await expect(service.listProductsForUser(query)).rejects.toThrow(
          'Cache service unavailable',
        );
      });

      it('should handle i18n service errors gracefully', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const cacheKey = 'user_products:page:1:pageSize:50';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of(null));
        mockCallMicroservice.mockResolvedValue(null);
        mockI18nService.translate.mockImplementation(() => {
          throw new Error('I18n service error');
        });
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );

        await expect(service.listProductsForUser(query)).rejects.toThrow('I18n service error');
      });
    });

    describe('edge cases', () => {
      it('should handle query with undefined optional parameters', async () => {
        const query: GetAllProductUserDto = {
          page: 1,
          pageSize: 50,
          name: undefined,
          categoryId: undefined,
          rootCategoryId: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          rating: undefined,
        };
        const mockProducts = [createMockProduct(1, 'Test Product')];
        const mockResponse = createMockResponse(mockProducts);
        const cacheKey = 'user_products:page:1:pageSize:50';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of(mockProducts));
        mockCallMicroservice.mockResolvedValue(mockProducts);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.listProductsForUser(query);

        expect(mockCacheService.generateKey).toHaveBeenCalledWith('user_products', {
          page: 1,
          pageSize: 50,
          name: undefined,
          categoryId: undefined,
          rootCategoryId: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          rating: undefined,
        });

        expect(result).toEqual(mockResponse);
      });

      it('should handle concurrent requests with same cache key', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockProducts = [createMockProduct(1, 'Concurrent Product')];
        const mockResponse = createMockResponse(mockProducts);
        const cacheKey = 'user_products:page:1:pageSize:50';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of(mockProducts));
        mockCallMicroservice.mockResolvedValue(mockProducts);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const [result1, result2] = await Promise.all([
          service.listProductsForUser(query),
          service.listProductsForUser(query),
        ]);

        expect(result1).toEqual(mockResponse);
        expect(result2).toEqual(mockResponse);
        expect(mockCacheService.generateKey).toHaveBeenCalledTimes(2);
      });

      it('should handle zero price values correctly', async () => {
        const query: GetAllProductUserDto = {
          page: 1,
          pageSize: 50,
          minPrice: 0,
          maxPrice: 0,
        };
        const mockProducts = [createMockProduct(1, 'Free Product')];
        const mockResponse = createMockResponse(mockProducts);
        const cacheKey = 'user_products:maxPrice:0:minPrice:0:page:1:pageSize:50';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of(mockProducts));
        mockCallMicroservice.mockResolvedValue(mockProducts);
        mockCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductResponse[]>) => {
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.listProductsForUser(query);

        expect(mockCacheService.generateKey).toHaveBeenCalledWith('user_products', {
          page: 1,
          pageSize: 50,
          name: undefined,
          categoryId: undefined,
          rootCategoryId: undefined,
          minPrice: 0,
          maxPrice: 0,
          rating: undefined,
        });

        expect(result).toEqual(mockResponse);
      });

      it('should verify correct method signature and return type', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockProducts = [createMockProduct(1, 'Type Test Product')];
        const mockResponse = createMockResponse(mockProducts);

        mockCacheService.generateKey.mockReturnValue('test_key');
        mockCacheService.getOrSet.mockResolvedValue(mockProducts);
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.listProductsForUser(query);

        // Verify return type structure
        expect(result).toHaveProperty('statusKey');
        expect(result).toHaveProperty('data');
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(Array.isArray(result.data)).toBe(true);

        // Verify product structure if data exists
        if (result.data && result.data.length > 0) {
          const product = result.data[0];
          expect(product).toHaveProperty('id');
          expect(product).toHaveProperty('name');
          expect(product).toHaveProperty('skuId');
          expect(product).toHaveProperty('status');
          expect(product).toHaveProperty('basePrice');
          expect(product).toHaveProperty('quantity');
          expect(typeof product.id).toBe('number');
          expect(typeof product.name).toBe('string');
          expect(typeof product.skuId).toBe('string');
        }
      });
    });

    describe('cache behavior', () => {
      it('should use correct cache TTL', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockProducts = [createMockProduct(1, 'TTL Test Product')];
        const cacheKey = 'user_products:page:1:pageSize:50';

        mockCacheService.generateKey.mockReturnValue(cacheKey);
        mockProductClient.send.mockReturnValue(of(mockProducts));
        mockCallMicroservice.mockResolvedValue(mockProducts);
        mockCacheService.getOrSet.mockImplementation(
          async (
            key: string,
            callback: () => Promise<UserProductResponse[]>,
            options?: { ttl: number },
          ) => {
            expect(options?.ttl).toBe(DEFAULT_CACHE_TTL_1H);
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(createMockResponse(mockProducts));

        await service.listProductsForUser(query);

        expect(mockCacheService.getOrSet).toHaveBeenCalledWith(cacheKey, expect.anything(), {
          ttl: DEFAULT_CACHE_TTL_1H,
        });
      });

      it('should generate different cache keys for different queries', async () => {
        const query1: GetAllProductUserDto = { page: 1, pageSize: 50, name: 'Pizza' };
        const query2: GetAllProductUserDto = { page: 1, pageSize: 50, name: 'Burger' };
        const mockProducts = [createMockProduct(1, 'Test Product')];

        mockCacheService.generateKey
          .mockReturnValueOnce('user_products:name:Pizza:page:1:pageSize:50')
          .mockReturnValueOnce('user_products:name:Burger:page:1:pageSize:50');
        mockCacheService.getOrSet.mockResolvedValue(mockProducts);
        mockBuildBaseResponse.mockReturnValue(createMockResponse(mockProducts));

        await service.listProductsForUser(query1);
        await service.listProductsForUser(query2);

        expect(mockCacheService.generateKey).toHaveBeenNthCalledWith(1, 'user_products', {
          page: 1,
          pageSize: 50,
          name: 'Pizza',
          categoryId: undefined,
          rootCategoryId: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          rating: undefined,
        });

        expect(mockCacheService.generateKey).toHaveBeenNthCalledWith(2, 'user_products', {
          page: 1,
          pageSize: 50,
          name: 'Burger',
          categoryId: undefined,
          rootCategoryId: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          rating: undefined,
        });
      });
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
          },
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
            },
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
          },
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

    describe('successful scenarios', () => {
      it('should return product detail successfully with cache miss', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU123' };
        const mockProductDetail = createMockProductDetail(1, 'SKU123');
        const mockResponse = createMockDetailResponse(mockProductDetail);
        const cacheKey = 'user_product_details:skuId:SKU123';
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send
          .mockReturnValueOnce(of(productExistsResponse))
          .mockReturnValueOnce(of(mockProductDetail));
        mockCallMicroservice
          .mockResolvedValueOnce(productExistsResponse)
          .mockResolvedValueOnce(mockProductDetail);
        mockUpstashCacheService.generateKey.mockReturnValue(cacheKey);
        mockUpstashCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductDetailResponse>) => {
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.getProductDetailForUser(dto);

        expect(mockProductClient.send).toHaveBeenNthCalledWith(
          1,
          ProductPattern.CHECK_PRODUCT_EXISTS,
          dto.skuId,
        );
        expect(mockProductClient.send).toHaveBeenNthCalledWith(
          2,
          ProductPattern.GET_BY_ID_FOR_USER,
          { skuId: dto.skuId },
        );

        expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
        expect(mockCallMicroservice).toHaveBeenNthCalledWith(
          1,
          expect.anything(),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        expect(mockCallMicroservice).toHaveBeenNthCalledWith(
          2,
          expect.anything(),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );

        expect(mockUpstashCacheService.getOrSet).toHaveBeenCalledWith(
          cacheKey,
          expect.any(Function),
          {
            ttl: DEFAULT_CACHE_TTL_1H,
          },
        );

        expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, mockProductDetail);
        expect(result).toEqual(mockResponse);
      });

      it('should return product detail successfully with cache hit', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU456' };
        const mockProductDetail = createMockProductDetail(2, 'SKU456');
        const mockResponse = createMockDetailResponse(mockProductDetail);
        const cacheKey = 'user_product_details:skuId:SKU456';
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey.mockReturnValue(cacheKey);
        mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.getProductDetailForUser(dto);

        expect(mockProductClient.send).toHaveBeenCalledTimes(1);
        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CHECK_PRODUCT_EXISTS,
          dto.skuId,
        );

        expect(mockUpstashCacheService.getOrSet).toHaveBeenCalledWith(
          cacheKey,
          expect.any(Function),
          {
            ttl: DEFAULT_CACHE_TTL_1H,
          },
        );

        expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, mockProductDetail);
        expect(result).toEqual(mockResponse);
      });

      it('should handle product with all properties correctly', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU789' };
        const mockProductDetail = createMockProductDetail(3, 'SKU789');
        const mockResponse = createMockDetailResponse(mockProductDetail);
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.getProductDetailForUser(dto);

        expect(result.data?.id).toBe(3);
        expect(result.data?.skuId).toBe('SKU789');
        expect(result.data?.name).toBe('Product 3');
        expect(result.data?.status).toBe(StatusProduct.IN_STOCK);
        expect(result.data?.basePrice).toEqual(new Decimal(25.99));
        expect(result.data?.images).toHaveLength(1);
        expect(result.data?.variants).toHaveLength(1);
        expect(result.data?.categories).toHaveLength(1);
        expect(result.data?.reviews).toHaveLength(1);
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
          const productExistsResponse = createMockDetailResponse(mockProductDetail);

          mockProductClient.send.mockReturnValue(of(productExistsResponse));
          mockCallMicroservice.mockResolvedValue(productExistsResponse);
          mockUpstashCacheService.generateKey.mockReturnValue('test_key');
          mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
          mockBuildBaseResponse.mockReturnValue(mockResponse);

          const result = await service.getProductDetailForUser(dto);

          expect(result.data?.status).toBe(testCase.status);
        }
      });
    });

    describe('error scenarios', () => {
      it('should throw BadRequestException when product does not exist', async () => {
        const dto: GetByIdProductDto = { skuId: 'INVALID_SKU' };
        const errorMessage = 'Product not found';

        mockProductClient.send.mockReturnValue(of(null));
        mockCallMicroservice.mockResolvedValue(null);
        mockI18nService.translate.mockReturnValue(errorMessage);

        await expect(service.getProductDetailForUser(dto)).rejects.toThrow(BadRequestException);
        await expect(service.getProductDetailForUser(dto)).rejects.toThrow(errorMessage);

        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CHECK_PRODUCT_EXISTS,
          dto.skuId,
        );
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.error.productNotFound',
        );
      });

      it('should handle microservice error during product existence check', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU999' };
        const microserviceError = new Error('Microservice connection failed');

        mockProductClient.send.mockReturnValue(throwError(() => microserviceError));
        mockCallMicroservice.mockRejectedValue(microserviceError);

        await expect(service.getProductDetailForUser(dto)).rejects.toThrow(
          'Microservice connection failed',
        );

        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CHECK_PRODUCT_EXISTS,
          dto.skuId,
        );
        expect(mockCallMicroservice).toHaveBeenCalledWith(
          expect.any(Object),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
      });

      it('should handle microservice error during product detail fetch', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU888' };
        const mockProductDetail = createMockProductDetail(1, 'SKU888');
        const productExistsResponse = createMockDetailResponse(mockProductDetail);
        const microserviceError = new Error('Product detail fetch failed');

        mockProductClient.send
          .mockReturnValueOnce(of(productExistsResponse))
          .mockReturnValueOnce(throwError(() => microserviceError));
        mockCallMicroservice
          .mockResolvedValueOnce(productExistsResponse)
          .mockRejectedValueOnce(microserviceError);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductDetailResponse>) => {
            return await callback();
          },
        );

        await expect(service.getProductDetailForUser(dto)).rejects.toThrow(
          'Product detail fetch failed',
        );

        expect(mockProductClient.send).toHaveBeenCalledTimes(2);
        expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      });

      it('should handle cache service errors', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU777' };
        const mockProductDetail = createMockProductDetail(1, 'SKU777');
        const productExistsResponse = createMockDetailResponse(mockProductDetail);
        const cacheError = new Error('Cache service unavailable');

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockRejectedValue(cacheError);

        await expect(service.getProductDetailForUser(dto)).rejects.toThrow(
          'Cache service unavailable',
        );

        expect(mockUpstashCacheService.getOrSet).toHaveBeenCalled();
      });

      it('should handle I18n service errors during product not found', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU666' };
        const i18nError = new Error('I18n service error');

        mockProductClient.send.mockReturnValue(of(null));
        mockCallMicroservice.mockResolvedValue(null);
        mockI18nService.translate.mockImplementation(() => {
          throw i18nError;
        });

        await expect(service.getProductDetailForUser(dto)).rejects.toThrow('I18n service error');

        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.error.productNotFound',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle product detail with empty arrays', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU_EMPTY' };
        const mockProductDetail = createMockProductDetail(1, 'SKU_EMPTY');
        mockProductDetail.images = [];
        mockProductDetail.variants = [];
        mockProductDetail.categories = [];
        mockProductDetail.reviews = [];

        const mockResponse = createMockDetailResponse(mockProductDetail);
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.getProductDetailForUser(dto);

        expect(result.data?.images).toHaveLength(0);
        expect(result.data?.variants).toHaveLength(0);
        expect(result.data?.categories).toHaveLength(0);
        expect(result.data?.reviews).toHaveLength(0);
      });

      it('should handle product detail with null/undefined optional fields', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU_NULL' };
        const mockProductDetail = createMockProductDetail(1, 'SKU_NULL');
        mockProductDetail.description = undefined;
        mockProductDetail.deletedAt = undefined;
        mockProductDetail.createdAt = undefined;
        mockProductDetail.updatedAt = undefined;

        const mockResponse = createMockDetailResponse(mockProductDetail);
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.getProductDetailForUser(dto);

        expect(result.data?.description).toBeUndefined();
        expect(result.data?.deletedAt).toBeUndefined();
        expect(result.data?.createdAt).toBeUndefined();
        expect(result.data?.updatedAt).toBeUndefined();
      });

      it('should handle special characters in skuId', async () => {
        const specialSkuIds = ['SKU-123', 'SKU_456', 'SKU.789', 'SKU@ABC'];

        for (const skuId of specialSkuIds) {
          const dto: GetByIdProductDto = { skuId };
          const mockProductDetail = createMockProductDetail(1, skuId);
          const mockResponse = createMockDetailResponse(mockProductDetail);
          const productExistsResponse = createMockDetailResponse(mockProductDetail);

          mockProductClient.send.mockReturnValue(of(productExistsResponse));
          mockCallMicroservice.mockResolvedValue(productExistsResponse);
          mockUpstashCacheService.generateKey.mockReturnValue(`test_key_${skuId}`);
          mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
          mockBuildBaseResponse.mockReturnValue(mockResponse);

          const result = await service.getProductDetailForUser(dto);

          expect(result.data?.skuId).toBe(skuId);
          expect(mockProductClient.send).toHaveBeenCalledWith(
            ProductPattern.CHECK_PRODUCT_EXISTS,
            skuId,
          );
        }
      });

      it('should handle concurrent requests for different products', async () => {
        const dto1: GetByIdProductDto = { skuId: 'SKU_CONCURRENT_1' };
        const dto2: GetByIdProductDto = { skuId: 'SKU_CONCURRENT_2' };

        const mockProductDetail1 = createMockProductDetail(1, 'SKU_CONCURRENT_1');
        const mockProductDetail2 = createMockProductDetail(2, 'SKU_CONCURRENT_2');

        const mockResponse1 = createMockDetailResponse(mockProductDetail1);
        const mockResponse2 = createMockDetailResponse(mockProductDetail2);

        const productExistsResponse1 = createMockDetailResponse(mockProductDetail1);
        const productExistsResponse2 = createMockDetailResponse(mockProductDetail2);

        mockProductClient.send
          .mockReturnValueOnce(of(productExistsResponse1))
          .mockReturnValueOnce(of(productExistsResponse2));
        mockCallMicroservice
          .mockResolvedValueOnce(productExistsResponse1)
          .mockResolvedValueOnce(productExistsResponse2);
        mockUpstashCacheService.generateKey.mockReturnValueOnce('key1').mockReturnValueOnce('key2');
        mockUpstashCacheService.getOrSet
          .mockResolvedValueOnce(mockProductDetail1)
          .mockResolvedValueOnce(mockProductDetail2);
        mockBuildBaseResponse.mockReturnValueOnce(mockResponse1).mockReturnValueOnce(mockResponse2);

        const [result1, result2] = await Promise.all([
          service.getProductDetailForUser(dto1),
          service.getProductDetailForUser(dto2),
        ]);

        expect(result1.data?.skuId).toBe('SKU_CONCURRENT_1');
        expect(result2.data?.skuId).toBe('SKU_CONCURRENT_2');
        expect(mockProductClient.send).toHaveBeenCalledTimes(2);
      });

      it('should verify correct method signature and return type', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU_TYPE_CHECK' };
        const mockProductDetail = createMockProductDetail(1, 'SKU_TYPE_CHECK');
        const mockResponse = createMockDetailResponse(mockProductDetail);
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
        mockBuildBaseResponse.mockReturnValue(mockResponse);

        const result = await service.getProductDetailForUser(dto);

        // Verify the result structure matches BaseResponse<UserProductDetailResponse>
        expect(result).toHaveProperty('statusKey');
        expect(result).toHaveProperty('data');
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(typeof result.data).toBe('object');
        expect(result.data).not.toBeNull();
        expect(result.data).not.toBeUndefined();

        // Verify product detail structure
        if (result.data) {
          expect(result.data).toHaveProperty('id');
          expect(result.data).toHaveProperty('name');
          expect(result.data).toHaveProperty('skuId');
          expect(result.data).toHaveProperty('status');
          expect(result.data).toHaveProperty('basePrice');
          expect(result.data).toHaveProperty('quantity');
          expect(result.data).toHaveProperty('images');
          expect(result.data).toHaveProperty('variants');
          expect(result.data).toHaveProperty('categories');
          expect(result.data).toHaveProperty('reviews');
          expect(typeof result.data.id).toBe('number');
          expect(typeof result.data.name).toBe('string');
          expect(typeof result.data.skuId).toBe('string');
        }
      });
    });

    describe('cache behavior', () => {
      it('should use correct cache key generation', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU_CACHE_KEY' };
        const mockProductDetail = createMockProductDetail(1, 'SKU_CACHE_KEY');
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey.mockReturnValue('generated_cache_key');
        mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
        mockBuildBaseResponse.mockReturnValue(createMockDetailResponse(mockProductDetail));

        await service.getProductDetailForUser(dto);

        expect(mockUpstashCacheService.generateKey).toHaveBeenCalledWith('user_product_details', {
          skuId: dto.skuId,
        });
      });

      it('should use correct cache TTL', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU_TTL' };
        const mockProductDetail = createMockProductDetail(1, 'SKU_TTL');
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockImplementation(
          async (
            key: string,
            callback: () => Promise<UserProductDetailResponse>,
            options?: { ttl: number },
          ) => {
            expect(options?.ttl).toBe(DEFAULT_CACHE_TTL_1H);
            return await callback();
          },
        );
        mockBuildBaseResponse.mockReturnValue(createMockDetailResponse(mockProductDetail));

        await service.getProductDetailForUser(dto);

        expect(mockUpstashCacheService.getOrSet).toHaveBeenCalledWith(
          'test_key',
          expect.anything(),
          { ttl: DEFAULT_CACHE_TTL_1H },
        );
      });

      it('should generate different cache keys for different skuIds', async () => {
        const dto1: GetByIdProductDto = { skuId: 'SKU_A' };
        const dto2: GetByIdProductDto = { skuId: 'SKU_B' };
        const mockProductDetail = createMockProductDetail(1, 'SKU_A');
        const productExistsResponse = createMockDetailResponse(mockProductDetail);

        mockProductClient.send.mockReturnValue(of(productExistsResponse));
        mockCallMicroservice.mockResolvedValue(productExistsResponse);
        mockUpstashCacheService.generateKey
          .mockReturnValueOnce('user_product_details:skuId:SKU_A')
          .mockReturnValueOnce('user_product_details:skuId:SKU_B');
        mockUpstashCacheService.getOrSet.mockResolvedValue(mockProductDetail);
        mockBuildBaseResponse.mockReturnValue(createMockDetailResponse(mockProductDetail));

        await service.getProductDetailForUser(dto1);
        await service.getProductDetailForUser(dto2);

        expect(mockUpstashCacheService.generateKey).toHaveBeenNthCalledWith(
          1,
          'user_product_details',
          {
            skuId: 'SKU_A',
          },
        );
        expect(mockUpstashCacheService.generateKey).toHaveBeenNthCalledWith(
          2,
          'user_product_details',
          {
            skuId: 'SKU_B',
          },
        );
      });
    });

    describe('service method issues', () => {
      it('should throw BadRequestException when microservice result is null in callback', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU_BUG' };
        const mockProductDetail = createMockProductDetail(1, 'SKU_BUG');
        const productExistsResponse = createMockDetailResponse(mockProductDetail);
        const errorMessage = 'Failed to get product detail';

        mockProductClient.send
          .mockReturnValueOnce(of(productExistsResponse))
          .mockReturnValueOnce(of(null));
        mockCallMicroservice
          .mockResolvedValueOnce(productExistsResponse)
          .mockResolvedValueOnce(null);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductDetailResponse>) => {
            return await callback();
          },
        );
        mockI18nService.translate.mockReturnValue(errorMessage);

        await expect(service.getProductDetailForUser(dto)).rejects.toThrow(BadRequestException);

        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.action.getById.failed',
        );
      });

      it('should handle microservice returning undefined in callback', async () => {
        const dto: GetByIdProductDto = { skuId: 'SKU_UNDEFINED' };
        const mockProductDetail = createMockProductDetail(1, 'SKU_UNDEFINED');
        const productExistsResponse = createMockDetailResponse(mockProductDetail);
        const errorMessage = 'Failed to get product detail';

        mockProductClient.send
          .mockReturnValueOnce(of(productExistsResponse))
          .mockReturnValueOnce(of(undefined));
        mockCallMicroservice
          .mockResolvedValueOnce(productExistsResponse)
          .mockResolvedValueOnce(undefined);
        mockUpstashCacheService.generateKey.mockReturnValue('test_key');
        mockUpstashCacheService.getOrSet.mockImplementation(
          async (key: string, callback: () => Promise<UserProductDetailResponse>) => {
            return await callback();
          },
        );
        mockI18nService.translate.mockReturnValue(errorMessage);

        await expect(service.getProductDetailForUser(dto)).rejects.toThrow(BadRequestException);

        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.action.getById.failed',
        );
      });
    });
  });
});
