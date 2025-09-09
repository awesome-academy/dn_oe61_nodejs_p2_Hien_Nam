import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ProductController } from '../../src/product/admin/product.controller';
import { ProductService } from '../../src/product/admin/product.service';
import { skuIdProductDto } from '@app/common/dto/product/delete-product.dto';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { Decimal } from '@prisma/client/runtime/library';

describe('ProductController - Delete Product', () => {
  let controller: ProductController;
  let moduleRef: TestingModule;

  const mockProductService = {
    delete: jest.fn(),
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
        {
          provide: RolesGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get<ProductController>(ProductController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('delete', () => {
    const validskuIdProductDto: skuIdProductDto = {
      skuId: 'TEST-SKU-001',
    };

    const mockProductResponse: ProductResponse = {
      id: 1,
      skuId: 'TEST-SKU-001',
      name: 'Test Product',
      description: 'Test Description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(100.5),
      quantity: 10,
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-02T00:00:00.000Z'),
    };

    const mockSuccessResponse: BaseResponse<ProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductResponse,
    };

    describe('Successful deletion', () => {
      it('should delete product successfully with valid skuId', async () => {
        // Arrange
        mockProductService.delete.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.delete(validskuIdProductDto);

        // Assert
        expect(mockProductService.delete).toHaveBeenCalledWith(validskuIdProductDto);
        expect(mockProductService.delete).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockSuccessResponse);
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data).toEqual(mockProductResponse);
      });

      it('should handle deletion of product with different skuId format', async () => {
        // Arrange
        const differentSkuDto: skuIdProductDto = {
          skuId: 'PROD-2023-ABC123',
        };
        const differentProductResponse: ProductResponse = {
          ...mockProductResponse,
          skuId: 'PROD-2023-ABC123',
          name: 'Different Product',
        };
        const differentSuccessResponse: BaseResponse<ProductResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: differentProductResponse,
        };
        mockProductService.delete.mockResolvedValue(differentSuccessResponse);

        // Act
        const result = await controller.delete(differentSkuDto);

        // Assert
        expect(mockProductService.delete).toHaveBeenCalledWith(differentSkuDto);
        expect(result).toEqual(differentSuccessResponse);
        expect(result.data?.skuId).toBe('PROD-2023-ABC123');
      });
    });

    describe('Error handling', () => {
      it('should throw BadRequestException when product not found', async () => {
        // Arrange
        const notFoundError = new BadRequestException('Product not found');
        mockProductService.delete.mockRejectedValue(notFoundError);

        // Act & Assert
        await expect(controller.delete(validskuIdProductDto)).rejects.toThrow(BadRequestException);
        await expect(controller.delete(validskuIdProductDto)).rejects.toThrow('Product not found');
        expect(mockProductService.delete).toHaveBeenCalledWith(validskuIdProductDto);
      });

      it('should throw BadRequestException when product is in order', async () => {
        // Arrange
        const productInOrderError = new BadRequestException('Product already exists in order');
        mockProductService.delete.mockRejectedValue(productInOrderError);

        // Act & Assert
        await expect(controller.delete(validskuIdProductDto)).rejects.toThrow(BadRequestException);
        await expect(controller.delete(validskuIdProductDto)).rejects.toThrow(
          'Product already exists in order',
        );
        expect(mockProductService.delete).toHaveBeenCalledWith(validskuIdProductDto);
      });

      it('should handle service timeout error', async () => {
        // Arrange
        const timeoutError = new Error('Service timeout');
        mockProductService.delete.mockRejectedValue(timeoutError);

        // Act & Assert
        await expect(controller.delete(validskuIdProductDto)).rejects.toThrow('Service timeout');
        expect(mockProductService.delete).toHaveBeenCalledWith(validskuIdProductDto);
      });

      it('should handle microservice communication error', async () => {
        // Arrange
        const communicationError = new Error('Microservice communication failed');
        mockProductService.delete.mockRejectedValue(communicationError);

        // Act & Assert
        await expect(controller.delete(validskuIdProductDto)).rejects.toThrow(
          'Microservice communication failed',
        );
        expect(mockProductService.delete).toHaveBeenCalledWith(validskuIdProductDto);
      });

      it('should handle generic service error', async () => {
        // Arrange
        const genericError = new Error('Internal server error');
        mockProductService.delete.mockRejectedValue(genericError);

        // Act & Assert
        await expect(controller.delete(validskuIdProductDto)).rejects.toThrow(
          'Internal server error',
        );
        expect(mockProductService.delete).toHaveBeenCalledWith(validskuIdProductDto);
      });
    });

    describe('Input validation', () => {
      it('should handle empty skuId', async () => {
        // Arrange
        const emptySkuDto: skuIdProductDto = {
          skuId: '',
        };
        const validationError = new BadRequestException('SkuId cannot be empty');
        mockProductService.delete.mockRejectedValue(validationError);

        // Act & Assert
        await expect(controller.delete(emptySkuDto)).rejects.toThrow(BadRequestException);
        expect(mockProductService.delete).toHaveBeenCalledWith(emptySkuDto);
      });

      it('should handle whitespace-only skuId', async () => {
        // Arrange
        const whitespaceSkuDto: skuIdProductDto = {
          skuId: '   ',
        };
        const validationError = new BadRequestException('SkuId cannot be whitespace');
        mockProductService.delete.mockRejectedValue(validationError);

        // Act & Assert
        await expect(controller.delete(whitespaceSkuDto)).rejects.toThrow(BadRequestException);
        expect(mockProductService.delete).toHaveBeenCalledWith(whitespaceSkuDto);
      });

      it('should handle very long skuId', async () => {
        // Arrange
        const longSkuDto: skuIdProductDto = {
          skuId: 'A'.repeat(100), // Very long skuId
        };
        const validationError = new BadRequestException('SkuId too long');
        mockProductService.delete.mockRejectedValue(validationError);

        // Act & Assert
        await expect(controller.delete(longSkuDto)).rejects.toThrow(BadRequestException);
        expect(mockProductService.delete).toHaveBeenCalledWith(longSkuDto);
      });

      it('should handle special characters in skuId', async () => {
        // Arrange
        const specialCharSkuDto: skuIdProductDto = {
          skuId: 'TEST@#$%^&*()',
        };
        mockProductService.delete.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.delete(specialCharSkuDto);

        // Assert
        expect(mockProductService.delete).toHaveBeenCalledWith(specialCharSkuDto);
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    describe('Response validation', () => {
      it('should return proper response structure', async () => {
        // Arrange
        mockProductService.delete.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = await controller.delete(validskuIdProductDto);

        // Assert
        expect(result).toHaveProperty('statusKey');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('data');
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data).toBeDefined();
        expect(result.data?.skuId).toBe(validskuIdProductDto.skuId);
      });

      it('should handle undefined data in response', async () => {
        // Arrange
        const undefinedDataResponse: BaseResponse<ProductResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: undefined,
        };
        mockProductService.delete.mockResolvedValue(undefinedDataResponse);

        // Act
        const result = await controller.delete(validskuIdProductDto);

        // Assert
        expect(result.data).toBeUndefined();
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
      });
    });

    describe('Method signature and types', () => {
      it('should accept skuIdProductDto parameter', () => {
        // This test ensures the method signature is correct
        const methodExists = typeof controller.delete === 'function';
        expect(methodExists).toBe(true);
      });

      it('should return Promise<BaseResponse<ProductResponse>>', async () => {
        // Arrange
        mockProductService.delete.mockResolvedValue(mockSuccessResponse);

        // Act
        const result = controller.delete(validskuIdProductDto);

        // Assert
        expect(result).toBeInstanceOf(Promise);
        const resolvedResult = await result;
        expect(resolvedResult).toEqual(mockSuccessResponse);
      });
    });
  });
});
