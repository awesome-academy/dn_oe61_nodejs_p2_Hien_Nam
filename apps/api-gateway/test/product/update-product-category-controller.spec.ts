import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ProductController } from '../../src/product/admin/product.controller';
import { ProductService } from '../../src/product/admin/product.service';
import { UpdateProductCategoryBodyDto } from '@app/common/dto/product/update-product-category.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';

describe('ProductController - updateProductCategory', () => {
  let controller: ProductController;
  let productService: ProductService;
  let moduleRef: TestingModule;

  const mockProductService = {
    updateProductCategory: jest.fn(),
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

  describe('updateProductCategory', () => {
    const validId = 1;
    const validUpdateProductCategoryBodyDto: UpdateProductCategoryBodyDto = {
      categoryId: 2,
      productId: 200,
    };

    const mockProductCategoryResponse: ProductCategoryResponse = {
      id: 1,
      categoryId: 2,
      productId: 200,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      category: {
        id: 2,
        name: 'Updated Category',
        parentId: undefined,
      },
      product: {
        id: 200,
        name: 'Updated Product',
        sku: 'UPDATED-SKU-001',
      },
    };

    const mockSuccessResponse: BaseResponse<ProductCategoryResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductCategoryResponse,
    };

    it('should update product category successfully with valid input', async () => {
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.updateProductCategory(
        validId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
      expect(productServiceUpdateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockProductCategoryResponse);
      expect(result.data!.id).toBe(1);
      expect(result.data!.categoryId).toBe(2);
      expect(result.data!.productId).toBe(200);
    });

    it('should update product category with only categoryId', async () => {
      const partialDto: UpdateProductCategoryBodyDto = {
        categoryId: 3,
      };

      const partialResponse: ProductCategoryResponse = {
        id: 1,
        categoryId: 3,
        productId: 200, // Original productId unchanged
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const partialSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: partialResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(partialSuccessResponse);

      const result = await controller.updateProductCategory(validId, partialDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...partialDto,
        id: validId,
      });
      expect(result.data!.categoryId).toBe(3);
      expect(result.data!.productId).toBe(200);
    });

    it('should update product category with only productId', async () => {
      const partialDto: UpdateProductCategoryBodyDto = {
        productId: 300,
      };

      const partialResponse: ProductCategoryResponse = {
        id: 1,
        categoryId: 2, // Original categoryId unchanged
        productId: 300,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const partialSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: partialResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(partialSuccessResponse);

      const result = await controller.updateProductCategory(validId, partialDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...partialDto,
        id: validId,
      });
      expect(result.data!.categoryId).toBe(2);
      expect(result.data!.productId).toBe(300);
    });

    it('should update product category with empty body', async () => {
      const emptyDto: UpdateProductCategoryBodyDto = {};

      const emptyResponse: ProductCategoryResponse = {
        id: 1,
        categoryId: 2, // Original values unchanged
        productId: 200,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const emptySuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: emptyResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(emptySuccessResponse);

      const result = await controller.updateProductCategory(validId, emptyDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...emptyDto,
        id: validId,
      });
      expect(result.data!.id).toBe(1);
    });

    it('should handle zero id parameter', async () => {
      const zeroId = 0;
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.updateProductCategory(
        zeroId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: zeroId,
      });
      expect(productServiceUpdateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle negative id parameter', async () => {
      const negativeId = -1;
      const errorMessage = 'Invalid product category ID';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(
        controller.updateProductCategory(negativeId, validUpdateProductCategoryBodyDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.updateProductCategory(negativeId, validUpdateProductCategoryBodyDto),
      ).rejects.toThrow(errorMessage);
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: negativeId,
      });
    });

    it('should handle large id values', async () => {
      const largeId = 999999;
      const largeIdResponse: ProductCategoryResponse = {
        id: largeId,
        categoryId: 2,
        productId: 200,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const largeIdSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: largeIdResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(largeIdSuccessResponse);

      const result = await controller.updateProductCategory(
        largeId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: largeId,
      });
      expect(result.data!.id).toBe(largeId);
    });

    it('should handle zero categoryId in body', async () => {
      const zeroCategoryDto: UpdateProductCategoryBodyDto = {
        categoryId: 0,
        productId: 200,
      };

      const zeroResponse: ProductCategoryResponse = {
        id: 1,
        categoryId: 0,
        productId: 200,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const zeroSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: zeroResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(zeroSuccessResponse);

      const result = await controller.updateProductCategory(validId, zeroCategoryDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...zeroCategoryDto,
        id: validId,
      });
      expect(result.data!.categoryId).toBe(0);
    });

    it('should handle zero productId in body', async () => {
      const zeroProductDto: UpdateProductCategoryBodyDto = {
        categoryId: 2,
        productId: 0,
      };

      const zeroProductResponse: ProductCategoryResponse = {
        id: 1,
        categoryId: 2,
        productId: 0,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const zeroProductSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: zeroProductResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(zeroProductSuccessResponse);

      const result = await controller.updateProductCategory(validId, zeroProductDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...zeroProductDto,
        id: validId,
      });
      expect(result.data!.productId).toBe(0);
    });

    it('should propagate BadRequestException when product category not found', async () => {
      const notFoundId = 99999;
      const errorMessage = 'Product category not found';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(
        controller.updateProductCategory(notFoundId, validUpdateProductCategoryBodyDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.updateProductCategory(notFoundId, validUpdateProductCategoryBodyDto),
      ).rejects.toThrow(errorMessage);
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: notFoundId,
      });
    });

    it('should propagate BadRequestException when category not found', async () => {
      const invalidCategoryDto: UpdateProductCategoryBodyDto = {
        categoryId: 99999,
        productId: 200,
      };

      const errorMessage = 'Category not found';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.updateProductCategory(validId, invalidCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.updateProductCategory(validId, invalidCategoryDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...invalidCategoryDto,
        id: validId,
      });
    });

    it('should propagate BadRequestException when product not found', async () => {
      const invalidProductDto: UpdateProductCategoryBodyDto = {
        categoryId: 2,
        productId: 99999,
      };

      const errorMessage = 'Product not found';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.updateProductCategory(validId, invalidProductDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.updateProductCategory(validId, invalidProductDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...invalidProductDto,
        id: validId,
      });
    });

    it('should propagate BadRequestException for duplicate association', async () => {
      const duplicateDto: UpdateProductCategoryBodyDto = {
        categoryId: 1,
        productId: 100,
      };

      const errorMessage = 'Product category association already exists';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.updateProductCategory(validId, duplicateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.updateProductCategory(validId, duplicateDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...duplicateDto,
        id: validId,
      });
    });

    it('should propagate generic Error from service', async () => {
      const errorMessage = 'Internal server error';
      const genericError = new Error(errorMessage);
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(genericError);

      await expect(
        controller.updateProductCategory(validId, validUpdateProductCategoryBodyDto),
      ).rejects.toThrow(Error);
      await expect(
        controller.updateProductCategory(validId, validUpdateProductCategoryBodyDto),
      ).rejects.toThrow(errorMessage);
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
    });

    it('should handle null body input gracefully', async () => {
      const nullDto = null as unknown as UpdateProductCategoryBodyDto;
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.updateProductCategory(validId, nullDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...nullDto,
        id: validId,
      });
    });

    it('should handle undefined body input gracefully', async () => {
      const undefinedDto = undefined as unknown as UpdateProductCategoryBodyDto;
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.updateProductCategory(validId, undefinedDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...undefinedDto,
        id: validId,
      });
    });

    it('should handle service returning null response', async () => {
      const nullResponse = null as unknown as BaseResponse<ProductCategoryResponse>;
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(nullResponse);

      const result = await controller.updateProductCategory(
        validId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
      expect(result).toBeNull();
    });

    it('should handle service returning undefined response', async () => {
      const undefinedResponse = undefined as unknown as BaseResponse<ProductCategoryResponse>;
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(undefinedResponse);

      const result = await controller.updateProductCategory(
        validId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
      expect(result).toBeUndefined();
    });

    it('should handle negative categoryId in body', async () => {
      const negativeCategoryDto: UpdateProductCategoryBodyDto = {
        categoryId: -1,
        productId: 200,
      };

      const errorMessage = 'Invalid category ID';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.updateProductCategory(validId, negativeCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.updateProductCategory(validId, negativeCategoryDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...negativeCategoryDto,
        id: validId,
      });
    });

    it('should handle negative productId in body', async () => {
      const negativeProductDto: UpdateProductCategoryBodyDto = {
        categoryId: 2,
        productId: -100,
      };

      const errorMessage = 'Invalid product ID';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.updateProductCategory(validId, negativeProductDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.updateProductCategory(validId, negativeProductDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...negativeProductDto,
        id: validId,
      });
    });

    it('should handle service timeout error', async () => {
      const timeoutError = new Error('Request timeout');
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(timeoutError);

      await expect(
        controller.updateProductCategory(validId, validUpdateProductCategoryBodyDto),
      ).rejects.toThrow('Request timeout');
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
    });

    it('should handle microservice connection error', async () => {
      const connectionError = new Error('Microservice unavailable');
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockRejectedValue(connectionError);

      await expect(
        controller.updateProductCategory(validId, validUpdateProductCategoryBodyDto),
      ).rejects.toThrow('Microservice unavailable');
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
    });

    it('should verify correct parameter merging with spread operator', async () => {
      const testId = 123;
      const testDto: UpdateProductCategoryBodyDto = {
        categoryId: 456,
        productId: 789,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      await controller.updateProductCategory(testId, testDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        categoryId: 456,
        productId: 789,
        id: 123,
      });
    });

    it('should verify response structure contains all required fields', async () => {
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.updateProductCategory(
        validId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
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
        productId: 200,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        category: {
          id: 2,
          name: 'Electronics',
          parentId: 1,
        },
        product: {
          id: 200,
          name: 'Smartphone',
          sku: 'PHONE-001',
        },
      };

      const nestedSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: nestedResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(nestedSuccessResponse);

      const result = await controller.updateProductCategory(
        validId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
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
        productId: 200,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const requiredFieldsSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: requiredFieldsResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(requiredFieldsSuccessResponse);

      const result = await controller.updateProductCategory(
        validId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
      expect(result.data!.id).toBe(1);
      expect(result.data!.categoryId).toBe(2);
      expect(result.data!.productId).toBe(200);
      expect(result.data!.updatedAt).toBeUndefined();
      expect(result.data!.category).toBeUndefined();
      expect(result.data!.product).toBeUndefined();
    });

    it('should maintain type safety without using any', async () => {
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.updateProductCategory(
        validId,
        validUpdateProductCategoryBodyDto,
      );

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        ...validUpdateProductCategoryBodyDto,
        id: validId,
      });
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

    it('should verify parameter transformation preserves original input', async () => {
      const originalDto: UpdateProductCategoryBodyDto = {
        categoryId: 10,
        productId: 20,
      };
      const testId = 5;

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      await controller.updateProductCategory(testId, originalDto);

      // Verify that the original DTO is not mutated
      expect(originalDto).toEqual({
        categoryId: 10,
        productId: 20,
      });

      // Verify service receives correct merged object
      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        categoryId: 10,
        productId: 20,
        id: 5,
      });
    });

    it('should handle undefined optional fields correctly', async () => {
      const partialDto: UpdateProductCategoryBodyDto = {
        categoryId: undefined,
        productId: 300,
      };

      const partialResponse: ProductCategoryResponse = {
        id: 1,
        categoryId: 2, // Original categoryId unchanged
        productId: 300,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const partialSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: partialResponse,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'updateProductCategory')
        .mockResolvedValue(partialSuccessResponse);

      const result = await controller.updateProductCategory(validId, partialDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith({
        categoryId: undefined,
        productId: 300,
        id: validId,
      });
      expect(result.data!.categoryId).toBe(2);
      expect(result.data!.productId).toBe(300);
    });
  });
});
