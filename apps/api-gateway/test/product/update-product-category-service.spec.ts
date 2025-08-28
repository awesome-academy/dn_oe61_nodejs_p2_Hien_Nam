import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { UpdateProductCategoryDto } from '@app/common/dto/product/update-product-category.dto';
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

  describe('updateProductCategory', () => {
    const validUpdateProductCategoryDto: UpdateProductCategoryDto = {
      id: 1,
      categoryId: 2,
      productId: 100,
    };

    const mockProductCategoryResponse: ProductCategoryResponse = {
      id: 1,
      categoryId: 2,
      productId: 100,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      category: {
        id: 2,
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
      it('should update product category successfully with valid input', async () => {
        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        const result = await service.updateProductCategory(validUpdateProductCategoryDto);

        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(
            ProductPattern.UPDATE_PRODUCT_CATEGORY,
            validUpdateProductCategoryDto,
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

      it('should handle partial update with only categoryId', async () => {
        const partialDto: UpdateProductCategoryDto = {
          id: 5,
          categoryId: 10,
        };

        const partialResponse: ProductCategoryResponse = {
          id: 5,
          categoryId: 10,
          productId: 500,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        };

        const partialSuccessResponse: BaseResponse<ProductCategoryResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: partialResponse,
        };

        mockCallMicroservice.mockResolvedValueOnce(partialResponse);
        mockBuildBaseResponse.mockReturnValue(partialSuccessResponse);

        const result = await service.updateProductCategory(partialDto);

        expect(result.data!.categoryId).toBe(10);
        expect(result.data!.productId).toBe(500);
      });

      it('should handle zero values for categoryId and productId', async () => {
        const zeroDto: UpdateProductCategoryDto = {
          id: 1,
          categoryId: 0,
          productId: 0,
        };

        const zeroResponse: ProductCategoryResponse = {
          id: 1,
          categoryId: 0,
          productId: 0,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        };

        const zeroSuccessResponse: BaseResponse<ProductCategoryResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: zeroResponse,
        };

        mockCallMicroservice.mockResolvedValueOnce(zeroResponse);
        mockBuildBaseResponse.mockReturnValue(zeroSuccessResponse);

        const result = await service.updateProductCategory(zeroDto);

        expect(result.data!.categoryId).toBe(0);
        expect(result.data!.productId).toBe(0);
      });
    });

    describe('Error Handling', () => {
      it('should throw BadRequestException when microservice returns null', async () => {
        mockCallMicroservice.mockResolvedValueOnce(null);
        mockI18nService.translate.mockReturnValue('Failed to update product category');

        await expect(service.updateProductCategory(validUpdateProductCategoryDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.updateProductCategory(validUpdateProductCategoryDto)).rejects.toThrow(
          'Failed to update product category',
        );

        expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.productCategory.action.update.failed',
        );
        expect(mockBuildBaseResponse).not.toHaveBeenCalled();
      });

      it('should propagate microservice connection errors', async () => {
        const connectionError = new Error('Microservice connection failed');
        mockCallMicroservice.mockRejectedValueOnce(connectionError);

        await expect(service.updateProductCategory(validUpdateProductCategoryDto)).rejects.toThrow(
          connectionError,
        );

        expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
        expect(mockI18nService.translate).not.toHaveBeenCalled();
        expect(mockBuildBaseResponse).not.toHaveBeenCalled();
      });

      it('should handle database constraint violation errors', async () => {
        const constraintError = new BadRequestException('Foreign key constraint violation');
        mockCallMicroservice.mockRejectedValueOnce(constraintError);

        await expect(service.updateProductCategory(validUpdateProductCategoryDto)).rejects.toThrow(
          constraintError,
        );

        expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      });
    });

    describe('Type Safety and Validation', () => {
      it('should maintain type safety without using any', async () => {
        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        const result = await service.updateProductCategory(validUpdateProductCategoryDto);

        // Verify all types are properly inferred
        expect(typeof result.statusKey).toBe('string');
        expect(typeof result.data!.id).toBe('number');
        expect(typeof result.data!.categoryId).toBe('number');
        expect(typeof result.data!.productId).toBe('number');
        expect(result.data!.createdAt).toBeInstanceOf(Date);

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
        const immutableDto: UpdateProductCategoryDto = {
          id: 10,
          categoryId: 20,
          productId: 1000,
        };

        const originalDto = { ...immutableDto };

        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        await service.updateProductCategory(immutableDto);

        // Verify DTO immutability
        expect(immutableDto).toEqual(originalDto);
        expect(immutableDto.id).toBe(10);
        expect(immutableDto.categoryId).toBe(20);
        expect(immutableDto.productId).toBe(1000);
      });
    });

    describe('Microservice Integration', () => {
      it('should call microservice with correct pattern and parameters', async () => {
        mockCallMicroservice.mockResolvedValueOnce(mockProductCategoryResponse);
        mockBuildBaseResponse.mockReturnValue(mockSuccessResponse);

        await service.updateProductCategory(validUpdateProductCategoryDto);

        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.UPDATE_PRODUCT_CATEGORY,
          validUpdateProductCategoryDto,
        );
        expect(mockCallMicroservice).toHaveBeenCalledWith(
          mockProductClient.send(
            ProductPattern.UPDATE_PRODUCT_CATEGORY,
            validUpdateProductCategoryDto,
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
