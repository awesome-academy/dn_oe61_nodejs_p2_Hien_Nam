import { PRODUCT_SERVICE } from '@app/common';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { BadRequestException } from '@nestjs/common';
import { ProductService } from '../../src/product/admin/product.service';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { callMicroservice } from '@app/common/helpers/microservices';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { Decimal } from '@prisma/client/runtime/library';

// Mock the callMicroservice helper
jest.mock('@app/common/helpers/microservices', () => ({
  callMicroservice: jest.fn(),
}));

// Mock the buildBaseResponse utility
jest.mock('@app/common/utils/data.util', () => ({
  buildBaseResponse: jest.fn(),
}));

describe('ProductService - update', () => {
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

  const mockCloudinaryService = {
    uploadImagesToCloudinary: jest.fn(),
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
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = moduleRef.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('update', () => {
    const mockSkuId = 'TEST-SKU-001';

    const mockUpdateProductDto: UpdateProductDto = {
      name: 'Updated Product Name',
      description: 'Updated product description',
      status: StatusProduct.IN_STOCK,
      basePrice: 35.99,
      quantity: 150,
    };

    const mockExistingProduct: BaseResponse<ProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: {
        id: 1,
        name: 'Existing Product',
        skuId: 'TEST-SKU-001',
        description: 'Existing product description',
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal(25.99),
        quantity: 100,
        images: [],
        variants: [],
        categoryIds: [1, 2, 3],
      },
    };

    const mockUpdatedProductResponse: ProductResponse = {
      id: 1,
      name: 'Updated Product Name',
      skuId: 'TEST-SKU-001',
      description: 'Updated product description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(35.99),
      quantity: 150,
      images: [],
      variants: [],
      categoryIds: [1, 2, 3],
    };

    const mockSuccessResponse: BaseResponse<ProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockUpdatedProductResponse,
    };

    it('should update a product successfully', async () => {
      // Mock product existence check - returns existing product
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, mockUpdateProductDto);

      // Verify product existence check
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        1,
        mockProductClient.send('check-product-exists', mockSkuId),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      // Verify product update call
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: mockUpdateProductDto,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should throw BadRequestException when product does not exist', async () => {
      // Mock product existence check - returns null (product doesn't exist)
      mockCallMicroservice.mockResolvedValueOnce(null);
      mockI18nService.translate.mockReturnValue('Product not found');

      await expect(service.update(mockSkuId, mockUpdateProductDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
    });

    it('should update product with partial data (only name)', async () => {
      const partialUpdateDto: UpdateProductDto = {
        name: 'Only Name Updated',
      };

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, partialUpdateDto);

      // Verify product update call with partial data
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: partialUpdateDto,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should update product with all status enum values', async () => {
      const statusValues = [StatusProduct.IN_STOCK, StatusProduct.SOLD_OUT, StatusProduct.PRE_SALE];

      for (const status of statusValues) {
        const statusUpdateDto: UpdateProductDto = {
          status: status,
        };

        // Mock product existence check
        mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

        // Mock product update
        mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

        // Mock buildBaseResponse
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        const result = await service.update(mockSkuId, statusUpdateDto);

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send('update-product', {
            payLoad: statusUpdateDto,
            skuIdParam: mockSkuId,
          }),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );

        expect(result).toEqual(mockSuccessResponse);

        // Clear mocks for next iteration
        jest.clearAllMocks();
      }
    });

    it('should update product with decimal prices', async () => {
      const decimalUpdateDto: UpdateProductDto = {
        basePrice: 123.456,
      };

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, decimalUpdateDto);

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: decimalUpdateDto,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should update product with zero values', async () => {
      const zeroUpdateDto: UpdateProductDto = {
        basePrice: 0,
        quantity: 0,
      };

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, zeroUpdateDto);

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: zeroUpdateDto,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should update product with secureUrls in DTO', async () => {
      const updateDtoWithUrls: UpdateProductDto = {
        name: 'Updated with URLs',
        secureUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, updateDtoWithUrls);

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: updateDtoWithUrls,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle microservice call failure for product existence check', async () => {
      const microserviceError = new Error('Microservice connection failed');

      mockCallMicroservice.mockRejectedValueOnce(microserviceError);

      await expect(service.update(mockSkuId, mockUpdateProductDto)).rejects.toThrow(
        microserviceError,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
    });

    it('should handle product update microservice failure', async () => {
      const updateError = new Error('Product update failed');

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update failure
      mockCallMicroservice.mockRejectedValueOnce(updateError);

      await expect(service.update(mockSkuId, mockUpdateProductDto)).rejects.toThrow(updateError);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
    });

    it('should handle null product update response', async () => {
      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update returning null
      mockCallMicroservice.mockResolvedValueOnce(null);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, mockUpdateProductDto);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockI18nService.translate).toHaveBeenCalledWith('common.product.action.update.failed');
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, null);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle empty skuId parameter', async () => {
      const emptySkuId = '';

      // Mock product existence check with empty skuId
      mockCallMicroservice.mockResolvedValueOnce(null);
      mockI18nService.translate.mockReturnValue('Product not found');

      await expect(service.update(emptySkuId, mockUpdateProductDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send('check-product-exists', emptySkuId),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
    });

    it('should handle special characters in skuId parameter', async () => {
      const specialCharSkuId = 'TEST-SKU-@#$%';

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(specialCharSkuId, mockUpdateProductDto);

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        1,
        mockProductClient.send('check-product-exists', specialCharSkuId),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle empty UpdateProductDto object', async () => {
      const emptyUpdateDto: UpdateProductDto = {};

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, emptyUpdateDto);

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: emptyUpdateDto,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle very long string values in update DTO', async () => {
      const longString = 'A'.repeat(1000);
      const longStringUpdateDto: UpdateProductDto = {
        name: longString,
        description: longString,
      };

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, longStringUpdateDto);

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: longStringUpdateDto,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle maximum decimal precision for basePrice', async () => {
      const maxPrecisionUpdateDto: UpdateProductDto = {
        basePrice: 999.999,
      };

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, maxPrecisionUpdateDto);

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: maxPrecisionUpdateDto,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle maximum integer value for quantity', async () => {
      const maxQuantityUpdateDto: UpdateProductDto = {
        quantity: Number.MAX_SAFE_INTEGER,
      };

      // Mock product existence check
      mockCallMicroservice.mockResolvedValueOnce(mockExistingProduct);

      // Mock product update
      mockCallMicroservice.mockResolvedValueOnce(mockUpdatedProductResponse);

      // Mock buildBaseResponse
      mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

      const result = await service.update(mockSkuId, maxQuantityUpdateDto);

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send('update-product', {
          payLoad: maxQuantityUpdateDto,
          skuIdParam: mockSkuId,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockSuccessResponse);
    });
  });
});
