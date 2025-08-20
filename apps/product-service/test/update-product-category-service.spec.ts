import { UpdateProductCategoryDto } from '@app/common/dto/product/update-product-category.dto';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaService } from '@app/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { ProductService } from '../src/product-service.service';

// Mock dependencies
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

jest.mock('nestjs-i18n', () => ({
  i18nValidationMessage: jest.fn(() => 'mocked validation message'),
}));

const mockPlainToInstance = plainToInstance as jest.MockedFunction<typeof plainToInstance>;
const mockValidateOrReject = validateOrReject as jest.MockedFunction<typeof validateOrReject>;

describe('ProductService', () => {
  let service: ProductService;

  const mockPrismaClient = {
    categoryProduct: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockPaginationService = {
    paginate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: {
            client: mockPrismaClient,
          },
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('updateProductCategory', () => {
    const validUpdateDto: UpdateProductCategoryDto = {
      id: 1,
      categoryId: 2,
      productId: 100,
    };

    const mockExisting = {
      id: 1,
      categoryId: 1,
      productId: 50,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T12:00:00.000Z'),
    };

    const mockCategory = {
      id: 2,
      name: 'Electronics',
      parentId: null,
    };

    const mockProduct = {
      id: 100,
      name: 'Smartphone',
      skuId: 'PHONE-001',
      deletedAt: null,
    };

    const mockUpdated = {
      id: 1,
      categoryId: 2,
      productId: 100,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      category: {
        id: 2,
        name: 'Electronics',
        parentId: null,
      },
      product: {
        id: 100,
        name: 'Smartphone',
        skuId: 'PHONE-001',
      },
    };

    describe('Happy Path', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validUpdateDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(mockExisting);
        mockPrismaClient.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.categoryProduct.findFirst.mockResolvedValue(null);
        mockPrismaClient.categoryProduct.update.mockResolvedValue(mockUpdated);
      });

      it('should update both categoryId and productId successfully', async () => {
        const result = await service.updateProductCategory(validUpdateDto);

        expect(mockPrismaClient.categoryProduct.findUnique).toHaveBeenCalledWith({
          where: { id: 1 },
        });
        expect(mockPrismaClient.category.findUnique).toHaveBeenCalledWith({
          where: { id: 2 },
        });
        expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
          where: { id: 100, deletedAt: null },
        });
        expect(mockPrismaClient.categoryProduct.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { categoryId: 2, productId: 100 },
          include: {
            category: { select: { id: true, name: true, parentId: true } },
            product: { select: { id: true, name: true, skuId: true } },
          },
        });
        expect(result.category!.parentId).toBeUndefined();
        expect(result.product!.sku).toBe('PHONE-001');
      });

      it('should update only categoryId', async () => {
        const categoryOnlyDto: UpdateProductCategoryDto = { id: 1, categoryId: 3 };
        mockPlainToInstance.mockReturnValue(categoryOnlyDto);

        await service.updateProductCategory(categoryOnlyDto);

        expect(mockPrismaClient.category.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
        expect(mockPrismaClient.product.findUnique).not.toHaveBeenCalled();
        expect(mockPrismaClient.categoryProduct.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { categoryId: 3 },
          include: {
            category: { select: { id: true, name: true, parentId: true } },
            product: { select: { id: true, name: true, skuId: true } },
          },
        });
      });

      it('should update only productId', async () => {
        const productOnlyDto: UpdateProductCategoryDto = { id: 1, productId: 200 };
        mockPlainToInstance.mockReturnValue(productOnlyDto);

        await service.updateProductCategory(productOnlyDto);

        expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
          where: { id: 200, deletedAt: null },
        });
        expect(mockPrismaClient.category.findUnique).not.toHaveBeenCalled();
        expect(mockPrismaClient.categoryProduct.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { productId: 200 },
          include: {
            category: { select: { id: true, name: true, parentId: true } },
            product: { select: { id: true, name: true, skuId: true } },
          },
        });
      });

      it('should handle no changes when both fields are undefined', async () => {
        const noChangeDto: UpdateProductCategoryDto = { id: 1 };
        mockPlainToInstance.mockReturnValue(noChangeDto);

        await service.updateProductCategory(noChangeDto);

        expect(mockPrismaClient.category.findUnique).not.toHaveBeenCalled();
        expect(mockPrismaClient.product.findUnique).not.toHaveBeenCalled();
        expect(mockPrismaClient.categoryProduct.findFirst).not.toHaveBeenCalled();
        expect(mockPrismaClient.categoryProduct.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {},
          include: {
            category: { select: { id: true, name: true, parentId: true } },
            product: { select: { id: true, name: true, skuId: true } },
          },
        });
      });
    });

    describe('Error Handling', () => {
      it('should throw NOT_FOUND when relationship does not exist', async () => {
        mockPlainToInstance.mockReturnValue(validUpdateDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(null);

        await expect(service.updateProductCategory(validUpdateDto)).rejects.toThrow(
          TypedRpcException,
        );

        const error = (await service
          .updateProductCategory(validUpdateDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error.getError().code).toBe(HTTP_ERROR_CODE.NOT_FOUND);
        expect(error.getError().message).toBe(
          'common.product.productCategory.error.relationshipNotFound',
        );
      });

      it('should throw NOT_FOUND when category does not exist', async () => {
        mockPlainToInstance.mockReturnValue(validUpdateDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(mockExisting);
        mockPrismaClient.category.findUnique.mockResolvedValue(null);

        await expect(service.updateProductCategory(validUpdateDto)).rejects.toThrow(
          TypedRpcException,
        );

        const error = (await service
          .updateProductCategory(validUpdateDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error.getError().code).toBe(HTTP_ERROR_CODE.NOT_FOUND);
        expect(error.getError().message).toBe(
          'common.product.productCategory.error.categoryNotFound',
        );
      });

      it('should throw NOT_FOUND when product does not exist', async () => {
        mockPlainToInstance.mockReturnValue(validUpdateDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(mockExisting);
        mockPrismaClient.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.product.findUnique.mockResolvedValue(null);

        await expect(service.updateProductCategory(validUpdateDto)).rejects.toThrow(
          TypedRpcException,
        );

        const error = (await service
          .updateProductCategory(validUpdateDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error.getError().code).toBe(HTTP_ERROR_CODE.NOT_FOUND);
        expect(error.getError().message).toBe(
          'common.product.productCategory.error.productNotFound',
        );
      });

      it('should throw CONFLICT when duplicate relationship exists', async () => {
        mockPlainToInstance.mockReturnValue(validUpdateDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(mockExisting);
        mockPrismaClient.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.categoryProduct.findFirst.mockResolvedValue({ id: 5 });

        await expect(service.updateProductCategory(validUpdateDto)).rejects.toThrow(
          TypedRpcException,
        );

        const error = (await service
          .updateProductCategory(validUpdateDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error.getError().code).toBe(HTTP_ERROR_CODE.CONFLICT);
        expect(error.getError().message).toBe(
          'common.product.productCategory.error.relationshipExists',
        );
      });

      it('should propagate validation errors', async () => {
        const validationError = new Error('Validation failed');
        mockPlainToInstance.mockReturnValue(validUpdateDto);
        mockValidateOrReject.mockRejectedValue(validationError);

        await expect(service.updateProductCategory(validUpdateDto)).rejects.toThrow(
          TypedRpcException,
        );
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error updating product category:',
          validationError.stack,
        );
      });

      it('should wrap generic errors in TypedRpcException', async () => {
        const genericError = new Error('Generic error');
        mockPlainToInstance.mockReturnValue(validUpdateDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockRejectedValue(genericError);

        await expect(service.updateProductCategory(validUpdateDto)).rejects.toThrow(
          TypedRpcException,
        );

        const error = (await service
          .updateProductCategory(validUpdateDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(error.getError().message).toBe('common.product.action.updateProductCategory.failed');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'Error updating product category:',
          genericError.stack,
        );
      });
    });

    describe('Type Safety', () => {
      beforeEach(() => {
        mockPlainToInstance.mockReturnValue(validUpdateDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(mockExisting);
        mockPrismaClient.category.findUnique.mockResolvedValue(mockCategory);
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProduct);
        mockPrismaClient.categoryProduct.findFirst.mockResolvedValue(null);
        mockPrismaClient.categoryProduct.update.mockResolvedValue(mockUpdated);
      });

      it('should maintain type safety without using any', async () => {
        const result = await service.updateProductCategory(validUpdateDto);

        expect(typeof result.id).toBe('number');
        expect(typeof result.categoryId).toBe('number');
        expect(typeof result.productId).toBe('number');
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(typeof result.category!.id).toBe('number');
        expect(typeof result.category!.name).toBe('string');
        expect(typeof result.product!.id).toBe('number');
        expect(typeof result.product!.name).toBe('string');
        expect(typeof result.product!.sku).toBe('string');
      });

      it('should verify DTO immutability', async () => {
        const immutableDto: UpdateProductCategoryDto = { id: 5, categoryId: 10 };
        const originalDto = { ...immutableDto };

        mockPlainToInstance.mockReturnValue(immutableDto);

        await service.updateProductCategory(immutableDto);

        expect(immutableDto).toEqual(originalDto);
      });

      it('should verify response structure', async () => {
        const result = await service.updateProductCategory(validUpdateDto);

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
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero values', async () => {
        const zeroDto: UpdateProductCategoryDto = { id: 0, categoryId: 0, productId: 0 };
        const zeroExisting = { ...mockExisting, id: 0 };
        const zeroCategory = { id: 0, name: 'Zero', parentId: null };
        const zeroProduct = { id: 0, name: 'Zero Product', skuId: 'ZERO', deletedAt: null };

        mockPlainToInstance.mockReturnValue(zeroDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(zeroExisting);
        mockPrismaClient.category.findUnique.mockResolvedValue(zeroCategory);
        mockPrismaClient.product.findUnique.mockResolvedValue(zeroProduct);
        mockPrismaClient.categoryProduct.findFirst.mockResolvedValue(null);
        mockPrismaClient.categoryProduct.update.mockResolvedValue({
          ...mockUpdated,
          id: 0,
          categoryId: 0,
          productId: 0,
        });

        const result = await service.updateProductCategory(zeroDto);

        expect(result.id).toBe(0);
        expect(result.categoryId).toBe(0);
        expect(result.productId).toBe(0);
      });

      it('should handle large ID values', async () => {
        const largeDto: UpdateProductCategoryDto = {
          id: Number.MAX_SAFE_INTEGER,
          categoryId: Number.MAX_SAFE_INTEGER - 1,
        };

        mockPlainToInstance.mockReturnValue(largeDto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaClient.categoryProduct.findUnique.mockResolvedValue({
          ...mockExisting,
          id: Number.MAX_SAFE_INTEGER,
        });
        mockPrismaClient.category.findUnique.mockResolvedValue({
          ...mockCategory,
          id: Number.MAX_SAFE_INTEGER - 1,
        });
        mockPrismaClient.categoryProduct.findFirst.mockResolvedValue(null);
        mockPrismaClient.categoryProduct.update.mockResolvedValue({
          ...mockUpdated,
          id: Number.MAX_SAFE_INTEGER,
          categoryId: Number.MAX_SAFE_INTEGER - 1,
        });

        const result = await service.updateProductCategory(largeDto);

        expect(result.id).toBe(Number.MAX_SAFE_INTEGER);
        expect(result.categoryId).toBe(Number.MAX_SAFE_INTEGER - 1);
      });
    });
  });
});
