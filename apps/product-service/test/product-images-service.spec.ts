import { MAX_IMAGES } from '@app/common/constant/cloudinary';
import { CreateProductImagesServiceDto } from '@app/common/dto/product/create-product-images.dto';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaService } from '@app/prisma';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { ProductService } from '../src/product-service.service';
import { ConfigService } from '@nestjs/config';
import { NOTIFICATION_SERVICE } from '@app/common';
import { I18nService } from 'nestjs-i18n';
import { ProductProducer } from '../src/product.producer';

jest.mock('class-validator', () => {
  const actual = jest.requireActual<typeof import('class-validator')>('class-validator');
  return {
    ...actual,
    validateOrReject: jest.fn<Promise<void>, [unknown]>(),
  };
});

jest.mock('class-transformer', () => {
  const actual = jest.requireActual<typeof import('class-transformer')>('class-transformer');
  return {
    ...actual,
    plainToInstance: jest.fn(),
  };
});

const mockValidateOrReject = validateOrReject as jest.MockedFunction<typeof validateOrReject>;
const mockPlainToInstance = plainToInstance as jest.MockedFunction<typeof plainToInstance>;
const mockConfigService = {
  get: jest.fn(),
};
const mockNotificationClient = {
  emit: jest.fn(),
};

const mockI18nService = {
  translate: jest.fn(),
};

const mockProductProducer = {
  addJobRetryPayment: jest.fn(),
};
interface MockProduct {
  id: number;
  name: string;
  skuId: string;
  description: string;
  status: StatusProduct;
  basePrice: Decimal;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MockProductImage {
  id: number;
  url: string;
  productId: number;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

describe('ProductService - Product Images Methods', () => {
  let service: ProductService;
  let moduleRef: TestingModule;

  const mockPrismaService = {
    client: {
      product: {
        findFirst: jest.fn(),
      },
      productImage: {
        count: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    },
  };

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: PaginationService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NOTIFICATION_SERVICE,
          useValue: mockNotificationClient,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: ProductProducer,
          useValue: mockProductProducer,
        },
      ],
    }).compile();

