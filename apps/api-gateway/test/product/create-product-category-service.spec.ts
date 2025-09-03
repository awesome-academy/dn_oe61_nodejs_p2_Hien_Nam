import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { CloudUploadQueueService } from '@app/common/cloudinary/cloud-upload-queue/cloud-upload-queue.service';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';

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
import { ProductService } from 'apps/api-gateway/src/product/admin/product.service';

describe('ProductService', () => {
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
      ],
    }).compile();

    service = moduleRef.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('createProductCategory', () => {
    const validCreateProductCategoryDto: CreateProductCategoryDto = {
      categoryId: 1,
      productId: 100,
    };

    const mockProductCategoryResponse: ProductCategoryResponse = {
      id: 1,
      categoryId: 1,
      productId: 100,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      category: {
        id: 1,
        name: 'Electronics',
        parentId: undefined,
      },
      product: {
        id: 100,
        name: 'Smartphone',
        sku: 'PHONE-001',
      },
    };

    const mockSuccessResponse: BaseResponse<ProductCategoryResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductCategoryResponse,
    };

    describe('Happy Path', () => {
      it('should create product category successfully with valid input', async () => {
        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(
            ProductPattern.CREATE_PRODUCT_CATEGORY,
            validCreateProductCategoryDto,
          ),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        expect(mockBuildBaseResponse).toHaveBeenCalledWith(
          StatusKey.SUCCESS,
          mockProductCategoryResponse,
        );
        expect(result).toEqual(mockSuccessResponse);
      });

      it('should handle response with minimal required fields', async () => {
        const minimalResponse: ProductCategoryResponse = {
          id: 2,
          categoryId: 5,
          productId: 200,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        };

        const minimalSuccessResponse: BaseResponse<ProductCategoryResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: minimalResponse,
        };

        mockCallMicroservice.mockResolvedValueOnce(minimalResponse);
        mockBuildBaseResponse.mockReturnValue(minimalSuccessResponse);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(result).toEqual(minimalSuccessResponse);
        expect(result.data!.updatedAt).toBeUndefined();
        expect(result.data!.category).toBeUndefined();
        expect(result.data!.product).toBeUndefined();
      });

      it('should handle large category and product IDs', async () => {
        const largeIdDto: CreateProductCategoryDto = {
          categoryId: Number.MAX_SAFE_INTEGER,
          productId: Number.MAX_SAFE_INTEGER - 1,
        };

        const largeIdResponse: ProductCategoryResponse = {
          id: 999999,
          categoryId: Number.MAX_SAFE_INTEGER,
          productId: Number.MAX_SAFE_INTEGER - 1,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        };

        const largeIdSuccessResponse: BaseResponse<ProductCategoryResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: largeIdResponse,
        };

        mockCallMicroservice.mockResolvedValueOnce(largeIdResponse);
        mockBuildBaseResponse.mockReturnValue(largeIdSuccessResponse);

        const result = await service.createProductCategory(largeIdDto);

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(ProductPattern.CREATE_PRODUCT_CATEGORY, largeIdDto),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        expect(result.data!.categoryId).toBe(Number.MAX_SAFE_INTEGER);
        expect(result.data!.productId).toBe(Number.MAX_SAFE_INTEGER - 1);
      });

      it('should handle zero values for categoryId and productId', async () => {
        const zeroDto: CreateProductCategoryDto = {
          categoryId: 0,
          productId: 0,
        };

        const zeroResponse: ProductCategoryResponse = {
          id: 10,
          categoryId: 0,
          productId: 0,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        };

        const zeroSuccessResponse: BaseResponse<ProductCategoryResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: zeroResponse,
        };

        mockCallMicroservice.mockResolvedValueOnce(zeroResponse);
        mockBuildBaseResponse.mockReturnValue(zeroSuccessResponse);

        const result = await service.createProductCategory(zeroDto);

        expect(result.data!.categoryId).toBe(0);
        expect(result.data!.productId).toBe(0);
      });
    });

    describe('Error Handling', () => {
      it('should throw BadRequestException when microservice returns null', async () => {
        mockCallMicroservice.mockResolvedValueOnce(null);
        mockI18nService.translate.mockReturnValue('Failed to create product category');

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          'Failed to create product category',
        );

        expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.productCategory.action.create.failed',
        );
        expect(mockBuildBaseResponse).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when microservice returns undefined', async () => {
        mockCallMicroservice.mockResolvedValueOnce(undefined);
        mockI18nService.translate.mockReturnValue('Failed to create product category');

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          BadRequestException,
        );

        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.productCategory.action.create.failed',
        );
      });

      it('should propagate microservice connection errors', async () => {
        const connectionError = new Error('Microservice connection failed');
        mockCallMicroservice.mockRejectedValueOnce(connectionError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          connectionError,
        );

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(
            ProductPattern.CREATE_PRODUCT_CATEGORY,
            validCreateProductCategoryDto,
          ),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        expect(mockI18nService.translate).not.toHaveBeenCalled();
        expect(mockBuildBaseResponse).not.toHaveBeenCalled();
      });

      it('should handle timeout errors from microservice', async () => {
        const timeoutError = new Error('Request timeout');
        mockCallMicroservice.mockRejectedValueOnce(timeoutError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          'Request timeout',
        );

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(
            ProductPattern.CREATE_PRODUCT_CATEGORY,
            validCreateProductCategoryDto,
          ),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
      });

      it('should handle database constraint violation errors', async () => {
        const constraintError = new BadRequestException('Foreign key constraint violation');
        mockCallMicroservice.mockRejectedValueOnce(constraintError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          constraintError,
        );

        expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      });

      it('should handle duplicate key constraint errors', async () => {
        const duplicateError = new BadRequestException(
          'Duplicate entry for category-product combination',
        );
        mockCallMicroservice.mockRejectedValueOnce(duplicateError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          duplicateError,
        );

        expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      });

      it('should handle generic microservice errors', async () => {
        const genericError = new Error('Internal server error');
        mockCallMicroservice.mockRejectedValueOnce(genericError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          'Internal server error',
        );

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(
            ProductPattern.CREATE_PRODUCT_CATEGORY,
            validCreateProductCategoryDto,
          ),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle negative categoryId and productId', async () => {
        const negativeDto: CreateProductCategoryDto = {
          categoryId: -1,
          productId: -100,
        };

        const negativeResponse: ProductCategoryResponse = {
          id: 50,
          categoryId: -1,
          productId: -100,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        };

        const negativeSuccessResponse: BaseResponse<ProductCategoryResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: negativeResponse,
        };

        mockCallMicroservice.mockResolvedValueOnce(negativeResponse);
        mockBuildBaseResponse.mockReturnValue(negativeSuccessResponse);

        const result = await service.createProductCategory(negativeDto);

        expect(result.data!.categoryId).toBe(-1);
        expect(result.data!.productId).toBe(-100);
      });

      it('should handle response with undefined nested objects', async () => {
        const undefinedNestedResponse: ProductCategoryResponse = {
          id: 15,
          categoryId: 3,
          productId: 300,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          category: undefined,
          product: undefined,
        };

        const undefinedNestedSuccessResponse: BaseResponse<ProductCategoryResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: undefinedNestedResponse,
        };

        mockCallMicroservice.mockResolvedValueOnce(undefinedNestedResponse);
        mockBuildBaseResponse.mockReturnValue(undefinedNestedSuccessResponse);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(result.data!.category).toBeUndefined();
        expect(result.data!.product).toBeUndefined();
        expect(result.data!.id).toBe(15);
      });

      it('should handle microservice returning false', async () => {
        mockCallMicroservice.mockResolvedValueOnce(false);
        mockI18nService.translate.mockReturnValue('Failed to create product category');

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          BadRequestException,
        );

        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.productCategory.action.create.failed',
        );
      });
    });

    describe('Type Safety and Validation', () => {
      it('should maintain type safety without using any', async () => {
        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        // Verify all types are properly inferred
        expect(typeof result.statusKey).toBe('string');
        expect(typeof result.data!.id).toBe('number');
        expect(typeof result.data!.categoryId).toBe('number');
        expect(typeof result.data!.productId).toBe('number');
        expect(result.data!.createdAt).toBeInstanceOf(Date);

        // Verify optional fields handle undefined properly
        if (result.data!.category) {
          expect(typeof result.data!.category.id).toBe('number');
          expect(typeof result.data!.category.name).toBe('string');
        }

        if (result.data!.product) {
          expect(typeof result.data!.product.id).toBe('number');
          expect(typeof result.data!.product.name).toBe('string');
          expect(typeof result.data!.product.sku).toBe('string');
        }
      });

      it('should verify DTO structure and immutability', async () => {
        const immutableDto: CreateProductCategoryDto = {
          categoryId: 10,
          productId: 1000,
        };

        const originalDto = { ...immutableDto };

        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        await service.createProductCategory(immutableDto);

        // Verify DTO structure
        expect(immutableDto).toHaveProperty('categoryId');
        expect(immutableDto).toHaveProperty('productId');
        expect(Object.keys(immutableDto)).toEqual(['categoryId', 'productId']);

        // Verify DTO immutability
        expect(immutableDto).toEqual(originalDto);
        expect(immutableDto.categoryId).toBe(10);
        expect(immutableDto.productId).toBe(1000);
      });

      it('should verify response structure contains all required fields', async () => {
        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(result).toHaveProperty('statusKey');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('categoryId');
        expect(result.data).toHaveProperty('productId');
        expect(result.data).toHaveProperty('createdAt');
        expect(result.data!.createdAt).toBeInstanceOf(Date);

        if (result.data!.updatedAt) {
          expect(result.data!.updatedAt).toBeInstanceOf(Date);
        }
      });
    });

    describe('Microservice Integration', () => {
      it('should call microservice with correct pattern and parameters', async () => {
        const testDto: CreateProductCategoryDto = {
          categoryId: 12,
          productId: 1200,
        };

        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        await service.createProductCategory(testDto);

        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CREATE_PRODUCT_CATEGORY,
          testDto,
        );
        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(ProductPattern.CREATE_PRODUCT_CATEGORY, testDto),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
      });

      it('should use correct timeout and retry configuration', async () => {
        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        await service.createProductCategory(validCreateProductCategoryDto);

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(
            ProductPattern.CREATE_PRODUCT_CATEGORY,
            validCreateProductCategoryDto,
          ),
          PRODUCT_SERVICE,
          mockLoggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
      });
    });
  });
});
