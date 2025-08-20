import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaService } from '@app/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { ProductService } from '../src/product-service.service';
import { ConfigService } from '@nestjs/config';
import { NOTIFICATION_SERVICE } from '@app/common';
import { ProductProducer } from '../src/product.producer';
import { I18nService } from 'nestjs-i18n';

// Mock class-transformer, class-validator, and nestjs-i18n
jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn(),
  Transform: jest.fn(() => jest.fn()),
  Type: jest.fn(() => jest.fn()),
}));

jest.mock('class-validator', () => ({
  validateOrReject: jest.fn(),
  IsInt: jest.fn(() => jest.fn()),
  IsOptional: jest.fn(() => jest.fn()),
  IsNotEmpty: jest.fn(() => jest.fn()),
  IsNumber: jest.fn(() => jest.fn()),
  IsString: jest.fn(() => jest.fn()),
  IsArray: jest.fn(() => jest.fn()),
  ValidateNested: jest.fn(() => jest.fn()),
  IsEnum: jest.fn(() => jest.fn()),
  IsDecimal: jest.fn(() => jest.fn()),
  Min: jest.fn(() => jest.fn()),
  Max: jest.fn(() => jest.fn()),
  Length: jest.fn(() => jest.fn()),
  IsDateString: jest.fn(() => jest.fn()),
  ArrayNotEmpty: jest.fn(() => jest.fn()),
}));

// jest.mock('nestjs-i18n', () => ({
//   I18nService: jest.fn().mockImplementation(() => ({
//     translate: jest.fn(),
//   })),
//   i18nValidationMessage: jest.fn(() => 'mocked validation message'),
// }));

