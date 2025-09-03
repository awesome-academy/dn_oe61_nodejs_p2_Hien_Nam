import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma/prisma.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { DeleteProductCategoryDto } from '@app/common/dto/product/delete-product-category.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

// Mock class-transformer
jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn(),
  Transform: jest.fn(() => jest.fn()),
  Type: jest.fn(() => jest.fn()),
}));

// Mock class-validator
jest.mock('class-validator', () => ({
  validateOrReject: jest.fn(),
  IsNotEmpty: jest.fn(() => jest.fn()),
  IsNumber: jest.fn(() => jest.fn()),
  IsString: jest.fn(() => jest.fn()),
  IsOptional: jest.fn(() => jest.fn()),
  IsDateString: jest.fn(() => jest.fn()),
  Min: jest.fn(() => jest.fn()),
  Max: jest.fn(() => jest.fn()),
  IsArray: jest.fn(() => jest.fn()),
  ValidateNested: jest.fn(() => jest.fn()),
  IsBoolean: jest.fn(() => jest.fn()),
  IsEnum: jest.fn(() => jest.fn()),
  IsInt: jest.fn(() => jest.fn()),
  IsUUID: jest.fn(() => jest.fn()),
  IsPositive: jest.fn(() => jest.fn()),
  IsUrl: jest.fn(() => jest.fn()),
  IsEmail: jest.fn(() => jest.fn()),
  Length: jest.fn(() => jest.fn()),
  MinLength: jest.fn(() => jest.fn()),
  MaxLength: jest.fn(() => jest.fn()),
  ArrayNotEmpty: jest.fn(() => jest.fn()),
  ArrayMinSize: jest.fn(() => jest.fn()),
  ArrayMaxSize: jest.fn(() => jest.fn()),
  IsDecimal: jest.fn(() => jest.fn()),
  IsNumberString: jest.fn(() => jest.fn()),
  Matches: jest.fn(() => jest.fn()),
  IsDate: jest.fn(() => jest.fn()),
  IsObject: jest.fn(() => jest.fn()),
  IsIn: jest.fn(() => jest.fn()),
  Contains: jest.fn(() => jest.fn()),
  NotContains: jest.fn(() => jest.fn()),
  IsAlpha: jest.fn(() => jest.fn()),
  IsAlphanumeric: jest.fn(() => jest.fn()),
  IsAscii: jest.fn(() => jest.fn()),
  IsBase64: jest.fn(() => jest.fn()),
  IsByteLength: jest.fn(() => jest.fn()),
  IsCreditCard: jest.fn(() => jest.fn()),
  IsCurrency: jest.fn(() => jest.fn()),
  IsDataURI: jest.fn(() => jest.fn()),
  IsEmpty: jest.fn(() => jest.fn()),
  IsFQDN: jest.fn(() => jest.fn()),
  IsFullWidth: jest.fn(() => jest.fn()),
  IsHalfWidth: jest.fn(() => jest.fn()),
  IsHexColor: jest.fn(() => jest.fn()),
  IsHexadecimal: jest.fn(() => jest.fn()),
  IsIP: jest.fn(() => jest.fn()),
  IsISBN: jest.fn(() => jest.fn()),
  IsISIN: jest.fn(() => jest.fn()),
  IsISO8601: jest.fn(() => jest.fn()),
  IsJSON: jest.fn(() => jest.fn()),
  IsJWT: jest.fn(() => jest.fn()),
  IsLowercase: jest.fn(() => jest.fn()),
  IsMACAddress: jest.fn(() => jest.fn()),
  IsMD5: jest.fn(() => jest.fn()),
  IsMimeType: jest.fn(() => jest.fn()),
  IsMobilePhone: jest.fn(() => jest.fn()),
  IsMongoId: jest.fn(() => jest.fn()),
  IsMultibyte: jest.fn(() => jest.fn()),
  IsNegative: jest.fn(() => jest.fn()),
  IsNumeric: jest.fn(() => jest.fn()),
  IsPort: jest.fn(() => jest.fn()),
  IsPostalCode: jest.fn(() => jest.fn()),
  IsSurrogatePair: jest.fn(() => jest.fn()),
  IsUppercase: jest.fn(() => jest.fn()),
  IsVariableWidth: jest.fn(() => jest.fn()),
  IsWhitelisted: jest.fn(() => jest.fn()),
}));

