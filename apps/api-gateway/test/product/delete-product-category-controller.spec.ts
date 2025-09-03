import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ProductController } from '../../src/product/admin/product.controller';
import { ProductService } from '../../src/product/admin/product.service';
import { DeleteProductCategoryDto } from '@app/common/dto/product/delete-product-category.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';

describe('ProductController - deleteProductCategory', () => {
  let controller: ProductController;
  let productService: ProductService;
  let moduleRef: TestingModule;

  const mockProductService = {
    deleteProductCategory: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn().mockReturnValue('Mock translation'),
  };

  const mockReflector = {
    get: jest.fn(),
    getAll: jest.fn(),
    getAllAndMerge: jest.fn(),
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = moduleRef.get<ProductController>(ProductController);
    productService = moduleRef.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteProductCategory', () => {
    const validDeleteProductCategoryDto: DeleteProductCategoryDto = {
      id: 1,
    };

    const mockProductCategoryResponse: ProductCategoryResponse = {
      id: 1,
      categoryId: 2,
      productId: 100,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      category: {
        id: 2,
        name: 'Deleted Category',
        parentId: undefined,
      },
      product: {
        id: 100,
        name: 'Deleted Product',
        sku: 'DELETED-SKU-001',
      },
    };

    const mockSuccessResponse: BaseResponse<ProductCategoryResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductCategoryResponse,
    };

    it('should delete product category successfully with valid input', async () => {
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(productServiceDeleteSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockProductCategoryResponse);
      expect(result.data!.id).toBe(1);
      expect(result.data!.categoryId).toBe(2);
      expect(result.data!.productId).toBe(100);
    });

    it('should delete product category with zero id', async () => {
      const zeroIdDto: DeleteProductCategoryDto = {
        id: 0,
      };

      const zeroResponse: ProductCategoryResponse = {
        id: 0,
        categoryId: 1,
        productId: 50,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const zeroSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: zeroResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(zeroSuccessResponse);

      const result = await controller.deleteProductCategory(zeroIdDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(zeroIdDto);
      expect(productServiceDeleteSpy).toHaveBeenCalledTimes(1);
      expect(result.data!.id).toBe(0);
    });

    it('should delete product category with large id value', async () => {
      const largeIdDto: DeleteProductCategoryDto = {
        id: 999999,
      };

      const largeIdResponse: ProductCategoryResponse = {
        id: 999999,
        categoryId: 5,
        productId: 500,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const largeIdSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: largeIdResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(largeIdSuccessResponse);

      const result = await controller.deleteProductCategory(largeIdDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(largeIdDto);
      expect(result.data!.id).toBe(999999);
    });

    it('should propagate BadRequestException when product category not found', async () => {
      const notFoundDto: DeleteProductCategoryDto = {
        id: 99999,
      };

      const errorMessage = 'Product category not found';
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.deleteProductCategory(notFoundDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deleteProductCategory(notFoundDto)).rejects.toThrow(errorMessage);
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(notFoundDto);
    });

    it('should propagate BadRequestException for negative id', async () => {
      const negativeIdDto: DeleteProductCategoryDto = {
        id: -1,
      };

      const errorMessage = 'Invalid product category ID';
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.deleteProductCategory(negativeIdDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deleteProductCategory(negativeIdDto)).rejects.toThrow(errorMessage);
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(negativeIdDto);
    });

    it('should propagate BadRequestException when category is in use', async () => {
      const inUseDto: DeleteProductCategoryDto = {
        id: 1,
      };

      const errorMessage = 'Cannot delete product category: category is currently in use';
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.deleteProductCategory(inUseDto)).rejects.toThrow(BadRequestException);
      await expect(controller.deleteProductCategory(inUseDto)).rejects.toThrow(errorMessage);
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(inUseDto);
    });

    it('should propagate generic Error from service', async () => {
      const errorMessage = 'Internal server error';
      const genericError = new Error(errorMessage);
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(genericError);

      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        Error,
      );
      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
    });

    it('should handle null input gracefully', async () => {
      const nullDto = null as unknown as DeleteProductCategoryDto;
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.deleteProductCategory(nullDto)).rejects.toThrow(BadRequestException);
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(nullDto);
    });

    it('should handle undefined input gracefully', async () => {
      const undefinedDto = undefined as unknown as DeleteProductCategoryDto;
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.deleteProductCategory(undefinedDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(undefinedDto);
    });

    it('should handle service returning null response', async () => {
      const nullResponse = null as unknown as BaseResponse<ProductCategoryResponse>;
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(nullResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(result).toBeNull();
    });

    it('should handle service returning undefined response', async () => {
      const undefinedResponse = undefined as unknown as BaseResponse<ProductCategoryResponse>;
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(undefinedResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(result).toBeUndefined();
    });

    it('should handle service timeout error', async () => {
      const timeoutError = new Error('Request timeout');
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(timeoutError);

      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        'Request timeout',
      );
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
    });

    it('should handle microservice connection error', async () => {
      const connectionError = new Error('Microservice unavailable');
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(connectionError);

      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        'Microservice unavailable',
      );
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
    });

    it('should handle database constraint violation', async () => {
      const constraintError = new BadRequestException('Foreign key constraint violation');
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(constraintError);

      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        'Foreign key constraint violation',
      );
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
    });

    it('should verify response structure contains all required fields', async () => {
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
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

    it('should handle response with nested category and product data', async () => {
      const nestedResponse: ProductCategoryResponse = {
        id: 1,
        categoryId: 2,
        productId: 100,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        category: {
          id: 2,
          name: 'Electronics',
          parentId: 1,
        },
        product: {
          id: 100,
          name: 'Smartphone',
          sku: 'PHONE-001',
        },
      };

      const nestedSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: nestedResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(nestedSuccessResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(result.data!.category).toBeDefined();
      expect(result.data!.category!.name).toBe('Electronics');
      expect(result.data!.category!.parentId).toBe(1);
      expect(result.data!.product).toBeDefined();
      expect(result.data!.product!.name).toBe('Smartphone');
      expect(result.data!.product!.sku).toBe('PHONE-001');
    });

    it('should handle response with only required fields', async () => {
      const requiredFieldsResponse: ProductCategoryResponse = {
        id: 1,
        categoryId: 2,
        productId: 100,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const requiredFieldsSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: requiredFieldsResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(requiredFieldsSuccessResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(result.data!.id).toBe(1);
      expect(result.data!.categoryId).toBe(2);
      expect(result.data!.productId).toBe(100);
      expect(result.data!.updatedAt).toBeUndefined();
      expect(result.data!.category).toBeUndefined();
      expect(result.data!.product).toBeUndefined();
    });

    it('should maintain type safety without using any', async () => {
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
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
        if (result.data!.category.parentId !== undefined) {
          expect(typeof result.data!.category.parentId).toBe('number');
        }
      }

      if (result.data!.product) {
        expect(typeof result.data!.product.id).toBe('number');
        expect(typeof result.data!.product.name).toBe('string');
        expect(typeof result.data!.product.sku).toBe('string');
      }
    });

    it('should verify parameter passing preserves original input', async () => {
      const originalDto: DeleteProductCategoryDto = {
        id: 123,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      await controller.deleteProductCategory(originalDto);

      // Verify that the original DTO is not mutated
      expect(originalDto).toEqual({
        id: 123,
      });

      // Verify service receives exact same object
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(originalDto);
    });

    it('should handle deletion of product category with different statuses', async () => {
      const activeDto: DeleteProductCategoryDto = {
        id: 5,
      };

      const activeResponse: ProductCategoryResponse = {
        id: 5,
        categoryId: 3,
        productId: 300,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        category: {
          id: 3,
          name: 'Active Category',
        },
        product: {
          id: 300,
          name: 'Active Product',
          sku: 'ACTIVE-001',
        },
      };

      const activeSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: activeResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(activeSuccessResponse);

      const result = await controller.deleteProductCategory(activeDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(activeDto);
      expect(result.data!.category!.name).toBe('Active Category');
      expect(result.data!.product!.name).toBe('Active Product');
    });

    it('should handle concurrent deletion attempts', async () => {
      const concurrentDto: DeleteProductCategoryDto = {
        id: 10,
      };

      const errorMessage = 'Product category has already been deleted';
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.deleteProductCategory(concurrentDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deleteProductCategory(concurrentDto)).rejects.toThrow(errorMessage);
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(concurrentDto);
    });

    it('should handle deletion with cascade effects', async () => {
      const cascadeDto: DeleteProductCategoryDto = {
        id: 15,
      };

      const cascadeResponse: ProductCategoryResponse = {
        id: 15,
        categoryId: 7,
        productId: 700,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const cascadeSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: cascadeResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(cascadeSuccessResponse);

      const result = await controller.deleteProductCategory(cascadeDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(cascadeDto);
      expect(result.data!.id).toBe(15);
      expect(result.data!.categoryId).toBe(7);
      expect(result.data!.productId).toBe(700);
    });

    it('should handle service permission error', async () => {
      const permissionError = new BadRequestException('Insufficient permissions to delete');
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(permissionError);

      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        'Insufficient permissions to delete',
      );
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
    });

    it('should handle database transaction rollback', async () => {
      const transactionError = new Error('Transaction rollback');
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockRejectedValue(transactionError);

      await expect(controller.deleteProductCategory(validDeleteProductCategoryDto)).rejects.toThrow(
        'Transaction rollback',
      );
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
    });

    it('should handle deletion of product category without nested data', async () => {
      const simpleResponse: ProductCategoryResponse = {
        id: 20,
        categoryId: 8,
        productId: 800,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        category: undefined,
        product: undefined,
      };

      const simpleSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: simpleResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(simpleSuccessResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(result.data!.category).toBeUndefined();
      expect(result.data!.product).toBeUndefined();
      expect(result.data!.id).toBe(20);
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(result.data!.categoryId).toBe(8);
      expect(result.data!.productId).toBe(800);
    });

    it('should verify correct DTO structure validation', async () => {
      const validDto: DeleteProductCategoryDto = {
        id: 25,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      await controller.deleteProductCategory(validDto);

      // Verify DTO has correct structure
      expect(validDto).toHaveProperty('id');
      expect(typeof validDto.id).toBe('number');
      expect(Object.keys(validDto)).toEqual(['id']);
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDto);
    });

    it('should handle deletion with different response timestamps', async () => {
      const timestampResponse: ProductCategoryResponse = {
        id: 30,
        categoryId: 9,
        productId: 900,
        createdAt: new Date('2023-12-01T00:00:00.000Z'),
        updatedAt: new Date('2024-06-15T12:30:45.000Z'),
      };

      const timestampSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: timestampResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(timestampSuccessResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(result.data!.createdAt.getFullYear()).toBe(2023);
      expect(result.data!.updatedAt!.getFullYear()).toBe(2024);
      expect(result.data!.updatedAt!.getMonth()).toBe(5); // June (0-indexed)
    });

    it('should handle edge case with maximum integer id', async () => {
      const maxIntDto: DeleteProductCategoryDto = {
        id: Number.MAX_SAFE_INTEGER,
      };

      const maxIntResponse: ProductCategoryResponse = {
        id: Number.MAX_SAFE_INTEGER,
        categoryId: 1,
        productId: 1,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const maxIntSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: maxIntResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(maxIntSuccessResponse);

      const result = await controller.deleteProductCategory(maxIntDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(maxIntDto);
      expect(result.data!.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should verify service method is called exactly once per request', async () => {
      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      await controller.deleteProductCategory(validDeleteProductCategoryDto);
      await controller.deleteProductCategory(validDeleteProductCategoryDto);
      await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledTimes(3);
      expect(productServiceDeleteSpy).toHaveBeenNthCalledWith(1, validDeleteProductCategoryDto);
      expect(productServiceDeleteSpy).toHaveBeenNthCalledWith(2, validDeleteProductCategoryDto);
      expect(productServiceDeleteSpy).toHaveBeenNthCalledWith(3, validDeleteProductCategoryDto);
    });

    it('should handle deletion returning different status keys', async () => {
      const failedResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.FAILED,
        data: mockProductCategoryResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(failedResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(result.statusKey).toBe(StatusKey.FAILED);
      expect(result.data).toEqual(mockProductCategoryResponse);
    });

    it('should handle deletion with empty category and product references', async () => {
      const emptyRefsResponse: ProductCategoryResponse = {
        id: 40,
        categoryId: 0,
        productId: 0,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        category: {
          id: 0,
          name: '',
        },
        product: {
          id: 0,
          name: '',
          sku: '',
        },
      };

      const emptyRefsSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: emptyRefsResponse,
      };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(emptyRefsSuccessResponse);

      const result = await controller.deleteProductCategory(validDeleteProductCategoryDto);

      expect(productServiceDeleteSpy).toHaveBeenCalledWith(validDeleteProductCategoryDto);
      expect(result.data!.categoryId).toBe(0);
      expect(result.data!.productId).toBe(0);
      expect(result.data!.category!.name).toBe('');
      expect(result.data!.product!.sku).toBe('');
    });

    it('should verify parameter object immutability', async () => {
      const immutableDto: DeleteProductCategoryDto = {
        id: 50,
      };

      // Create a deep copy to compare later
      const originalDto = { ...immutableDto };

      const productServiceDeleteSpy = jest
        .spyOn(productService, 'deleteProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      await controller.deleteProductCategory(immutableDto);

      // Verify original DTO remains unchanged
      expect(immutableDto).toEqual(originalDto);
      expect(productServiceDeleteSpy).toHaveBeenCalledWith(immutableDto);
    });
  });
});
