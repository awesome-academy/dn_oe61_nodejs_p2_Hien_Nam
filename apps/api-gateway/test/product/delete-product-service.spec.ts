import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { of, throwError } from 'rxjs';
import { ProductService } from '../../src/product/admin/product.service';
import { skuIdProductDto } from '@app/common/dto/product/delete-product.dto';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { PRODUCT_SERVICE } from '@app/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('ProductService - Delete Product', () => {
  let service: ProductService;
  let moduleRef: TestingModule;

  const mockProductClient = {
    send: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  const mockLoggerService = {
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImagesToCloudinary: jest.fn(),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClient,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = moduleRef.get<ProductService>(ProductService);
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

    const mockExistingProductResponse: BaseResponse<ProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductResponse,
    };

    describe('Successful deletion', () => {
      it('should delete product successfully when product exists', async () => {
        // Arrange
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse)) // CHECK_PRODUCT_EXISTS
          .mockReturnValueOnce(of(mockProductResponse)); // DELETE_PRODUCT

        // Act
        const result = await service.delete(validskuIdProductDto);

        // Assert
        expect(mockProductClient.send).toHaveBeenCalledTimes(2);
        expect(mockProductClient.send).toHaveBeenNthCalledWith(
          1,
          ProductPattern.CHECK_PRODUCT_EXISTS,
          validskuIdProductDto.skuId,
        );
        expect(mockProductClient.send).toHaveBeenNthCalledWith(2, ProductPattern.DELETE_PRODUCT, {
          skuId: validskuIdProductDto.skuId,
        });
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data).toEqual(mockProductResponse);
      });

      it('should handle deletion with different skuId format', async () => {
        // Arrange
        const differentSkuDto: skuIdProductDto = {
          skuId: 'PROD-2023-ABC123',
        };
        const differentProductResponse: ProductResponse = {
          ...mockProductResponse,
          skuId: 'PROD-2023-ABC123',
        };
        const differentExistingResponse: BaseResponse<ProductResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: differentProductResponse,
        };

        mockProductClient.send
          .mockReturnValueOnce(of(differentExistingResponse))
          .mockReturnValueOnce(of(differentProductResponse));

        // Act
        const result = await service.delete(differentSkuDto);

        // Assert
        expect(mockProductClient.send).toHaveBeenNthCalledWith(
          1,
          ProductPattern.CHECK_PRODUCT_EXISTS,
          differentSkuDto.skuId,
        );
        expect(mockProductClient.send).toHaveBeenNthCalledWith(2, ProductPattern.DELETE_PRODUCT, {
          skuId: differentSkuDto.skuId,
        });
        expect(result.data?.skuId).toBe('PROD-2023-ABC123');
      });

      it('should handle deletion of product with special characters in skuId', async () => {
        // Arrange
        const specialSkuDto: skuIdProductDto = {
          skuId: 'TEST-SKU@#$%',
        };
        const specialProductResponse: ProductResponse = {
          ...mockProductResponse,
          skuId: 'TEST-SKU@#$%',
        };
        const specialExistingResponse: BaseResponse<ProductResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: specialProductResponse,
        };

        mockProductClient.send
          .mockReturnValueOnce(of(specialExistingResponse))
          .mockReturnValueOnce(of(specialProductResponse));

        // Act
        const result = await service.delete(specialSkuDto);

        // Assert
        expect(result.data?.skuId).toBe('TEST-SKU@#$%');
      });
    });

    describe('Product not found scenarios', () => {
      it('should throw BadRequestException when product does not exist', async () => {
        // Arrange
        mockProductClient.send.mockReturnValue(of(null));
        mockI18nService.translate.mockReturnValue('Product not found');

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(BadRequestException);
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow('Product not found');
        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CHECK_PRODUCT_EXISTS,
          validskuIdProductDto.skuId,
        );
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.error.productNotFound',
        );
      });

      it('should throw BadRequestException when CHECK_PRODUCT_EXISTS returns undefined', async () => {
        // Arrange
        mockProductClient.send.mockReturnValueOnce(of(undefined));
        mockI18nService.translate.mockReturnValue('Product not found');

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(BadRequestException);
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.error.productNotFound',
        );
      });

      it('should handle CHECK_PRODUCT_EXISTS returns response with undefined data', async () => {
        // Arrange
        const emptyResponse: BaseResponse<ProductResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: undefined,
        };
        mockProductClient.send
          .mockReturnValueOnce(of(emptyResponse))
          .mockReturnValueOnce(of(undefined));

        // Act
        const result = await service.delete(validskuIdProductDto);

        // Assert
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data).toBeUndefined();
      });
    });

    describe('Deletion failure scenarios', () => {
      it('should handle when DELETE_PRODUCT returns null', async () => {
        // Arrange
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(of(null));
        mockI18nService.translate.mockReturnValue('Delete failed');

        // Act
        const result = await service.delete(validskuIdProductDto);

        // Assert
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data).toBeNull();
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.action.delete.failed',
        );
      });

      it('should handle when DELETE_PRODUCT returns undefined', async () => {
        // Arrange
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(of(undefined));
        mockI18nService.translate.mockReturnValue('Delete failed');

        // Act
        const result = await service.delete(validskuIdProductDto);

        // Assert
        expect(result.data).toBeUndefined();
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.action.delete.failed',
        );
      });
    });

    describe('Microservice communication errors', () => {
      it('should handle CHECK_PRODUCT_EXISTS microservice error', async () => {
        // Arrange
        const microserviceError = new Error('Microservice connection failed');
        mockProductClient.send.mockReturnValueOnce(throwError(() => microserviceError));

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(
          'common.errors.internalServerError',
        );
        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CHECK_PRODUCT_EXISTS,
          validskuIdProductDto.skuId,
        );
      });

      it('should handle DELETE_PRODUCT microservice error', async () => {
        // Arrange
        const microserviceError = new Error('Delete operation failed');
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(throwError(() => microserviceError));

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(
          'common.errors.internalServerError',
        );
        expect(mockProductClient.send).toHaveBeenCalledTimes(2);
      });

      it('should handle timeout error from microservice', async () => {
        // Arrange
        const timeoutError = new Error('Request timeout');
        mockProductClient.send.mockReturnValueOnce(throwError(() => timeoutError));

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(
          'common.errors.internalServerError',
        );
      });

      it('should handle network error from microservice', async () => {
        // Arrange
        const networkError = new Error('Network unreachable');
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(throwError(() => networkError));

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(
          'common.errors.internalServerError',
        );
      });
    });

    describe('Business logic error scenarios', () => {
      it('should handle product in order error from microservice', async () => {
        // Arrange
        const productInOrderError = new Error('Product already exists in order');
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(throwError(() => productInOrderError));

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(
          'common.errors.internalServerError',
        );
      });

      it('should handle database constraint error', async () => {
        // Arrange
        const constraintError = new Error('Foreign key constraint violation');
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(throwError(() => constraintError));

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(
          'common.errors.internalServerError',
        );
      });
    });

    describe('Input validation', () => {
      it('should handle empty skuId', async () => {
        // Arrange
        const emptySkuDto: skuIdProductDto = {
          skuId: '',
        };
        mockProductClient.send.mockReturnValueOnce(of(null));
        mockI18nService.translate.mockReturnValue('Product not found');

        // Act & Assert
        await expect(service.delete(emptySkuDto)).rejects.toThrow(BadRequestException);
        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CHECK_PRODUCT_EXISTS,
          '',
        );
      });

      it('should handle whitespace-only skuId', async () => {
        // Arrange
        const whitespaceSkuDto: skuIdProductDto = {
          skuId: '   ',
        };
        mockProductClient.send.mockReturnValueOnce(of(null));
        mockI18nService.translate.mockReturnValue('Product not found');

        // Act & Assert
        await expect(service.delete(whitespaceSkuDto)).rejects.toThrow(BadRequestException);
        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CHECK_PRODUCT_EXISTS,
          '   ',
        );
      });

      it('should handle very long skuId', async () => {
        // Arrange
        const longSkuId = 'A'.repeat(100);
        const longSkuDto: skuIdProductDto = {
          skuId: longSkuId,
        };
        mockProductClient.send.mockReturnValueOnce(of(null));
        mockI18nService.translate.mockReturnValue('Product not found');

        // Act & Assert
        await expect(service.delete(longSkuDto)).rejects.toThrow(BadRequestException);
        expect(mockProductClient.send).toHaveBeenCalledWith(
          ProductPattern.CHECK_PRODUCT_EXISTS,
          longSkuId,
        );
      });
    });

    describe('Response structure validation', () => {
      it('should return proper BaseResponse structure', async () => {
        // Arrange
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(of(mockProductResponse));

        // Act
        const result = await service.delete(validskuIdProductDto);

        // Assert
        expect(result).toHaveProperty('statusKey');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('data');
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
        expect(result.data).toBeDefined();
      });

      it('should handle response with undefined data', async () => {
        // Arrange
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(of(undefined));

        // Act
        const result = await service.delete(validskuIdProductDto);

        // Assert
        expect(result.data).toBeUndefined();
        expect(result.statusKey).toBe(StatusKey.SUCCESS);
      });
    });

    describe('Method signature and types', () => {
      it('should accept skuIdProductDto parameter', () => {
        // This test ensures the method signature is correct
        const methodExists = typeof service.delete === 'function';
        expect(methodExists).toBe(true);
      });

      it('should return Promise<BaseResponse<ProductResponse>>', async () => {
        // Arrange
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(of(mockProductResponse));

        // Act
        const result = service.delete(validskuIdProductDto);

        // Assert
        expect(result).toBeInstanceOf(Promise);
        const resolvedResult = await result;
        expect(resolvedResult).toHaveProperty('statusKey');
        expect(resolvedResult).toHaveProperty('data');
      });
    });

    describe('Translation service integration', () => {
      it('should call translation service for product not found error', async () => {
        // Arrange
        mockProductClient.send.mockReturnValueOnce(of(null));
        mockI18nService.translate.mockReturnValue('Sản phẩm không tồn tại');

        // Act & Assert
        await expect(service.delete(validskuIdProductDto)).rejects.toThrow(BadRequestException);
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.error.productNotFound',
        );
      });

      it('should call translation service for delete failed message', async () => {
        // Arrange
        mockProductClient.send
          .mockReturnValueOnce(of(mockExistingProductResponse))
          .mockReturnValueOnce(of(null));
        mockI18nService.translate.mockReturnValue('Xóa thất bại');

        // Act
        await service.delete(validskuIdProductDto);

        // Assert
        expect(mockI18nService.translate).toHaveBeenCalledWith(
          'common.product.action.delete.failed',
        );
      });
    });
  });
});