describe('ProductService - deleteProductCategory', () => {
  let service: ProductService;
  let logger: Logger;
  let loggerErrorSpy: jest.SpyInstance;

  const mockPrismaClient = {
    categoryProduct: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
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
        Logger,
        {
          provide: PaginationService,
          useValue: {
            paginate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    logger = module.get(Logger);
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    // Reset all mocks
    jest.clearAllMocks();
    loggerErrorSpy.mockClear();
    (plainToInstance as jest.Mock).mockImplementation((cls: unknown, obj: unknown) => obj);
    (validateOrReject as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Happy Path', () => {
    it('should successfully delete product category', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Electronics',
          parentId: null,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      const result = await service.deleteProductCategory(deleteDto);

      // Assert
      expect(plainToInstance).toHaveBeenCalledWith(DeleteProductCategoryDto, deleteDto);
      expect(validateOrReject).toHaveBeenCalledWith(deleteDto);
      expect(mockPrismaClient.categoryProduct.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaClient.categoryProduct.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          product: true,
          category: true,
        },
      });

      expect(result).toEqual({
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Electronics',
          parentId: undefined,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          sku: 'SKU123',
        },
      });
    });

    it('should handle null parentId correctly', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: null,
        category: {
          id: 10,
          name: 'Electronics',
          parentId: null,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      const result = await service.deleteProductCategory(deleteDto);

      // Assert
      expect(result.category?.parentId).toBeUndefined();
      expect(result.updatedAt).toBeUndefined();
    });
  });

  describe('Validation Errors', () => {
    it('should throw TypedRpcException when validation fails', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const validationError = new Error('Validation failed');
      const validateOrRejectMock = validateOrReject as jest.Mock;
      validateOrRejectMock.mockRejectedValue(validationError);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error deleting product category:',
        validationError,
      );
    });

    it('should handle invalid ID type', async () => {
      // Arrange
      const deleteDto = { id: 'invalid' } as unknown as DeleteProductCategoryDto;
      const validationError = new Error('ID must be a number');
      const validateOrRejectMock = validateOrReject as jest.Mock;
      validateOrRejectMock.mockRejectedValue(validationError);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);
    });
  });

  describe('Not Found Errors', () => {
    it('should throw TypedRpcException when relationship does not exist', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 999 };
      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);

      try {
        await service.deleteProductCategory(deleteDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.NOT_FOUND);
        expect(rpcError.message).toBe('common.product.productCategory.error.relationshipNotFound');
      }

      expect(mockPrismaClient.categoryProduct.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(mockPrismaClient.categoryProduct.delete).not.toHaveBeenCalled();
    });

    it('should handle findUnique returning undefined', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);
    });
  });

  describe('Database Errors', () => {
    it('should handle database error during findUnique', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const dbError = new Error('Database connection failed');
      const findUniqueMock = mockPrismaClient.categoryProduct.findUnique;
      findUniqueMock.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);

      try {
        await service.deleteProductCategory(deleteDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(rpcError.message).toBe('common.product.action.deleteProductCategory.failed');
      }

      expect(loggerErrorSpy).toHaveBeenCalledWith('Error deleting product category:', dbError);
    });

    it('should handle database error during delete operation', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const dbError = new Error('Foreign key constraint violation');

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      const deleteMock = mockPrismaClient.categoryProduct.delete;
      deleteMock.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error deleting product category:', dbError);
    });

    it('should handle Prisma unique constraint error', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const prismaError = new Error('Unique constraint failed');
      prismaError.name = 'PrismaClientKnownRequestError';

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      const deleteMock = mockPrismaClient.categoryProduct.delete;
      deleteMock.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero ID', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 0 };
      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);
      expect(mockPrismaClient.categoryProduct.findUnique).toHaveBeenCalledWith({
        where: { id: 0 },
      });
    });

    it('should handle negative ID', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: -1 };
      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);
    });

    it('should handle very large ID', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: Number.MAX_SAFE_INTEGER };
      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);
    });

    it('should handle null updatedAt in response', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: null,
        category: {
          id: 10,
          name: 'Electronics',
          parentId: 5,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      const result = await service.deleteProductCategory(deleteDto);

      // Assert
      expect(result.updatedAt).toBeUndefined();
      expect(result.category?.parentId).toBe(5);
    });
  });

  describe('Type Safety', () => {
    it('should maintain strict typing for input DTO', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Electronics',
          parentId: null,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      const result: ProductCategoryResponse = await service.deleteProductCategory(deleteDto);

      // Assert - Type checking
      expect(typeof result.id).toBe('number');
      expect(typeof result.categoryId).toBe('number');
      expect(typeof result.productId).toBe('number');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(typeof result.category?.id).toBe('number');
      expect(typeof result.category?.name).toBe('string');
      expect(typeof result.product?.id).toBe('number');
      expect(typeof result.product?.name).toBe('string');
      expect(typeof result.product?.sku).toBe('string');
    });

    it('should ensure DTO immutability', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const originalDto = { ...deleteDto };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Electronics',
          parentId: null,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      await service.deleteProductCategory(deleteDto);

      // Assert - DTO should remain unchanged
      expect(deleteDto).toEqual(originalDto);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate TypedRpcException without wrapping', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const originalError = new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'custom.error.message',
      });
      const findUniqueMock = mockPrismaClient.categoryProduct.findUnique;
      findUniqueMock.mockRejectedValue(originalError);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(originalError);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error deleting product category:',
        originalError,
      );
    });

    it('should wrap non-TypedRpcException errors', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const originalError = new Error('Unexpected error');
      const findUniqueMock = mockPrismaClient.categoryProduct.findUnique;
      findUniqueMock.mockRejectedValue(originalError);

      // Act & Assert
      await expect(service.deleteProductCategory(deleteDto)).rejects.toThrow(TypedRpcException);

      try {
        await service.deleteProductCategory(deleteDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = (error as TypedRpcException).getError();
        expect(rpcError.code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(rpcError.message).toBe('common.product.action.deleteProductCategory.failed');
      }

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error deleting product category:',
        originalError,
      );
    });
  });

  describe('Response Structure Validation', () => {
    it('should return correct response structure', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Electronics',
          parentId: 5,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      const result = await service.deleteProductCategory(deleteDto);

      // Assert - Verify response structure
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('categoryId');
      expect(result).toHaveProperty('productId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('product');

      expect(result.category).toHaveProperty('id');
      expect(result.category).toHaveProperty('name');
      expect(result.category).toHaveProperty('parentId');

      expect(result.product).toHaveProperty('id');
      expect(result.product).toHaveProperty('name');
      expect(result.product).toHaveProperty('sku');
    });

    it('should handle missing optional fields gracefully', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: undefined,
        category: {
          id: 10,
          name: 'Electronics',
          parentId: undefined,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      const result = await service.deleteProductCategory(deleteDto);

      // Assert
      expect(result.updatedAt).toBeUndefined();
      expect(result.category?.parentId).toBeUndefined();
    });
  });

  describe('Logging', () => {
    it('should log errors appropriately', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const dbError = new Error('Database error');
      const findUniqueMock = mockPrismaClient.categoryProduct.findUnique;
      findUniqueMock.mockRejectedValue(dbError);

      // Act
      try {
        await service.deleteProductCategory(deleteDto);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error deleting product category:', dbError);
    });

    it('should not log when operation succeeds', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Electronics',
          parentId: null,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      await service.deleteProductCategory(deleteDto);

      // Assert
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Method Call Verification', () => {
    it('should call all required methods in correct order', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Electronics',
          parentId: null,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      await service.deleteProductCategory(deleteDto);

      // Assert - Verify call order and parameters
      expect(plainToInstance).toHaveBeenCalled();
      expect(validateOrReject).toHaveBeenCalled();
      expect(mockPrismaClient.categoryProduct.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.categoryProduct.delete).toHaveBeenCalled();
    });

    it('should include correct relations in delete query', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Electronics',
          parentId: null,
        },
        product: {
          id: 20,
          name: 'Smartphone',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      await service.deleteProductCategory(deleteDto);

      // Assert
      expect(mockPrismaClient.categoryProduct.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          product: true,
          category: true,
        },
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle relationship with complex category hierarchy', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 10, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 10,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 10,
          name: 'Smartphones',
          parentId: 5, // Has parent category
        },
        product: {
          id: 20,
          name: 'iPhone 15',
          skuId: 'APPLE-IP15-128GB',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      const result = await service.deleteProductCategory(deleteDto);

      // Assert
      expect(result.category?.parentId).toBe(5);
      expect(result.product?.sku).toBe('APPLE-IP15-128GB');
    });

    it('should handle relationship with root category', async () => {
      // Arrange
      const deleteDto: DeleteProductCategoryDto = { id: 1 };
      const existingRelationship = { id: 1, categoryId: 1, productId: 20 };
      const deletedProductCategory = {
        id: 1,
        categoryId: 1,
        productId: 20,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        category: {
          id: 1,
          name: 'Root Category',
          parentId: null, // Root category
        },
        product: {
          id: 20,
          name: 'Product',
          skuId: 'SKU123',
        },
      };

      mockPrismaClient.categoryProduct.findUnique.mockResolvedValue(existingRelationship);
      mockPrismaClient.categoryProduct.delete.mockResolvedValue(deletedProductCategory);

      // Act
      const result = await service.deleteProductCategory(deleteDto);

      // Assert
      expect(result.category?.parentId).toBeUndefined();
      expect(result.categoryId).toBe(1);
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle null input gracefully', async () => {
      // Arrange
      const validationError = new Error('Input cannot be null');
      const validateOrRejectMock = validateOrReject as jest.Mock;
      validateOrRejectMock.mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        service.deleteProductCategory(null as unknown as DeleteProductCategoryDto),
      ).rejects.toThrow(TypedRpcException);
    });

    it('should handle undefined input gracefully', async () => {
      // Arrange
      const validationError = new Error('Input cannot be undefined');
      const validateOrRejectMock = validateOrReject as jest.Mock;
      validateOrRejectMock.mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        service.deleteProductCategory(undefined as unknown as DeleteProductCategoryDto),
      ).rejects.toThrow(TypedRpcException);
    });

    it('should handle empty object input', async () => {
      // Arrange
      const validationError = new Error('ID is required');
      const validateOrRejectMock = validateOrReject as jest.Mock;
      validateOrRejectMock.mockRejectedValue(validationError);

      // Act & Assert
      await expect(service.deleteProductCategory({} as DeleteProductCategoryDto)).rejects.toThrow(
        TypedRpcException,
      );
    });
  });
});
