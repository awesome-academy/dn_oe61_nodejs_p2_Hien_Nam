import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { I18nService } from 'nestjs-i18n';
import { CreateProductImagesDto } from '@app/common/dto/product/create-product-images.dto';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { Decimal } from '@prisma/client/runtime/library';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { CacheService } from '@app/common/cache/cache.service';
import { UpstashCacheService } from '@app/common/cache/upstash-cache/upstash-cache.service';
import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { MAX_IMAGES } from '@app/common/constant/cloudinary';

// Mock the callMicroservice helper
jest.mock('@app/common/helpers/microservices', () => ({
  callMicroservice: jest.fn(),
}));

import { callMicroservice } from '@app/common/helpers/microservices';
import { ProductService } from 'apps/api-gateway/src/product/admin/product.service';

describe('ProductService - createProductImages', () => {
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
    deleteByUrls: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('createProductImages', () => {
    const mockProductId: CreateProductImagesDto = {
      productId: 1,
    };

    const mockFiles: Express.Multer.File[] = [
      {
        fieldname: 'images',
        originalname: 'test1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test image 1'),
        destination: '',
        filename: 'test1.jpg',
        path: '',
        stream: new Readable(),
      },
      {
        fieldname: 'images',
        originalname: 'test2.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from('test image 2'),
        destination: '',
        filename: 'test2.png',
        path: '',
        stream: new Readable(),
      },
    ];

    const mockProductExistsResponse: BaseResponse<ProductResponse> = {
      statusKey: 'SUCCESS',
      data: {
        id: 1,
        name: 'Test Product',
        skuId: 'TEST-SKU-001',
        description: 'Test description',
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal(25.99),
        quantity: 100,
        images: [],
        variants: [],
        categoryIds: [1, 2],
      },
    };

    const mockProductImagesResponse: ProductImagesResponse[] = [
      {
        id: 1,
        url: 'https://cloudinary.com/image1.jpg',
        productId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: 2,
        url: 'https://cloudinary.com/image2.jpg',
        productId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    const mockBaseResponse: BaseResponse<ProductImagesResponse[]> = {
      statusKey: 'success',
      data: mockProductImagesResponse,
    };

    const mockImagesUrl = [
      'https://cloudinary.com/image1.jpg',
      'https://cloudinary.com/image2.jpg',
    ];

    it('should create product images successfully with valid input and files', async () => {
      // Mock product exists check
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);

      // Mock count product images
      mockCallMicroservice.mockResolvedValueOnce(2);

      // Mock cloudinary upload
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce(mockImagesUrl);

      // Mock create product images
      mockCallMicroservice.mockResolvedValueOnce(mockProductImagesResponse);

      const result = await service.createProductImages(mockProductId, mockFiles);

      // Verify product existence check
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        1,
        mockProductClient.send(ProductPattern.CHECK_PRODUCT_BY_ID, mockProductId.productId),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      // Verify count product images
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        2,
        mockProductClient.send(ProductPattern.COUNT_PRODUCT_IMAGES, mockProductId.productId),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      // Verify cloudinary upload
      expect(mockCloudinaryService.uploadImagesToCloudinary).toHaveBeenCalledWith(mockFiles);

      // Verify create product images call
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        3,
        mockProductClient.send(ProductPattern.CREATE_PRODUCT_IMAGES, {
          productId: mockProductId.productId,
          secureUrls: mockImagesUrl,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );

      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle single file upload', async () => {
      const singleFile = [mockFiles[0]];
      const singleImageUrl = [mockImagesUrl[0]];

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(1);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce(singleImageUrl);
      mockCallMicroservice.mockResolvedValueOnce(mockProductImagesResponse);

      const result = await service.createProductImages(mockProductId, singleFile);

      expect(mockCloudinaryService.uploadImagesToCloudinary).toHaveBeenCalledWith(singleFile);
      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        3,
        mockProductClient.send(ProductPattern.CREATE_PRODUCT_IMAGES, {
          productId: mockProductId.productId,
          secureUrls: singleImageUrl,
        }),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(result).toEqual(mockBaseResponse);
    });

    it('should throw BadRequestException when product does not exist', async () => {
      const errorMessage = 'Product not found';
      mockCallMicroservice.mockResolvedValueOnce(null);
      mockI18nService.translate.mockReturnValue(errorMessage);

      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        errorMessage,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.error.productNotFound',
      );
      expect(mockCloudinaryService.uploadImagesToCloudinary).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when max images exceeded', async () => {
      const errorMessage = 'Maximum images exceeded';
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(MAX_IMAGES + 1);
      mockI18nService.translate.mockReturnValue(errorMessage);

      const promise = service.createProductImages(mockProductId, mockFiles);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(errorMessage);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.productImages.error.maxImagesExceeded',
      );
      expect(mockCloudinaryService.uploadImagesToCloudinary).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when no files provided', async () => {
      const errorMessage = 'Files must be provided';
      const emptyFiles: Express.Multer.File[] = [];

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockI18nService.translate.mockReturnValue(errorMessage);

      const promise = service.createProductImages(mockProductId, emptyFiles);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow(errorMessage);

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockI18nService.translate).toHaveBeenCalledWith('common.product.error.filesExists');
      expect(mockCloudinaryService.uploadImagesToCloudinary).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when files is undefined', async () => {
      const errorMessage = 'Files must be provided';
      const undefinedFiles = undefined as unknown as Express.Multer.File[];

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockI18nService.translate.mockReturnValue(errorMessage);

      await expect(service.createProductImages(mockProductId, undefinedFiles)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockI18nService.translate).toHaveBeenCalledWith('common.product.error.filesExists');
      expect(mockCloudinaryService.uploadImagesToCloudinary).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when files is null', async () => {
      const errorMessage = 'Files must be provided';
      const nullFiles = null as unknown as Express.Multer.File[];

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockI18nService.translate.mockReturnValue(errorMessage);

      await expect(service.createProductImages(mockProductId, nullFiles)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockI18nService.translate).toHaveBeenCalledWith('common.product.error.filesExists');
      expect(mockCloudinaryService.uploadImagesToCloudinary).not.toHaveBeenCalled();
    });

    it('should handle files with zero size', async () => {
      const zeroSizeFiles: Express.Multer.File[] = [
        {
          ...mockFiles[0],
          size: 0,
        },
      ];

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(1);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce([mockImagesUrl[0]]);
      mockCallMicroservice.mockResolvedValueOnce(mockProductImagesResponse);

      const result = await service.createProductImages(mockProductId, zeroSizeFiles);

      expect(mockCloudinaryService.uploadImagesToCloudinary).toHaveBeenCalledWith(zeroSizeFiles);
      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle different file types', async () => {
      const mixedFiles: Express.Multer.File[] = [
        {
          ...mockFiles[0],
          mimetype: 'image/jpeg',
          originalname: 'test.jpg',
        },
        {
          ...mockFiles[1],
          mimetype: 'image/png',
          originalname: 'test.png',
        },
        {
          ...mockFiles[0],
          mimetype: 'image/webp',
          originalname: 'test.webp',
        },
      ];

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(1);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce(mockImagesUrl);
      mockCallMicroservice.mockResolvedValueOnce(mockProductImagesResponse);

      const result = await service.createProductImages(mockProductId, mixedFiles);

      expect(mockCloudinaryService.uploadImagesToCloudinary).toHaveBeenCalledWith(mixedFiles);
      expect(result).toEqual(mockBaseResponse);
    });

    it('should handle invalid product ID', async () => {
      const invalidProductId: CreateProductImagesDto = {
        productId: -1,
      };
      const errorMessage = 'Product not found';

      mockCallMicroservice.mockResolvedValueOnce(null);
      mockI18nService.translate.mockReturnValue(errorMessage);

      await expect(service.createProductImages(invalidProductId, mockFiles)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockCallMicroservice).toHaveBeenNthCalledWith(
        1,
        mockProductClient.send(ProductPattern.CHECK_PRODUCT_BY_ID, invalidProductId.productId),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
    });

    it('should propagate microservice errors from product existence check', async () => {
      const microserviceError = new Error('Microservice connection failed');

      mockCallMicroservice.mockRejectedValueOnce(microserviceError);

      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        microserviceError,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(1);
      expect(mockCloudinaryService.uploadImagesToCloudinary).not.toHaveBeenCalled();
    });

    it('should propagate microservice errors from count images check', async () => {
      const microserviceError = new Error('Count service failed');

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockRejectedValueOnce(microserviceError);

      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        microserviceError,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockCloudinaryService.uploadImagesToCloudinary).not.toHaveBeenCalled();
    });

    it('should propagate cloudinary upload errors', async () => {
      const uploadError = new Error('Cloudinary upload failed');

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(2);
      mockCloudinaryService.uploadImagesToCloudinary.mockRejectedValueOnce(uploadError);

      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        uploadError,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockCloudinaryService.uploadImagesToCloudinary).toHaveBeenCalledTimes(1);
    });

    it('should propagate microservice errors from create images call', async () => {
      const microserviceError = new Error('Create images service failed');

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(2);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce(mockImagesUrl);
      mockCallMicroservice.mockRejectedValueOnce(microserviceError);

      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        microserviceError,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(3);
      expect(mockCloudinaryService.uploadImagesToCloudinary).toHaveBeenCalledTimes(1);
    });

    it('should handle edge case when count returns exactly MAX_IMAGES', async () => {
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(MAX_IMAGES);
      mockI18nService.translate.mockReturnValue('Max images exceeded');

      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockCallMicroservice).toHaveBeenCalledTimes(2);
      expect(mockCloudinaryService.uploadImagesToCloudinary).not.toHaveBeenCalled();
    });

    it('should handle large file uploads', async () => {
      const largeFiles: Express.Multer.File[] = [
        {
          ...mockFiles[0],
          size: 10 * 1024 * 1024, // 10MB
        },
      ];

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(1);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce([mockImagesUrl[0]]);
      mockCallMicroservice.mockResolvedValueOnce(mockProductImagesResponse);

      const result = await service.createProductImages(mockProductId, largeFiles);

      expect(mockCloudinaryService.uploadImagesToCloudinary).toHaveBeenCalledWith(largeFiles);
      expect(result).toEqual(mockBaseResponse);
    });

    it('should verify method signature and return type', async () => {
      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(2);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce(mockImagesUrl);
      mockCallMicroservice.mockResolvedValueOnce(mockProductImagesResponse);

      const result = await service.createProductImages(mockProductId, mockFiles);

      // Verify return type is BaseResponse<ProductImagesResponse[]>
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.statusKey).toBe('success');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!).toHaveLength(2);
      expect(result.data![0]).toHaveProperty('id');
      expect(result.data![0]).toHaveProperty('url');
      expect(result.data![0]).toHaveProperty('productId');
    });

    it('should handle concurrent calls properly', async () => {
      mockCallMicroservice.mockResolvedValue(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValue(2);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValue(mockImagesUrl);
      mockCallMicroservice.mockResolvedValue(mockProductImagesResponse);

      const promises = [
        service.createProductImages(mockProductId, [mockFiles[0]]),
        service.createProductImages(mockProductId, [mockFiles[1]]),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockBaseResponse);
      expect(results[1]).toEqual(mockBaseResponse);
    });

    it('should rollback cloudinary images when product images creation fails', async () => {
      const errorMessage = 'Failed to create product images';

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(2);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce(mockImagesUrl);
      mockCallMicroservice.mockResolvedValueOnce(null); // Product images creation returns null
      mockI18nService.translate.mockReturnValue(errorMessage);

      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        errorMessage,
      );

      expect(mockCloudinaryService.deleteByUrls).toHaveBeenCalledWith(mockImagesUrl);
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.action.createProductImages.error.failed',
      );
    });

    it('should handle rollback failure gracefully', async () => {
      const errorMessage = 'Failed to create product images';
      const rollbackError = new Error('Rollback failed');

      mockCallMicroservice.mockResolvedValueOnce(mockProductExistsResponse);
      mockCallMicroservice.mockResolvedValueOnce(2);
      mockCloudinaryService.uploadImagesToCloudinary.mockResolvedValueOnce(mockImagesUrl);
      mockCallMicroservice.mockResolvedValueOnce(null);
      mockCloudinaryService.deleteByUrls.mockRejectedValueOnce(rollbackError);
      mockI18nService.translate.mockReturnValue(errorMessage);

      await expect(service.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockCloudinaryService.deleteByUrls).toHaveBeenCalledWith(mockImagesUrl);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Rollback Cloudinary images failed',
        'Rollback failed',
      );
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'common.product.action.createProductImages.error.failed',
      );
    });
  });
});