    service = moduleRef.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('checkProductById', () => {
    const mockProduct: MockProduct = {
      id: 1,
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(25.99),
      quantity: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    it('should return product when product exists', async () => {
      mockPrismaService.client.product.findFirst.mockResolvedValueOnce(mockProduct);

      const result = await service.checkProductById(1);

      expect(mockPrismaService.client.product.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({
        id: mockProduct.id,
        name: mockProduct.name,
        skuId: mockProduct.skuId,
        description: mockProduct.description,
        status: mockProduct.status,
        basePrice: mockProduct.basePrice,
        quantity: mockProduct.quantity,
        createdAt: mockProduct.createdAt,
        updatedAt: mockProduct.updatedAt,
      });
    });

    it('should return null when product does not exist', async () => {
      mockPrismaService.client.product.findFirst.mockResolvedValueOnce(null);

      const result = await service.checkProductById(999);

      expect(mockPrismaService.client.product.findFirst).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(result).toBeNull();
    });

    it('should handle invalid product ID', async () => {
      mockPrismaService.client.product.findFirst.mockResolvedValueOnce(null);

      const result = await service.checkProductById(-1);

      expect(mockPrismaService.client.product.findFirst).toHaveBeenCalledWith({
        where: { id: -1 },
      });
      expect(result).toBeNull();
    });

    it('should handle zero product ID', async () => {
      mockPrismaService.client.product.findFirst.mockResolvedValueOnce(null);

      const result = await service.checkProductById(0);

      expect(mockPrismaService.client.product.findFirst).toHaveBeenCalledWith({
        where: { id: 0 },
      });
      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      const databaseError = new Error('Database connection failed');
      mockPrismaService.client.product.findFirst.mockRejectedValueOnce(databaseError);

      await expect(service.checkProductById(1)).rejects.toThrow(databaseError);

      expect(mockPrismaService.client.product.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should verify return type structure', async () => {
      mockPrismaService.client.product.findFirst.mockResolvedValueOnce(mockProduct);

      const result = await service.checkProductById(1);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('skuId');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('basePrice');
      expect(result).toHaveProperty('quantity');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      if (result) {
        expect(typeof result.id).toBe('number');
        expect(typeof result.name).toBe('string');
        expect(typeof result.skuId).toBe('string');
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('countProductImages', () => {
    it('should return correct count when images exist', async () => {
      mockPrismaService.client.productImage.count.mockResolvedValueOnce(5);

      const result = await service.countProductImages(1);

      expect(mockPrismaService.client.productImage.count).toHaveBeenCalledWith({
        where: { productId: 1 },
      });
      expect(result).toBe(5);
    });

    it('should return zero when no images exist', async () => {
      mockPrismaService.client.productImage.count.mockResolvedValueOnce(0);

      const result = await service.countProductImages(1);

      expect(mockPrismaService.client.productImage.count).toHaveBeenCalledWith({
        where: { productId: 1 },
      });
      expect(result).toBe(0);
    });

    it('should handle invalid product ID', async () => {
      mockPrismaService.client.productImage.count.mockResolvedValueOnce(0);

      const result = await service.countProductImages(-1);

      expect(mockPrismaService.client.productImage.count).toHaveBeenCalledWith({
        where: { productId: -1 },
      });
      expect(result).toBe(0);
    });

    it('should handle large product ID', async () => {
      mockPrismaService.client.productImage.count.mockResolvedValueOnce(0);

      const result = await service.countProductImages(999999);

      expect(mockPrismaService.client.productImage.count).toHaveBeenCalledWith({
        where: { productId: 999999 },
      });
      expect(result).toBe(0);
    });

    it('should propagate database errors', async () => {
      const databaseError = new Error('Database connection failed');
      mockPrismaService.client.productImage.count.mockRejectedValueOnce(databaseError);

      await expect(service.countProductImages(1)).rejects.toThrow(databaseError);

      expect(mockPrismaService.client.productImage.count).toHaveBeenCalledWith({
        where: { productId: 1 },
      });
    });

    it('should return number type', async () => {
      mockPrismaService.client.productImage.count.mockResolvedValueOnce(3);

      const result = await service.countProductImages(1);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createProductImages', () => {
    const mockPayload: CreateProductImagesServiceDto = {
      productId: 1,
      secureUrls: ['https://cloudinary.com/image1.jpg', 'https://cloudinary.com/image2.jpg'],
    };

    const mockProduct: MockProduct = {
      id: 1,
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(25.99),
      quantity: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    const mockProductResponse: ProductResponse = {
      id: 1,
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(25.99),
      quantity: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    const mockCreatedImages: MockProductImage[] = [
      {
        id: 1,
        url: 'https://cloudinary.com/image1.jpg',
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        deletedAt: null,
      },
      {
        id: 2,
        url: 'https://cloudinary.com/image2.jpg',
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      },
    ];

    const expectedResponse: ProductImagesResponse[] = [
      {
        id: 1,
        url: 'https://cloudinary.com/image1.jpg',
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        deletedAt: null,
      },
      {
        id: 2,
        url: 'https://cloudinary.com/image2.jpg',
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      },
    ] as unknown as ProductImagesResponse[];

    beforeEach(() => {
      // Mock checkProductById method
      jest.spyOn(service, 'checkProductById').mockResolvedValue(mockProductResponse);
      // Mock countProductImages method
      jest.spyOn(service, 'countProductImages').mockResolvedValue(2);
    });

    it('should create product images successfully with valid payload', async () => {
      mockPlainToInstance.mockReturnValue(mockPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.$transaction.mockResolvedValueOnce(mockCreatedImages);

      const result = await service.createProductImages(mockPayload);

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductImagesServiceDto, mockPayload);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockPayload);
      expect(service['checkProductById']).toHaveBeenCalledWith(mockPayload.productId);
      expect(service['countProductImages']).toHaveBeenCalledWith(mockPayload.productId);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle single image upload', async () => {
      const singleImagePayload: CreateProductImagesServiceDto = {
        productId: 1,
        secureUrls: ['https://cloudinary.com/single-image.jpg'],
      };
      const singleCreatedImage = [mockCreatedImages[0]];
      const singleExpectedResponse = [expectedResponse[0]];

      mockPlainToInstance.mockReturnValue(singleImagePayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.$transaction.mockResolvedValueOnce(singleCreatedImage);

      const result = await service.createProductImages(singleImagePayload);

      expect(mockPlainToInstance).toHaveBeenCalledWith(
        CreateProductImagesServiceDto,
        singleImagePayload,
      );
      expect(mockValidateOrReject).toHaveBeenCalledWith(singleImagePayload);
      expect(service['checkProductById']).toHaveBeenCalledWith(singleImagePayload.productId);
      expect(service['countProductImages']).toHaveBeenCalledWith(singleImagePayload.productId);
      expect(result).toEqual(singleExpectedResponse);
    });

    it('should throw TypedRpcException when validation fails', async () => {
      const validationError = new Error('Validation failed');
      mockPlainToInstance.mockReturnValue(mockPayload);
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.createProductImages(mockPayload)).rejects.toThrow(validationError);

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductImagesServiceDto, mockPayload);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockPayload);
      expect(service['checkProductById']).not.toHaveBeenCalled();
      expect(service['countProductImages']).not.toHaveBeenCalled();
      expect(mockPrismaService.client.$transaction).not.toHaveBeenCalled();
    });

    it('should throw TypedRpcException when product does not exist', async () => {
      mockPlainToInstance.mockReturnValue(mockPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      jest.spyOn(service, 'checkProductById').mockResolvedValue(null);

      try {
        await service.createProductImages(mockPayload);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorDetails = typedError.getError();
        expect(errorDetails.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorDetails.message).toBe('common.product.error.productNotFound');
      }

      expect(service['checkProductById']).toHaveBeenCalledWith(mockPayload.productId);
      expect(service['countProductImages']).not.toHaveBeenCalled();
      expect(mockPrismaService.client.$transaction).not.toHaveBeenCalled();
    });

    it('should throw TypedRpcException when max images exceeded', async () => {
      mockPlainToInstance.mockReturnValue(mockPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      jest.spyOn(service, 'checkProductById').mockResolvedValue(mockProduct);
      jest.spyOn(service, 'countProductImages').mockResolvedValue(MAX_IMAGES + 1);

      try {
        await service.createProductImages(mockPayload);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorDetails = typedError.getError();
        expect(errorDetails.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorDetails.message).toBe('common.product.productImages.error.maxImagesExceeded');
      }

      expect(service['checkProductById']).toHaveBeenCalledWith(mockPayload.productId);
      expect(service['countProductImages']).toHaveBeenCalledWith(mockPayload.productId);
      expect(mockPrismaService.client.$transaction).not.toHaveBeenCalled();
    });

    it('should handle transaction failure and wrap in TypedRpcException', async () => {
      const transactionError = new Error('Transaction failed');
      mockPlainToInstance.mockReturnValue(mockPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      jest.spyOn(service, 'checkProductById').mockResolvedValue(mockProduct);
      jest.spyOn(service, 'countProductImages').mockResolvedValue(0);
      mockPrismaService.client.$transaction.mockRejectedValue(transactionError);

      try {
        await service.createProductImages(mockPayload);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorDetails = typedError.getError();
        expect(errorDetails.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(errorDetails.message).toBe('common.errors.internalServerError');
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error create Product Images:',
        transactionError.stack,
      );
    });

    it('should propagate TypedRpcException without wrapping', async () => {
      const typedRpcError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'custom.error.message',
      });
      mockPlainToInstance.mockReturnValue(mockPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      jest.spyOn(service, 'checkProductById').mockRejectedValue(typedRpcError);

      try {
        await service.createProductImages(mockPayload);
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect(error).toBe(typedRpcError); // Should be the same instance
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error create Product Images:',
        typedRpcError.stack,
      );
    });

    it('should handle large number of images', async () => {
      const largePayload: CreateProductImagesServiceDto = {
        productId: 1,
        secureUrls: Array.from(
          { length: 10 },
          (_, i) => `https://cloudinary.com/image${i + 1}.jpg`,
        ),
      };
      const largeCreatedImages = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        url: `https://cloudinary.com/image${i + 1}.jpg`,
        productId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: null,
        deletedAt: null,
      }));

      mockPlainToInstance.mockReturnValue(largePayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      jest.spyOn(service, 'countProductImages').mockResolvedValueOnce(0);
      mockPrismaService.client.$transaction.mockResolvedValueOnce(largeCreatedImages);

      const result = await service.createProductImages(largePayload);

      expect(result).toHaveLength(10);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);

      // Verify transaction was called with correct number of operations
      const transactionCall = (
        mockPrismaService.client.$transaction.mock.calls[0] as unknown[]
      )?.[0] as unknown[];
      expect(Array.isArray(transactionCall)).toBe(true);
      expect(transactionCall).toHaveLength(10);
    });

    it('should handle images with null updatedAt and deletedAt', async () => {
      const imagesWithNulls: MockProductImage[] = [
        {
          id: 1,
          url: 'https://cloudinary.com/image1.jpg',
          productId: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: null,
          deletedAt: null,
        },
      ];

      const expectedWithNulls = [
        {
          id: 1,
          url: 'https://cloudinary.com/image1.jpg',
          productId: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: null,
          deletedAt: null,
        },
      ] as unknown as ProductImagesResponse[];

      mockPlainToInstance.mockReturnValue({
        ...mockPayload,
        secureUrls: [mockPayload.secureUrls[0]],
      });
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.$transaction.mockResolvedValueOnce(imagesWithNulls);

      const result = await service.createProductImages({
        ...mockPayload,
        secureUrls: [mockPayload.secureUrls[0]],
      });

      expect(result).toEqual(expectedWithNulls);
    });

    it('should verify transaction calls structure', async () => {
      mockPlainToInstance.mockReturnValue(mockPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      jest.spyOn(service, 'checkProductById').mockResolvedValue(mockProduct);
      jest.spyOn(service, 'countProductImages').mockResolvedValue(0);
      mockPrismaService.client.$transaction.mockResolvedValue(mockCreatedImages);

      await service.createProductImages(mockPayload);

      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);
      const transactionCalls = mockPrismaService.client.$transaction.mock.calls;
      const firstCall = transactionCalls[0] as unknown[];
      expect(firstCall).toBeDefined();
      expect(firstCall).toHaveLength(1);

      const transactionOperations = firstCall[0] as unknown[];
      expect(Array.isArray(transactionOperations)).toBe(true);
      expect(transactionOperations).toHaveLength(mockPayload.secureUrls.length);
    });

    it('should verify response structure and types', async () => {
      mockPlainToInstance.mockReturnValue(mockPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.$transaction.mockResolvedValueOnce(mockCreatedImages);

      const result = await service.createProductImages(mockPayload);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      result?.forEach((image) => {
        expect(image).toHaveProperty('id');
        expect(image).toHaveProperty('url');
        expect(image).toHaveProperty('productId');
        expect(image).toHaveProperty('createdAt');
        expect(image).toHaveProperty('updatedAt');
        expect(image).toHaveProperty('deletedAt');
        expect(typeof image.id).toBe('number');
        expect(typeof image.url).toBe('string');
        expect(typeof image.productId).toBe('number');
        expect(image.createdAt).toBeInstanceOf(Date);
        expect(image.updatedAt === null || image.updatedAt instanceof Date).toBe(true);
        expect(image.deletedAt === null || image.deletedAt instanceof Date).toBe(true);
      });
    });

    it('should handle concurrent image creation', async () => {
      const payload1: CreateProductImagesServiceDto = {
        productId: 1,
        secureUrls: ['https://cloudinary.com/image1.jpg'],
      };
      const payload2: CreateProductImagesServiceDto = {
        productId: 2,
        secureUrls: ['https://cloudinary.com/image2.jpg'],
      };

      mockPlainToInstance.mockReturnValue(payload1).mockReturnValueOnce(payload2);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.$transaction.mockResolvedValue([mockCreatedImages[0]]);

      const promises = [
        service.createProductImages(payload1),
        service.createProductImages(payload2),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(1);
      expect(results[1]).toHaveLength(1);
    });

    it('should handle empty transaction result', async () => {
      const emptyPayload: CreateProductImagesServiceDto = {
        productId: 1,
        secureUrls: [],
      };

      mockPlainToInstance.mockReturnValue(emptyPayload);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.$transaction.mockResolvedValueOnce([]);

      const result = await service.createProductImages(emptyPayload);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});
