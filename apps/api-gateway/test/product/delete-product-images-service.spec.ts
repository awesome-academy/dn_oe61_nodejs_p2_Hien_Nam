import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { of, throwError } from 'rxjs';
import { ProductService } from '../../src/product/admin/product.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { CacheService } from '@app/common/cache/cache.service';
import { UpstashCacheService } from '@app/common/cache/upstash-cache/upstash-cache.service';
import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { PRODUCT_SERVICE } from '@app/common';
import { TIMEOUT_MS_DEFAULT, RETRIES_DEFAULT } from '@app/common/constant/rpc.constants';

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

describe('ProductService - deleteProductImages', () => {
  let service: ProductService;
  let loggerService: CustomLogger;
  let moduleRef: TestingModule;

  const mockProductClient = {
    send: jest.fn(),
    emit: jest.fn(),
    close: jest.fn(),
    connect: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
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
    loggerService = moduleRef.get<CustomLogger>(CustomLogger);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('deleteProductImages', () => {
    const mockDeleteProductImagesDto: DeleteProductImagesDto = {
      productImageIds: [1, 2, 3],
    };

    const mockProductImagesResponse: ProductImagesResponse[] = [
      {
        id: 1,
        url: 'https://example.com/image1.jpg',
        productId: 100,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        deletedAt: new Date('2023-01-03'),
      },
      {
        id: 2,
        url: 'https://example.com/image2.jpg',
        productId: 100,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        deletedAt: new Date('2023-01-03'),
      },
      {
        id: 3,
        url: 'https://example.com/image3.jpg',
        productId: 100,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        deletedAt: new Date('2023-01-03'),
      },
    ];

    const mockBaseResponse: BaseResponse<ProductImagesResponse[]> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductImagesResponse,
    };

    it('should successfully delete multiple product images', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(mockProductImagesResponse));
      mockCallMicroservice.mockResolvedValue(mockProductImagesResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.DELETE_PRODUCT_IMAGES,
        mockDeleteProductImagesDto,
      );
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.objectContaining({}),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockProductImagesResponse,
      );
      expect(result).toEqual(mockBaseResponse);
      expect(result.data).toHaveLength(3);
    });

    it('should successfully delete single product image', async () => {
      // Arrange
      const singleImageDto: DeleteProductImagesDto = {
        productImageIds: [1],
      };
      const singleImageResponse: ProductImagesResponse[] = [mockProductImagesResponse[0]];
      const singleBaseResponse: BaseResponse<ProductImagesResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: singleImageResponse,
      };

      mockProductClient.send.mockReturnValue(of(singleImageResponse));
      mockCallMicroservice.mockResolvedValue(singleImageResponse);
      mockBuildBaseResponse.mockReturnValue(singleBaseResponse);

      // Act
      const result = await service.deleteProductImages(singleImageDto);

      // Assert
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.DELETE_PRODUCT_IMAGES,
        singleImageDto,
      );
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.objectContaining({}),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(result).toEqual(singleBaseResponse);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.id).toBe(1);
    });

    it('should handle empty result and throw BadRequestException', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(null));
      mockCallMicroservice.mockResolvedValue(null);
      mockI18nService.translate.mockReturnValue('Product not found');

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        'Product not found',
      );

      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
      expect(mockBuildBaseResponse).not.toHaveBeenCalled();
    });

    it('should handle undefined result and throw BadRequestException', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(undefined));
      mockCallMicroservice.mockResolvedValue(undefined);
      mockI18nService.translate.mockReturnValue('Product not found');

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
    });

    it('should handle empty array result and return success response', async () => {
      // Arrange
      const emptyArray: ProductImagesResponse[] = [];
      const emptyBaseResponse: BaseResponse<ProductImagesResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: emptyArray,
      };
      mockProductClient.send.mockReturnValue(of(emptyArray));
      mockCallMicroservice.mockResolvedValue(emptyArray);
      mockBuildBaseResponse.mockReturnValue(emptyBaseResponse);

      // Act
      const result = await service.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.objectContaining({}),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, emptyArray);
      expect(result).toEqual(emptyBaseResponse);
      expect(result.data).toEqual([]);
    });

    it('should handle microservice timeout error', async () => {
      // Arrange
      const timeoutError = new Error('Microservice timeout');
      mockProductClient.send.mockReturnValue(throwError(() => timeoutError));
      mockCallMicroservice.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        'Microservice timeout',
      );
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.objectContaining({}),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
    });

    it('should handle microservice connection error', async () => {
      // Arrange
      const connectionError = new Error('Connection refused');
      mockProductClient.send.mockReturnValue(throwError(() => connectionError));
      mockCallMicroservice.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        'Connection refused',
      );
    });

    it('should handle large number of product image IDs', async () => {
      // Arrange
      const largeDto: DeleteProductImagesDto = {
        productImageIds: Array.from({ length: 50 }, (_, i) => i + 1),
      };
      const largeResponse: ProductImagesResponse[] = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        url: `https://example.com/image${i + 1}.jpg`,
        productId: 100,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        deletedAt: new Date('2023-01-03'),
      }));
      const largeBaseResponse: BaseResponse<ProductImagesResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: largeResponse,
      };

      mockProductClient.send.mockReturnValue(of(largeResponse));
      mockCallMicroservice.mockResolvedValue(largeResponse);
      mockBuildBaseResponse.mockReturnValue(largeBaseResponse);

      // Act
      const result = await service.deleteProductImages(largeDto);

      // Assert
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.DELETE_PRODUCT_IMAGES,
        largeDto,
      );
      expect(result.data).toHaveLength(50);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should handle empty productImageIds array and return success response', async () => {
      // Arrange
      const emptyDto: DeleteProductImagesDto = {
        productImageIds: [],
      };
      const emptyArray: ProductImagesResponse[] = [];
      const emptyBaseResponse: BaseResponse<ProductImagesResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: emptyArray,
      };
      mockProductClient.send.mockReturnValue(of(emptyArray));
      mockCallMicroservice.mockResolvedValue(emptyArray);
      mockBuildBaseResponse.mockReturnValue(emptyBaseResponse);

      // Act
      const result = await service.deleteProductImages(emptyDto);

      // Assert
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.DELETE_PRODUCT_IMAGES,
        emptyDto,
      );
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.objectContaining({}),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, emptyArray);
      expect(result).toEqual(emptyBaseResponse);
      expect(result.data).toEqual([]);
    });

    it('should verify method signature and return type', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(mockProductImagesResponse));
      mockCallMicroservice.mockResolvedValue(mockProductImagesResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(typeof service.deleteProductImages).toBe('function');
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);

      // Verify ProductImagesResponse structure
      if (result.data && result.data.length > 0) {
        const firstImage = result.data[0];
        expect(firstImage).toHaveProperty('id');
        expect(firstImage).toHaveProperty('url');
        expect(firstImage).toHaveProperty('productId');
        expect(firstImage).toHaveProperty('createdAt');
        expect(firstImage).toHaveProperty('updatedAt');
        expect(firstImage).toHaveProperty('deletedAt');
        expect(typeof firstImage.id).toBe('number');
        expect(typeof firstImage.url).toBe('string');
        expect(typeof firstImage.productId).toBe('number');
        expect(firstImage.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should handle duplicate product image IDs', async () => {
      // Arrange
      const duplicateDto: DeleteProductImagesDto = {
        productImageIds: [1, 1, 2, 2, 3],
      };
      mockProductClient.send.mockReturnValue(of(mockProductImagesResponse));
      mockCallMicroservice.mockResolvedValue(mockProductImagesResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteProductImages(duplicateDto);

      // Assert
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.DELETE_PRODUCT_IMAGES,
        duplicateDto,
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle negative product image IDs', async () => {
      // Arrange
      const negativeDto: DeleteProductImagesDto = {
        productImageIds: [-1, -2, 0],
      };
      const error = new Error('Invalid product image IDs');
      mockProductClient.send.mockReturnValue(throwError(() => error));
      mockCallMicroservice.mockRejectedValue(error);

      // Act & Assert
      await expect(service.deleteProductImages(negativeDto)).rejects.toThrow(
        'Invalid product image IDs',
      );
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.DELETE_PRODUCT_IMAGES,
        negativeDto,
      );
    });

    it('should verify correct microservice call parameters', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(mockProductImagesResponse));
      mockCallMicroservice.mockResolvedValue(mockProductImagesResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      await service.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.objectContaining({}),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      // Verify the observable passed to callMicroservice
      const observableArg = mockCallMicroservice.mock.calls[0][0];
      expect(observableArg).toBeDefined();
    });

    it('should handle buildBaseResponse call correctly', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(mockProductImagesResponse));
      mockCallMicroservice.mockResolvedValue(mockProductImagesResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(mockBuildBaseResponse).toHaveBeenCalledTimes(1);
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockProductImagesResponse,
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle very large product image IDs', async () => {
      // Arrange
      const largeIdDto: DeleteProductImagesDto = {
        productImageIds: [999999999, 888888888],
      };
      const error = new Error('Product images not found');
      mockProductClient.send.mockReturnValue(throwError(() => error));
      mockCallMicroservice.mockRejectedValue(error);

      // Act & Assert
      await expect(service.deleteProductImages(largeIdDto)).rejects.toThrow(
        'Product images not found',
      );
      expect(mockProductClient.send).toHaveBeenCalledWith(
        ProductPattern.DELETE_PRODUCT_IMAGES,
        largeIdDto,
      );
    });

    it('should handle false result and throw BadRequestException', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(false));
      mockCallMicroservice.mockResolvedValue(false);
      mockI18nService.translate.mockReturnValue('Product not found');

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
    });

    it('should handle 0 result and throw BadRequestException', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(0));
      mockCallMicroservice.mockResolvedValue(0);
      mockI18nService.translate.mockReturnValue('Product not found');

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
    });

    it('should handle empty string result and throw BadRequestException', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(''));
      mockCallMicroservice.mockResolvedValue('');
      mockI18nService.translate.mockReturnValue('Product not found');

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
    });

    it('should handle NaN result and throw BadRequestException', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(NaN));
      mockCallMicroservice.mockResolvedValue(NaN);
      mockI18nService.translate.mockReturnValue('Product not found');

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
    });

    it('should cover all lines in callMicroservice call', async () => {
      // Arrange
      mockProductClient.send.mockReturnValue(of(mockProductImagesResponse));
      mockCallMicroservice.mockResolvedValue(mockProductImagesResponse);
      mockBuildBaseResponse.mockReturnValue(mockBaseResponse);

      // Act
      const result = await service.deleteProductImages(mockDeleteProductImagesDto);

      // Assert - Verify all parameters are passed correctly to callMicroservice
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.objectContaining({}),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      // Verify the result is processed correctly
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(
        StatusKey.SUCCESS,
        mockProductImagesResponse,
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle callMicroservice rejection and propagate error', async () => {
      // Arrange
      const microserviceError = new Error('Microservice call failed');
      mockProductClient.send.mockReturnValue(of(mockProductImagesResponse));
      mockCallMicroservice.mockRejectedValue(microserviceError);

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        'Microservice call failed',
      );
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.objectContaining({}),
        PRODUCT_SERVICE,
        loggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
    });

    it('should handle i18n translate call in error case', async () => {
      // Arrange
      const translatedMessage = 'Translated error message';
      mockProductClient.send.mockReturnValue(of(null));
      mockCallMicroservice.mockResolvedValue(null);
      mockI18nService.translate.mockReturnValue(translatedMessage);

      // Act & Assert
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        translatedMessage,
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
    });
  });
});
