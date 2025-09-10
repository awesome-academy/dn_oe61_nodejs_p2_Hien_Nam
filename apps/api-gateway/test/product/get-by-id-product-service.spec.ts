import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ProductService } from '../../src/product/admin/product.service';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { ProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { CategoryResponse } from '@app/common/dto/product/response/category-response';
import { ProductVariantResponse } from '@app/common/dto/product/response/product-variant-response';
import { ImageRes } from '@app/common/dto/product/response/images-response';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { CloudUploadQueueService } from '@app/common/cloudinary/cloud-upload-queue/cloud-upload-queue.service';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { CacheService } from '@app/common/cache/cache.service';
import { UpstashCacheService } from '@app/common/cache/upstash-cache/upstash-cache.service';
import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { Decimal } from '@prisma/client/runtime/library';

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

describe('ProductService - getById', () => {
  let service: ProductService;
  let moduleRef: TestingModule;

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

  const mockUploadQueue = {
    enqueueUpload: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImagesToCloudinary: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteByPattern: jest.fn().mockResolvedValue(0),
    generateKey: jest.fn(),
  };

  const mockUpstashCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteByPattern: jest.fn().mockResolvedValue(0),
    generateKey: jest.fn(),
  };

  const mockCallMicroservice = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
  const mockBuildBaseResponse = buildBaseResponse as jest.MockedFunction<typeof buildBaseResponse>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClient,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: CloudUploadQueueService,
          useValue: mockUploadQueue,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
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

    service = moduleRef.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('getById', () => {
    const mockGetByIdDto: GetByIdProductDto = {
      skuId: 'TEST-SKU-001',
    };

    const mockCategoryResponse: CategoryResponse = {
      rootCategory: {
        id: 1,
        name: 'Electronics',
        parent: '',
      },
      childCategories: [
        {
          id: 2,
          name: 'Smartphones',
          parent: 1,
        },
      ],
    };

    const mockProductVariantResponse: ProductVariantResponse = {
      id: 1,
      price: new Decimal(29.99),
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      size: {
        id: '1',
        nameSize: 'Medium',
        description: 'Medium size',
      },
    };

    const mockImageResponse: ImageRes = {
      id: 1,
      url: 'https://cloudinary.com/image1.jpg',
    };

    const mockProductDetailResponse: ProductDetailResponse = {
      id: 1,
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test product description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(25.99),
      quantity: 100,
      images: [mockImageResponse],
      variants: [mockProductVariantResponse],
      categories: [mockCategoryResponse],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-15T00:00:00Z'),
    };

    const mockProductExistsResponse: BaseResponse<ProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: {
        id: 1,
        name: 'Test Product',
        skuId: 'TEST-SKU-001',
        description: 'Test product description',
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal(25.99),
        quantity: 100,
        images: [mockImageResponse],
        variants: [
          {
            id: 1,
            price: 29.99,
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
            sizeId: 1,
          },
        ],
        categoryIds: [1, 2],
      },
    };

    const mockSuccessResponse: BaseResponse<ProductDetailResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductDetailResponse,
    };

    it('should get product by ID successfully when product exists', async () => {
      // Mock product existence check - returns product exists
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);

      // Mock get product detail call
      mockCallMicroservice.mockResolvedValueOnce(mockProductDetailResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.getById(mockGetByIdDto);

      // Verify product existence check call
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        1,
        mockProductClient.send(ProductPattern.CHECK_PRODUCT_EXISTS, mockGetByIdDto.skuId),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      // Verify get product detail call
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send(ProductPattern.GET_BY_ID, { skuId: mockGetByIdDto.skuId }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      // Verify buildBaseResponse call
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockProductDetailResponse,
      );

      expect(result).toEqual(mockSuccessResponse);
      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when product does not exist', async () => {
      // Mock product existence check - returns null (product doesn't exist)
      mockCallMicroservice.mockResolvedValueOnce(null);
      mockI18nService.translate.mockReturnValue('Product not found');

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow(BadRequestException);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.CHECK_PRODUCT_EXISTS, mockGetByIdDto.skuId),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
    });

    it('should throw BadRequestException when product existence check returns undefined', async () => {
      // Mock product existence check - returns undefined
      mockCallMicroservice.mockResolvedValueOnce(undefined);
      mockI18nService.translate.mockReturnValue('Product not found');

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow(BadRequestException);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
    });

    it('should handle microservice error during product existence check', async () => {
      const microserviceError = new Error('Microservice connection failed');
      mockCallMicroservice.mockRejectedValueOnce(microserviceError);

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow(microserviceError);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockI18nService.translate).not.toHaveBeenCalled();
    });

    it('should handle timeout error during product existence check', async () => {
      const timeoutError = new Error('Request timeout');
      mockCallMicroservice.mockRejectedValueOnce(timeoutError);

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow(timeoutError);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
    });

    it('should return success response when getById microservice returns null but product exists', async () => {
      // Mock product existence check - returns product exists
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);

      // Mock get product detail call - returns null
      mockCallMicroservice.mockResolvedValueOnce(null);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue({
        statusKey: StatusKey.SUCCESS,
        data: null,
      });

      const result = await service.getById(mockGetByIdDto);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, null);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toBeNull();
    });

    it('should return success response when getById microservice returns undefined but product exists', async () => {
      // Mock product existence check - returns product exists
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);

      // Mock get product detail call - returns undefined
      mockCallMicroservice.mockResolvedValueOnce(undefined);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue({
        statusKey: StatusKey.SUCCESS,
        data: undefined,
      });

      const result = await service.getById(mockGetByIdDto);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, undefined);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toBeUndefined();
    });

    it('should handle microservice error during getById call', async () => {
      const getByIdError = new Error('GetById service failed');

      // Mock product existence check - returns product exists
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);

      // Mock get product detail call - throws error
      mockCallMicroservice.mockRejectedValueOnce(getByIdError);

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow(getByIdError);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockBuildBaseResponse).not.toHaveBeenCalled();
    });

    it('should handle network timeout during getById call', async () => {
      const networkError = new Error('Network timeout');

      // Mock product existence check - returns product exists
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);

      // Mock get product detail call - throws network error
      mockCallMicroservice.mockRejectedValueOnce(networkError);

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow(networkError);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
    });

    it('should handle different skuId formats', async () => {
      const specialSkuFormats = [
        'SKU-123-ABC',
        'sku_with_underscores',
        'SKU.WITH.DOTS',
        'SKU WITH SPACES',
        '123456789',
        'VERY-LONG-SKU-ID-WITH-MANY-CHARACTERS-AND-NUMBERS-12345',
      ];

      for (const skuId of specialSkuFormats) {
        const dto: GetByIdProductDto = { skuId };
        const productDetail = { ...mockProductDetailResponse, skuId };
        const response = { ...mockSuccessResponse, data: productDetail };

        mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
        mockCallMicroservice.mockResolvedValueOnce(productDetail);
        mockBuildBaseResponse.mockReturnValue(response);

        const result = await service.getById(dto);

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(ProductPattern.CHECK_PRODUCT_EXISTS, skuId),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(ProductPattern.GET_BY_ID, { skuId }),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );

        expect(result.data!.skuId).toBe(skuId);

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });

    it('should handle product with minimal data structure', async () => {
      const minimalProductDetail: ProductDetailResponse = {
        id: 2,
        name: 'Minimal Product',
        skuId: 'MIN-SKU-002',
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal(10.0),
        quantity: 1,
        images: [],
        variants: [],
        categories: [],
      };

      const minimalResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: minimalProductDetail,
      };

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(minimalProductDetail);
      mockBuildBaseResponse.mockReturnValue(minimalResponse);

      const result = await service.getById({ skuId: 'MIN-SKU-002' });

      expect(result).toEqual(minimalResponse);
      expect(result.data!.description).toBeUndefined();
      expect(result.data!.createdAt).toBeUndefined();
      expect(result.data!.updatedAt).toBeUndefined();
      expect(result.data!.images).toHaveLength(0);
      expect(result.data!.variants).toHaveLength(0);
      expect(result.data!.categories).toHaveLength(0);
    });

    it('should handle product with complex data structure', async () => {
      const multipleImages: ImageRes[] = [
        { id: 1, url: 'https://cloudinary.com/image1.jpg' },
        { id: 2, url: 'https://cloudinary.com/image2.jpg' },
        { id: 3, url: 'https://cloudinary.com/image3.jpg' },
      ];

      const multipleVariants: ProductVariantResponse[] = [
        {
          id: 1,
          price: new Decimal(29.99),
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          size: { id: '1', nameSize: 'Small', description: 'Small size' },
        },
        {
          id: 2,
          price: new Decimal(34.99),
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-12-31'),
          size: { id: '2', nameSize: 'Medium', description: 'Medium size' },
        },
      ];

      const multipleCategories: CategoryResponse[] = [
        {
          rootCategory: { id: 1, name: 'Electronics', parent: '' },
          childCategories: [
            { id: 2, name: 'Smartphones', parent: 1 },
            { id: 3, name: 'Tablets', parent: 1 },
          ],
        },
        {
          rootCategory: { id: 4, name: 'Accessories', parent: '' },
          childCategories: [{ id: 5, name: 'Cases', parent: 4 }],
        },
      ];

      const complexProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        images: multipleImages,
        variants: multipleVariants,
        categories: multipleCategories,
      };

      const complexResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: complexProductDetail,
      };

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(complexProductDetail);
      mockBuildBaseResponse.mockReturnValue(complexResponse);

      const result = await service.getById(mockGetByIdDto);

      expect(result.data!.images).toHaveLength(3);
      expect(result.data!.variants).toHaveLength(2);
      expect(result.data!.categories).toHaveLength(2);
      expect(result.data!.variants[0].endDate).toEqual(new Date('2024-06-30'));
      expect(result.data!.variants[1].endDate).toEqual(new Date('2024-12-31'));
    });

    it('should handle different product statuses', async () => {
      const soldOutProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        status: StatusProduct.SOLD_OUT,
        quantity: 0,
      };

      const soldOutResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: soldOutProductDetail,
      };

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(soldOutProductDetail);
      mockBuildBaseResponse.mockReturnValue(soldOutResponse);

      const result = await service.getById(mockGetByIdDto);

      expect(result.data!.status).toBe(StatusProduct.SOLD_OUT);
      expect(result.data!.quantity).toBe(0);
    });

    it('should handle product with zero price', async () => {
      const zeroPriceProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        basePrice: new Decimal(0),
        variants: [
          {
            ...mockProductVariantResponse,
            price: new Decimal(0),
          },
        ],
      };

      const zeroPriceResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: zeroPriceProductDetail,
      };

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(zeroPriceProductDetail);
      mockBuildBaseResponse.mockReturnValue(zeroPriceResponse);

      const result = await service.getById(mockGetByIdDto);

      expect(result.data!.basePrice.toString()).toBe('0');
      expect(result.data!.variants[0].price.toString()).toBe('0');
    });

    it('should handle product with high precision decimal prices', async () => {
      const precisionPriceProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        basePrice: new Decimal('99.999999'),
        variants: [
          {
            ...mockProductVariantResponse,
            price: new Decimal('149.123456'),
          },
        ],
      };

      const precisionPriceResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: precisionPriceProductDetail,
      };

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(precisionPriceProductDetail);
      mockBuildBaseResponse.mockReturnValue(precisionPriceResponse);

      const result = await service.getById(mockGetByIdDto);

      expect(result.data!.basePrice.toString()).toBe('99.999999');
      expect(result.data!.variants[0].price.toString()).toBe('149.123456');
    });

    it('should handle empty dates in response', async () => {
      const emptyDatesProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        createdAt: null,
        updatedAt: null,
        variants: [
          {
            ...mockProductVariantResponse,
            startDate: null,
            endDate: null,
          },
        ],
      };

      const emptyDatesResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: emptyDatesProductDetail,
      };

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(emptyDatesProductDetail);
      mockBuildBaseResponse.mockReturnValue(emptyDatesResponse);

      const result = await service.getById(mockGetByIdDto);

      expect(result.data!.createdAt).toBeNull();
      expect(result.data!.updatedAt).toBeNull();
      expect(result.data!.variants[0].startDate).toBeNull();
      expect(result.data!.variants[0].endDate).toBeNull();
    });

    it('should handle null input gracefully', async () => {
      const nullDto = null as unknown as GetByIdProductDto;

      await expect(service.getById(nullDto)).rejects.toThrow('Cannot read properties of null');

      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should handle undefined input gracefully', async () => {
      const undefinedDto = undefined as unknown as GetByIdProductDto;

      await expect(service.getById(undefinedDto)).rejects.toThrow(
        'Cannot read properties of undefined',
      );

      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should verify method signature and parameter passing', async () => {
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(mockProductDetailResponse);
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      await service.getById(mockGetByIdDto);

      // Verify the exact parameter structure for first call
      const firstCall = mockCallMicroservice.mock.calls[0];
      expect(firstCall[1]).toBe(PRODUCT_SERVICE);
      expect(firstCall[2]).toBe(mockLoggerService);
      expect(firstCall[3]).toEqual({
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      });

      // Verify the exact parameter structure for second call
      const secondCall = mockCallMicroservice.mock.calls[1];
      expect(secondCall[1]).toBe(PRODUCT_SERVICE);
      expect(secondCall[2]).toBe(mockLoggerService);
      expect(secondCall[3]).toEqual({
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      });
    });

    it('should handle concurrent requests', async () => {
      mockCallMicroservice.mockResolvedValue(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValue(mockProductDetailResponse);
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const requests = [
        service.getById({ skuId: 'SKU-001' }),
        service.getById({ skuId: 'SKU-002' }),
        service.getById({ skuId: 'SKU-003' }),
      ];

      const results = await Promise.all(requests);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    it('should verify return type is Promise<BaseResponse<ProductDetailResponse>>', async () => {
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(mockProductDetailResponse);
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = service.getById(mockGetByIdDto);

      expect(result).toBeInstanceOf(Promise);

      const resolvedResult = await result;
      expect(resolvedResult).toHaveProperty('statusKey');
      expect(resolvedResult).toHaveProperty('data');
      expect(resolvedResult.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should call i18n translate with correct key when product not found', async () => {
      mockCallMicroservice.mockResolvedValueOnce(null);
      mockI18nService.translate.mockReturnValue('Product not found message');

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow(BadRequestException);

      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
      expect(mockI18nService.translate).toHaveBeenCalledTimes(1);
    });

    it('should call i18n translate when getById returns null but product exists', async () => {
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(null);
      mockI18nService.translate.mockReturnValue('Get by ID failed');
      mockBuildBaseResponse.mockReturnValue({
        statusKey: StatusKey.SUCCESS,
        data: null,
      });

      await service.getById(mockGetByIdDto);

      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.action.getById.failed',
      );
      expect(mockI18nService.translate).toHaveBeenCalledTimes(1);
    });

    it('should propagate microservice errors from first call', async () => {
      const microserviceError = new Error('Connection failed');
      mockCallMicroservice.mockRejectedValueOnce(microserviceError);

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow('Connection failed');

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
    });

    it('should propagate microservice errors from second call', async () => {
      const microserviceError = new Error('Service unavailable');

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockRejectedValueOnce(microserviceError);

      await expect(service.getById(mockGetByIdDto)).rejects.toThrow('Service unavailable');

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
    });
  });
});