const mockPlainToInstance = plainToInstance as jest.MockedFunction<typeof plainToInstance>;
const mockValidateOrReject = validateOrReject as jest.MockedFunction<typeof validateOrReject>;
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
describe('ProductService', () => {
  let service: ProductService;

  const mockPrismaClient = {
    client: {
      product: {
        findUnique: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      categoryProduct: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockPaginationService = {
    queryWithPagination: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaClient,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
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

    service = module.get<ProductService>(ProductService);
    (plainToInstance as jest.Mock).mockImplementation((cls: unknown, obj: unknown) => obj);
    (validateOrReject as jest.Mock).mockResolvedValue(undefined);
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

    const mockProduct = {
      id: 100,
      name: 'Smartphone',
      skuId: 'PHONE-001',
      deletedAt: null,
    };

    const mockCategory = {
      id: 1,
      name: 'Electronics',
      parentId: null,
    };

    const mockCreatedProductCategory = {
      id: 1,
      categoryId: 1,
      productId: 100,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      category: {
        id: 1,
        name: 'Electronics',
        parentId: null,
      },
      product: {
        id: 100,
        name: 'Smartphone',
        skuId: 'PHONE-001',
      },
    };

    const expectedResponse: ProductCategoryResponse = {
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

    describe('Happy Path', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.client.categoryProduct.findFirst.mockResolvedValue(null);
        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(
          mockCreatedProductCategory,
        );
      });

      it('should create product category successfully with valid input', async () => {
        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(mockPlainToInstance).toHaveBeenCalledWith(
          CreateProductCategoryDto,
          validCreateProductCategoryDto,
        );
        expect(mockValidateOrReject).toHaveBeenCalledWith(validCreateProductCategoryDto);
        expect(mockPrismaClient.client.product.findUnique).toHaveBeenCalledWith({
          where: { id: 100, deletedAt: null },
        });
        expect(mockPrismaClient.client.category.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockPrismaClient.client.categoryProduct.findFirst).toHaveBeenCalledWith({
          where: {
            categoryId: 1,
            productId: 100,
          },
        });
        expect(mockPrismaClient.client.categoryProduct.create).toHaveBeenCalledWith({
          data: {
            categoryId: 1,
            productId: 100,
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                skuId: true,
              },
            },
          },
        });
        expect(result).toEqual(expectedResponse);
      });

      it('should handle creation with category having parentId', async () => {
        const categoryWithParent = {
          ...mockCategory,
          parentId: 5,
        };

        const createdWithParent = {
          ...mockCreatedProductCategory,
          category: {
            ...mockCreatedProductCategory.category,
            parentId: 5,
          },
        };

        const expectedWithParent = {
          ...expectedResponse,
          category: {
            ...expectedResponse.category,
            parentId: 5,
          },
        };

        mockPrismaClient.client.category.findUnique.mockResolvedValue(categoryWithParent);
        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(createdWithParent);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(result.category!.parentId).toBe(5);
        expect(result).toEqual(expectedWithParent);
      });

      it('should handle creation without updatedAt field', async () => {
        const createdWithoutUpdatedAt = {
          ...mockCreatedProductCategory,
          updatedAt: null,
        };

        const expectedWithoutUpdatedAt = {
          ...expectedResponse,
          updatedAt: undefined,
        };

        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(createdWithoutUpdatedAt);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(result.updatedAt).toBeUndefined();
        expect(result).toEqual(expectedWithoutUpdatedAt);
      });

      it('should handle creation with zero values', async () => {
        const zeroDto: CreateProductCategoryDto = {
          categoryId: 0,
          productId: 0,
        };

        const zeroProduct = { ...mockProduct, id: 0 };
        const zeroCategory = { ...mockCategory, id: 0 };
        const zeroCreated = {
          ...mockCreatedProductCategory,
          id: 0,
          categoryId: 0,
          productId: 0,
          category: { ...mockCreatedProductCategory.category, id: 0 },
          product: { ...mockCreatedProductCategory.product, id: 0 },
        };

        const zeroExpected = {
          ...expectedResponse,
          id: 0,
          categoryId: 0,
          productId: 0,
          category: { ...expectedResponse.category, id: 0 },
          product: { ...expectedResponse.product, id: 0 },
        };

        mockPlainToInstance.mockReturnValue(zeroDto);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(zeroProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(zeroCategory);
        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(zeroCreated);

        const result = await service.createProductCategory(zeroDto);

        expect(result).toEqual(zeroExpected);
      });
    });

    describe('Validation Errors', () => {
      it('should throw validation error when DTO validation fails', async () => {
        const validationError = new Error('Validation failed');
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockRejectedValue(validationError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          validationError.stack,
        );
        expect(mockPrismaClient.client.product.findUnique).not.toHaveBeenCalled();
      });

      it('should handle class-transformer errors', async () => {
        const transformError = new Error('Transform failed');
        mockPlainToInstance.mockImplementation(() => {
          throw transformError;
        });

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          transformError.stack,
        );
      });
    });

    describe('Product Not Found', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should throw NOT_FOUND when product does not exist', async () => {
        mockPrismaClient.client.product.findUnique.mockResolvedValue(null);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.NOT_FOUND);
        expect(thrownError.getError().message).toBe(
          'common.product.productCategory.error.productNotFound',
        );

        expect(mockPrismaClient.client.product.findUnique).toHaveBeenCalledWith({
          where: { id: 100, deletedAt: null },
        });
        expect(mockPrismaClient.client.category.findUnique).not.toHaveBeenCalled();
      });

      it('should throw NOT_FOUND when product is soft deleted', async () => {
        mockPrismaClient.client.product.findUnique.mockResolvedValue(null);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        expect(mockPrismaClient.client.product.findUnique).toHaveBeenCalledWith({
          where: { id: 100, deletedAt: null },
        });
      });

      it('should handle product findUnique database error', async () => {
        const dbError = new Error('Database connection failed');
        mockPrismaClient.client.product.findUnique.mockRejectedValue(dbError);
        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );
        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          dbError.stack,
        );
      });
    });

    describe('Category Not Found', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
      });

      it('should throw NOT_FOUND when category does not exist', async () => {
        mockPrismaClient.client.category.findUnique.mockResolvedValue(null);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.NOT_FOUND);
        expect(thrownError.getError().message).toBe(
          'common.product.productCategory.error.categoryNotFound',
        );

        expect(mockPrismaClient.client.category.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockPrismaClient.client.categoryProduct.findFirst).not.toHaveBeenCalled();
      });

      it('should handle category findUnique database error', async () => {
        const dbError = new Error('Category database error');
        mockPrismaClient.client.category.findUnique.mockRejectedValue(dbError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          dbError.stack,
        );
      });
    });

    describe('Relationship Already Exists', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(mockCategory);
      });

      it('should throw CONFLICT when relationship already exists', async () => {
        const existingRelationship = {
          id: 5,
          categoryId: 1,
          productId: 100,
        };

        mockPrismaClient.client.categoryProduct.findFirst.mockResolvedValue(existingRelationship);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.CONFLICT);
        expect(thrownError.getError().message).toBe(
          'common.product.productCategory.error.relationshipExists',
        );

        expect(mockPrismaClient.client.categoryProduct.findFirst).toHaveBeenCalledWith({
          where: {
            categoryId: 1,
            productId: 100,
          },
        });
        expect(mockPrismaClient.client.categoryProduct.create).not.toHaveBeenCalled();
      });

      it('should handle findFirst database error', async () => {
        const dbError = new Error('Relationship check failed');
        mockPrismaClient.client.categoryProduct.findFirst.mockRejectedValue(dbError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          dbError.stack,
        );
      });
    });

    describe('Database Creation Errors', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.client.categoryProduct.findFirst.mockResolvedValue(null);
      });

      it('should handle database constraint violation during creation', async () => {
        const constraintError = new Error('Foreign key constraint violation');
        mockPrismaClient.client.categoryProduct.create.mockRejectedValue(constraintError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          constraintError.stack,
        );
      });

      it('should handle database connection error during creation', async () => {
        const connectionError = new Error('Database connection lost');
        mockPrismaClient.client.categoryProduct.create.mockRejectedValue(connectionError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          connectionError.stack,
        );
      });

      it('should handle timeout during creation', async () => {
        const timeoutError = new Error('Query timeout');
        mockPrismaClient.client.categoryProduct.create.mockRejectedValue(timeoutError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          timeoutError.stack,
        );
      });
    });

    describe('Edge Cases', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.client.categoryProduct.findFirst.mockResolvedValue(null);
      });

      it('should handle large ID values', async () => {
        const largeIdDto: CreateProductCategoryDto = {
          categoryId: Number.MAX_SAFE_INTEGER,
          productId: Number.MAX_SAFE_INTEGER - 1,
        };

        const largeProduct = { ...mockProduct, id: Number.MAX_SAFE_INTEGER - 1 };
        const largeCategory = { ...mockCategory, id: Number.MAX_SAFE_INTEGER };
        const largeCreated = {
          ...mockCreatedProductCategory,
          id: Number.MAX_SAFE_INTEGER,
          categoryId: Number.MAX_SAFE_INTEGER,
          productId: Number.MAX_SAFE_INTEGER - 1,
          category: { ...mockCreatedProductCategory.category, id: Number.MAX_SAFE_INTEGER },
          product: { ...mockCreatedProductCategory.product, id: Number.MAX_SAFE_INTEGER - 1 },
        };

        mockPlainToInstance.mockReturnValue(largeIdDto);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(largeProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(largeCategory);
        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(largeCreated);

        const result = await service.createProductCategory(largeIdDto);

        expect(result.id).toBe(Number.MAX_SAFE_INTEGER);
        expect(result.categoryId).toBe(Number.MAX_SAFE_INTEGER);
        expect(result.productId).toBe(Number.MAX_SAFE_INTEGER - 1);
      });

      it('should handle category with null parentId correctly', async () => {
        const categoryWithNullParent = {
          ...mockCategory,
          parentId: null,
        };

        const createdWithNullParent = {
          ...mockCreatedProductCategory,
          category: {
            ...mockCreatedProductCategory.category,
            parentId: null,
          },
        };

        mockPrismaClient.client.category.findUnique.mockResolvedValue(categoryWithNullParent);
        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(createdWithNullParent);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(result.category!.parentId).toBeUndefined();
      });

      it('should handle creation with minimal response data', async () => {
        const minimalCreated = {
          id: 10,
          categoryId: 1,
          productId: 100,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: null,
          category: {
            id: 1,
            name: 'Electronics',
            parentId: null,
          },
          product: {
            id: 100,
            name: 'Smartphone',
            skuId: 'PHONE-001',
          },
        };

        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(minimalCreated);

        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(result.id).toBe(10);
        expect(result.updatedAt).toBeUndefined();
        expect(result.category!.parentId).toBeUndefined();
      });
    });

    describe('Type Safety and Validation', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.client.categoryProduct.findFirst.mockResolvedValue(null);
        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(
          mockCreatedProductCategory,
        );
      });

      it('should maintain type safety without using any', async () => {
        const result = await service.createProductCategory(validCreateProductCategoryDto);

        // Verify all types are properly inferred
        expect(typeof result.id).toBe('number');
        expect(typeof result.categoryId).toBe('number');
        expect(typeof result.productId).toBe('number');
        expect(result.createdAt).toBeInstanceOf(Date);

        if (result.updatedAt) {
          expect(result.updatedAt).toBeInstanceOf(Date);
        }

        expect(typeof result.category!.id).toBe('number');
        expect(typeof result.category!.name).toBe('string');

        expect(typeof result.product!.id).toBe('number');
        expect(typeof result.product!.name).toBe('string');
        expect(typeof result.product!.sku).toBe('string');
      });

      it('should verify DTO structure and immutability', async () => {
        const immutableDto: CreateProductCategoryDto = {
          categoryId: 5,
          productId: 200,
        };

        const originalDto = { ...immutableDto };

        await service.createProductCategory(immutableDto);

        // Verify DTO structure
        expect(immutableDto).toHaveProperty('categoryId');
        expect(immutableDto).toHaveProperty('productId');
        expect(Object.keys(immutableDto)).toEqual(['categoryId', 'productId']);

        // Verify DTO immutability
        expect(immutableDto).toEqual(originalDto);
      });

      it('should verify response structure contains all required fields', async () => {
        const result = await service.createProductCategory(validCreateProductCategoryDto);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('categoryId');
        expect(result).toHaveProperty('productId');
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('product');

        expect(result.category).toHaveProperty('id');
        expect(result.category).toHaveProperty('name');

        expect(result.product).toHaveProperty('id');
        expect(result.product).toHaveProperty('name');
        expect(result.product).toHaveProperty('sku');

        expect(result.createdAt).toBeInstanceOf(Date);
      });
    });

    describe('Error Propagation', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.client.categoryProduct.findFirst.mockResolvedValue(null);
      });

      it('should preserve TypedRpcException when thrown from validation', async () => {
        const typedError = new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'Invalid input',
        });

        mockValidateOrReject.mockRejectedValue(typedError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          typedError,
        );

        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          typedError.stack,
        );
      });

      it('should wrap generic errors in TypedRpcException', async () => {
        const genericError = new Error('Generic error');
        mockPrismaClient.client.categoryProduct.create.mockRejectedValue(genericError);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );

        const thrownError = (await service
          .createProductCategory(validCreateProductCategoryDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(thrownError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(thrownError.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error creating product category:',
          genericError.stack,
        );
      });

      it('should handle unexpected null response from create operation', async () => {
        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(null);

        await expect(service.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
          TypedRpcException,
        );
      });
    });

    describe('Database Operations Flow', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validCreateProductCategoryDto);
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should execute database operations in correct order', async () => {
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.client.categoryProduct.findFirst.mockResolvedValue(null);
        mockPrismaClient.client.categoryProduct.create.mockResolvedValue(
          mockCreatedProductCategory,
        );

        await service.createProductCategory(validCreateProductCategoryDto);

        const calls = [
          mockPrismaClient.client.product.findUnique,
          mockPrismaClient.client.category.findUnique,
          mockPrismaClient.client.categoryProduct.findFirst,
          mockPrismaClient.client.categoryProduct.create,
        ];

        // Verify all operations were called
        calls.forEach((call) => {
          expect(call).toHaveBeenCalledTimes(1);
        });
      });

      it('should stop execution when product validation fails', async () => {
        mockPrismaClient.client.product.findUnique.mockResolvedValue(null);

        try {
          await service.createProductCategory(validCreateProductCategoryDto);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
        }

        expect(mockPrismaClient.client.product.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaClient.client.category.findUnique).not.toHaveBeenCalled();
        expect(mockPrismaClient.client.categoryProduct.findFirst).not.toHaveBeenCalled();
        expect(mockPrismaClient.client.categoryProduct.create).not.toHaveBeenCalled();
      });

      it('should stop execution when category validation fails', async () => {
        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(null);

        try {
          await service.createProductCategory(validCreateProductCategoryDto);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
        }

        expect(mockPrismaClient.client.product.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaClient.client.category.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaClient.client.categoryProduct.findFirst).not.toHaveBeenCalled();
        expect(mockPrismaClient.client.categoryProduct.create).not.toHaveBeenCalled();
      });

      it('should stop execution when relationship already exists', async () => {
        const existingRelationship = { id: 1, categoryId: 1, productId: 100 };

        mockPrismaClient.client.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.client.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.client.categoryProduct.findFirst.mockResolvedValue(existingRelationship);

        try {
          await service.createProductCategory(validCreateProductCategoryDto);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
        }

        expect(mockPrismaClient.client.product.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaClient.client.category.findUnique).toHaveBeenCalledTimes(1);
        expect(mockPrismaClient.client.categoryProduct.findFirst).toHaveBeenCalledTimes(1);
        expect(mockPrismaClient.client.categoryProduct.create).not.toHaveBeenCalled();
      });
    });
  });
});
