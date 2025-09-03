import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ProductController } from '../../src/product/product.controller';
import { ProductService } from '../../src/product/product.service';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { Decimal } from '@prisma/client/runtime/library';

describe('ProductController - update', () => {
  let controller: ProductController;
  let productService: ProductService;
  let moduleRef: TestingModule;

  const mockProductService = {
    update: jest.fn(),
    create: jest.fn(),
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

  describe('update', () => {
    const mockSkuId = 'TEST-SKU-001';

    const mockUpdateProductDto: UpdateProductDto = {
      name: 'Updated Product Name',
      description: 'Updated product description',
      status: StatusProduct.IN_STOCK,
      basePrice: 35.99,
      quantity: 150,
    };

    const mockUpdatedProductResponse: ProductResponse = {
      id: 1,
      name: 'Updated Product Name',
      skuId: 'TEST-SKU-001',
      description: 'Updated product description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(35.99),
      quantity: 150,
      images: [],
      variants: [
        {
          id: 1,
          price: 39.99,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          sizeId: 1,
        },
      ],
      categoryIds: [1, 2, 3],
    };

    const mockSuccessResponse: BaseResponse<ProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockUpdatedProductResponse,
    };

    it('should update a product successfully', async () => {
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.update(mockSkuId, mockUpdateProductDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, mockUpdateProductDto);
      expect(productServiceUpdateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should update product with partial data (only name)', async () => {
      const partialUpdateDto: UpdateProductDto = {
        name: 'Only Name Updated',
      };

      const partialUpdateResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          name: 'Only Name Updated',
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(partialUpdateResponse);

      const result = await controller.update(mockSkuId, partialUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, partialUpdateDto);
      expect(result.data!.name).toBe('Only Name Updated');
    });

    it('should update product with partial data (only description)', async () => {
      const partialUpdateDto: UpdateProductDto = {
        description: 'Only description updated',
      };

      const partialUpdateResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          description: 'Only description updated',
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(partialUpdateResponse);

      const result = await controller.update(mockSkuId, partialUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, partialUpdateDto);
      expect(result.data!.description).toBe('Only description updated');
    });

    it('should update product with partial data (only status)', async () => {
      const partialUpdateDto: UpdateProductDto = {
        status: StatusProduct.SOLD_OUT,
      };

      const partialUpdateResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          status: StatusProduct.SOLD_OUT,
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(partialUpdateResponse);

      const result = await controller.update(mockSkuId, partialUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, partialUpdateDto);
      expect(result.data!.status).toBe(StatusProduct.SOLD_OUT);
    });

    it('should update product with partial data (only basePrice)', async () => {
      const partialUpdateDto: UpdateProductDto = {
        basePrice: 99.99,
      };

      const partialUpdateResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          basePrice: new Decimal(99.99),
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(partialUpdateResponse);

      const result = await controller.update(mockSkuId, partialUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, partialUpdateDto);
      expect(result.data!.basePrice.toString()).toBe('99.99');
    });

    it('should update product with partial data (only quantity)', async () => {
      const partialUpdateDto: UpdateProductDto = {
        quantity: 500,
      };

      const partialUpdateResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          quantity: 500,
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(partialUpdateResponse);

      const result = await controller.update(mockSkuId, partialUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, partialUpdateDto);
      expect(result.data!.quantity).toBe(500);
    });

    it('should update product with partial data (only skuId)', async () => {
      const partialUpdateDto: UpdateProductDto = {
        skuId: 'NEW-SKU-002',
      };

      const partialUpdateResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          skuId: 'NEW-SKU-002',
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(partialUpdateResponse);

      const result = await controller.update(mockSkuId, partialUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, partialUpdateDto);
      expect(result.data!.skuId).toBe('NEW-SKU-002');
    });

    it('should update product with all status enum values', async () => {
      const statusValues = [StatusProduct.IN_STOCK, StatusProduct.SOLD_OUT, StatusProduct.PRE_SALE];

      for (const status of statusValues) {
        const statusUpdateDto: UpdateProductDto = {
          status: status,
        };

        const statusUpdateResponse: BaseResponse<ProductResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: {
            ...mockUpdatedProductResponse,
            status: status,
          },
        };

        const productServiceUpdateSpy = jest
          .spyOn(productService, 'update')
          .mockResolvedValue(statusUpdateResponse);

        const result = await controller.update(mockSkuId, statusUpdateDto);

        expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, statusUpdateDto);
        expect(result.data!.status).toBe(status);
      }
    });

    it('should update product with decimal prices with 3 decimal places', async () => {
      const decimalUpdateDto: UpdateProductDto = {
        basePrice: 123.456,
      };

      const decimalUpdateResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          basePrice: new Decimal(123.456),
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(decimalUpdateResponse);

      const result = await controller.update(mockSkuId, decimalUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, decimalUpdateDto);
      expect(result.data!.basePrice.toString()).toBe('123.456');
    });

    it('should update product with zero values', async () => {
      const zeroUpdateDto: UpdateProductDto = {
        basePrice: 0,
        quantity: 0,
      };

      const zeroUpdateResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          basePrice: new Decimal(0),
          quantity: 0,
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(zeroUpdateResponse);

      const result = await controller.update(mockSkuId, zeroUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, zeroUpdateDto);
      expect(result.data!.basePrice.toString()).toBe('0');
      expect(result.data!.quantity).toBe(0);
    });

    it('should update product with secureUrls array', async () => {
      const updateDtoWithUrls: UpdateProductDto = {
        name: 'Updated with URLs',
        secureUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };

      const updateResponseWithUrls: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          name: 'Updated with URLs',
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(updateResponseWithUrls);

      const result = await controller.update(mockSkuId, updateDtoWithUrls);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, updateDtoWithUrls);
      expect(result.data!.name).toBe('Updated with URLs');
    });

    it('should update product with empty secureUrls array', async () => {
      const updateDtoWithEmptyUrls: UpdateProductDto = {
        name: 'Updated with empty URLs',
        secureUrls: [],
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.update(mockSkuId, updateDtoWithEmptyUrls);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, updateDtoWithEmptyUrls);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should propagate BadRequestException from service', async () => {
      const errorMessage = 'Product not found';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.update(mockSkuId, mockUpdateProductDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.update(mockSkuId, mockUpdateProductDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, mockUpdateProductDto);
    });

    it('should propagate generic Error from service', async () => {
      const errorMessage = 'Internal server error during update';
      const genericError = new Error(errorMessage);
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockRejectedValue(genericError);

      await expect(controller.update(mockSkuId, mockUpdateProductDto)).rejects.toThrow(Error);
      await expect(controller.update(mockSkuId, mockUpdateProductDto)).rejects.toThrow(
        errorMessage,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, mockUpdateProductDto);
    });

    it('should handle null input gracefully', async () => {
      const nullDto = null as unknown as UpdateProductDto;
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.update(mockSkuId, nullDto)).rejects.toThrow(BadRequestException);
      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, nullDto);
    });

    it('should handle service returning null response', async () => {
      const nullResponse = null as unknown as BaseResponse<ProductResponse>;
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(nullResponse);

      const result = await controller.update(mockSkuId, mockUpdateProductDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, mockUpdateProductDto);
      expect(result).toBeNull();
    });

    it('should handle empty skuId parameter', async () => {
      const emptySkuId = '';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockRejectedValue(new BadRequestException('Invalid SKU ID'));

      await expect(controller.update(emptySkuId, mockUpdateProductDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith(emptySkuId, mockUpdateProductDto);
    });

    it('should handle whitespace-only skuId parameter', async () => {
      const whitespaceSkuId = '   ';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockRejectedValue(new BadRequestException('Invalid SKU ID'));

      await expect(controller.update(whitespaceSkuId, mockUpdateProductDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(productServiceUpdateSpy).toHaveBeenCalledWith(whitespaceSkuId, mockUpdateProductDto);
    });

    it('should handle special characters in skuId parameter', async () => {
      const specialCharSkuId = 'TEST-SKU-@#$%';
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.update(specialCharSkuId, mockUpdateProductDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(specialCharSkuId, mockUpdateProductDto);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle empty UpdateProductDto object', async () => {
      const emptyUpdateDto: UpdateProductDto = {};
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.update(mockSkuId, emptyUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, emptyUpdateDto);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle concurrent update requests', async () => {
      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(mockSuccessResponse);

      const promises = Array.from({ length: 5 }, (_, index) =>
        controller.update(`SKU-${index}`, { name: `Product ${index}` }),
      );

      const results = await Promise.all(promises);

      expect(productServiceUpdateSpy).toHaveBeenCalledTimes(5);
      results.forEach((result) => {
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    it('should handle very long string values', async () => {
      const longString = 'A'.repeat(1000);
      const longStringUpdateDto: UpdateProductDto = {
        name: longString,
        description: longString,
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.update(mockSkuId, longStringUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, longStringUpdateDto);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle maximum decimal precision for basePrice', async () => {
      const maxPrecisionUpdateDto: UpdateProductDto = {
        basePrice: 999.999,
      };

      const maxPrecisionResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          basePrice: new Decimal(999.999),
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(maxPrecisionResponse);

      const result = await controller.update(mockSkuId, maxPrecisionUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, maxPrecisionUpdateDto);
      expect(result.data!.basePrice.toString()).toBe('999.999');
    });

    it('should handle maximum integer value for quantity', async () => {
      const maxQuantityUpdateDto: UpdateProductDto = {
        quantity: Number.MAX_SAFE_INTEGER,
      };

      const maxQuantityResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockUpdatedProductResponse,
          quantity: Number.MAX_SAFE_INTEGER,
        },
      };

      const productServiceUpdateSpy = jest
        .spyOn(productService, 'update')
        .mockResolvedValue(maxQuantityResponse);

      const result = await controller.update(mockSkuId, maxQuantityUpdateDto);

      expect(productServiceUpdateSpy).toHaveBeenCalledWith(mockSkuId, maxQuantityUpdateDto);
      expect(result.data!.quantity).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('create', () => {
    const mockProductDto = {
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test product description',
      status: StatusProduct.IN_STOCK,
      basePrice: 25.99,
      quantity: 100,
      variants: [],
      categoryIds: [1, 2, 3],
    };

    const mockCreateResponse: BaseResponse<ProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: {
        id: 1,
        name: 'Test Product',
        skuId: 'TEST-SKU-001',
        description: 'Test product description',
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal(25.99),
        quantity: 100,
        images: [],
        variants: [],
        categoryIds: [1, 2, 3],
      },
    };

    it('should create a product successfully', async () => {
      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(mockCreateResponse);

      const result = await controller.create(mockProductDto, []);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(mockProductDto, []);
      expect(productServiceCreateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCreateResponse);
    });
  });
});
