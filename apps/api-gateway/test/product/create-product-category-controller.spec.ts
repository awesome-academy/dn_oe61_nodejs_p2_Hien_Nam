import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ProductController } from '../../src/product/admin/product.controller';
import { ProductService } from '../../src/product/admin/product.service';
import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';

describe('ProductController - createProductCategory', () => {
  let controller: ProductController;
  let productService: ProductService;
  let moduleRef: TestingModule;

  const mockProductService = {
    createProductCategory: jest.fn(),
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
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      category: {
        id: 1,
        name: 'Electronics',
        parentId: undefined,
      },
      product: {
        id: 100,
        name: 'Test Product',
        sku: 'TEST-SKU-001',
      },
    };

    const mockSuccessResponse: BaseResponse<ProductCategoryResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductCategoryResponse,
    };

    it('should create product category successfully with valid input', async () => {
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createProductCategory(validCreateProductCategoryDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
      expect(productServiceCreateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockProductCategoryResponse);
      expect(result.data!.id).toBe(1);
      expect(result.data!.categoryId).toBe(validCreateProductCategoryDto.categoryId);
      expect(result.data!.productId).toBe(validCreateProductCategoryDto.productId);
    });

    it('should create product category with minimum required fields', async () => {
      const minimalDto: CreateProductCategoryDto = {
        categoryId: 2,
        productId: 200,
      };

      const minimalResponse: ProductCategoryResponse = {
        id: 2,
        categoryId: 2,
        productId: 200,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: undefined,
        category: undefined,
        product: undefined,
      };

      const minimalSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: minimalResponse,
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(minimalSuccessResponse);

      const result = await controller.createProductCategory(minimalDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(minimalDto);
      expect(productServiceCreateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(minimalSuccessResponse);
      expect(result.data!.categoryId).toBe(2);
      expect(result.data!.productId).toBe(200);
      expect(result.data!.category).toBeUndefined();
      expect(result.data!.product).toBeUndefined();
    });

    it('should create product category with nested category data', async () => {
      const dtoWithNestedCategory: CreateProductCategoryDto = {
        categoryId: 3,
        productId: 300,
      };

      const responseWithNestedCategory: ProductCategoryResponse = {
        id: 3,
        categoryId: 3,
        productId: 300,
        createdAt: new Date('2024-01-03T00:00:00.000Z'),
        updatedAt: new Date('2024-01-03T00:00:00.000Z'),
        category: {
          id: 3,
          name: 'Food & Beverages',
          parentId: 1,
        },
        product: {
          id: 300,
          name: 'Premium Coffee',
          sku: 'COFFEE-001',
        },
      };

      const nestedSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: responseWithNestedCategory,
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(nestedSuccessResponse);

      const result = await controller.createProductCategory(dtoWithNestedCategory);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(dtoWithNestedCategory);
      expect(result.data!.category).toBeDefined();
      expect(result.data!.category!.name).toBe('Food & Beverages');
      expect(result.data!.category!.parentId).toBe(1);
      expect(result.data!.product).toBeDefined();
      expect(result.data!.product!.name).toBe('Premium Coffee');
      expect(result.data!.product!.sku).toBe('COFFEE-001');
    });

    it('should handle large categoryId and productId values', async () => {
      const largeCategoryId = 999999;
      const largeProductId = 888888;
      const largeIdsDto: CreateProductCategoryDto = {
        categoryId: largeCategoryId,
        productId: largeProductId,
      };

      const largeIdsResponse: ProductCategoryResponse = {
        id: 999,
        categoryId: largeCategoryId,
        productId: largeProductId,
        createdAt: new Date('2024-01-04T00:00:00.000Z'),
        updatedAt: new Date('2024-01-04T00:00:00.000Z'),
      };

      const largeIdsSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: largeIdsResponse,
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(largeIdsSuccessResponse);

      const result = await controller.createProductCategory(largeIdsDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(largeIdsDto);
      expect(result.data!.categoryId).toBe(largeCategoryId);
      expect(result.data!.productId).toBe(largeProductId);
    });

    it('should propagate BadRequestException from service', async () => {
      const errorMessage = 'Product category association already exists';
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
    });

    it('should propagate BadRequestException when category not found', async () => {
      const invalidCategoryDto: CreateProductCategoryDto = {
        categoryId: 99999,
        productId: 100,
      };

      const errorMessage = 'Category not found';
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.createProductCategory(invalidCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductCategory(invalidCategoryDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(invalidCategoryDto);
    });

    it('should propagate BadRequestException when product not found', async () => {
      const invalidProductDto: CreateProductCategoryDto = {
        categoryId: 1,
        productId: 99999,
      };

      const errorMessage = 'Product not found';
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.createProductCategory(invalidProductDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductCategory(invalidProductDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(invalidProductDto);
    });

    it('should propagate generic Error from service', async () => {
      const errorMessage = 'Internal server error';
      const genericError = new Error(errorMessage);
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(genericError);

      await expect(controller.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
        Error,
      );
      await expect(controller.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
    });

    it('should handle null input gracefully', async () => {
      const nullDto = null as unknown as CreateProductCategoryDto;
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.createProductCategory(nullDto)).rejects.toThrow(BadRequestException);
      expect(productServiceCreateSpy).toHaveBeenCalledWith(nullDto);
    });

    it('should handle undefined input gracefully', async () => {
      const undefinedDto = undefined as unknown as CreateProductCategoryDto;
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.createProductCategory(undefinedDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(undefinedDto);
    });

    it('should handle service returning null response', async () => {
      const nullResponse = null as unknown as BaseResponse<ProductCategoryResponse>;
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(nullResponse);

      const result = await controller.createProductCategory(validCreateProductCategoryDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
      expect(result).toBeNull();
    });

    it('should handle service returning undefined response', async () => {
      const undefinedResponse = undefined as unknown as BaseResponse<ProductCategoryResponse>;
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(undefinedResponse);

      const result = await controller.createProductCategory(validCreateProductCategoryDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
      expect(result).toBeUndefined();
    });

    it('should handle zero categoryId', async () => {
      const zeroCategoryDto: CreateProductCategoryDto = {
        categoryId: 0,
        productId: 100,
      };

      const zeroResponse: ProductCategoryResponse = {
        id: 10,
        categoryId: 0,
        productId: 100,
        createdAt: new Date('2024-01-05T00:00:00.000Z'),
        updatedAt: new Date('2024-01-05T00:00:00.000Z'),
      };

      const zeroSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: zeroResponse,
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(zeroSuccessResponse);

      const result = await controller.createProductCategory(zeroCategoryDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(zeroCategoryDto);
      expect(result.data!.categoryId).toBe(0);
      expect(result.data!.productId).toBe(100);
    });

    it('should handle zero productId', async () => {
      const zeroProductDto: CreateProductCategoryDto = {
        categoryId: 1,
        productId: 0,
      };

      const zeroProductResponse: ProductCategoryResponse = {
        id: 11,
        categoryId: 1,
        productId: 0,
        createdAt: new Date('2024-01-06T00:00:00.000Z'),
        updatedAt: new Date('2024-01-06T00:00:00.000Z'),
      };

      const zeroProductSuccessResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: zeroProductResponse,
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(zeroProductSuccessResponse);

      const result = await controller.createProductCategory(zeroProductDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(zeroProductDto);
      expect(result.data!.categoryId).toBe(1);
      expect(result.data!.productId).toBe(0);
    });

    it('should handle negative categoryId', async () => {
      const negativeCategoryDto: CreateProductCategoryDto = {
        categoryId: -1,
        productId: 100,
      };

      const errorMessage = 'Invalid category ID';
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.createProductCategory(negativeCategoryDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductCategory(negativeCategoryDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(negativeCategoryDto);
    });

    it('should handle negative productId', async () => {
      const negativeProductDto: CreateProductCategoryDto = {
        categoryId: 1,
        productId: -100,
      };

      const errorMessage = 'Invalid product ID';
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.createProductCategory(negativeProductDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductCategory(negativeProductDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(negativeProductDto);
    });

    it('should handle duplicate product category association', async () => {
      const duplicateDto: CreateProductCategoryDto = {
        categoryId: 1,
        productId: 100,
      };

      const errorMessage = 'Product category association already exists';
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.createProductCategory(duplicateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductCategory(duplicateDto)).rejects.toThrow(errorMessage);
      expect(productServiceCreateSpy).toHaveBeenCalledWith(duplicateDto);
    });

    it('should handle service timeout error', async () => {
      const timeoutError = new Error('Request timeout');
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(timeoutError);

      await expect(controller.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
        'Request timeout',
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
    });

    it('should handle microservice connection error', async () => {
      const connectionError = new Error('Microservice unavailable');
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockRejectedValue(connectionError);

      await expect(controller.createProductCategory(validCreateProductCategoryDto)).rejects.toThrow(
        'Microservice unavailable',
      );
      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
    });

    it('should verify response structure contains all required fields', async () => {
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createProductCategory(validCreateProductCategoryDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
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

    it('should handle response with only required fields', async () => {
      const minimalResponseData: ProductCategoryResponse = {
        id: 99,
        categoryId: 5,
        productId: 500,
        createdAt: new Date('2024-01-07T00:00:00.000Z'),
      };

      const minimalResponse: BaseResponse<ProductCategoryResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: minimalResponseData,
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(minimalResponse);

      const result = await controller.createProductCategory(validCreateProductCategoryDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
      expect(result.data!.id).toBe(99);
      expect(result.data!.categoryId).toBe(5);
      expect(result.data!.productId).toBe(500);
      expect(result.data!.updatedAt).toBeUndefined();
      expect(result.data!.category).toBeUndefined();
      expect(result.data!.product).toBeUndefined();
    });

    it('should maintain type safety without using any', async () => {
      const productServiceCreateSpy = jest
        .spyOn(productService, 'createProductCategory')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createProductCategory(validCreateProductCategoryDto);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(validCreateProductCategoryDto);
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
  });
});
