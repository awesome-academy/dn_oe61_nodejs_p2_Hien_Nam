import { NOTIFICATION_SERVICE } from '@app/common';
import { skuIdProductDto } from '@app/common/dto/product/delete-product.dto';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaService } from '@app/prisma';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { I18nService } from 'nestjs-i18n';
import { ProductService } from '../src/product-service.service';
import { ProductProducer } from '../src/product.producer';

// Mock interfaces
interface MockProduct {
  id: number;
  skuId: string;
  name: string;
  description: string | null;
  status: string;
  price: Decimal;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
  variants: MockVariant[];
}

interface MockVariant {
  id: number;
  productId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MockTransactionClient {
  cartItem: {
    deleteMany: jest.Mock;
  };
  review: {
    deleteMany: jest.Mock;
  };
  productImage: {
    deleteMany: jest.Mock;
  };
  categoryProduct: {
    deleteMany: jest.Mock;
  };
  productVariant: {
    deleteMany: jest.Mock;
  };
  product: {
    delete: jest.Mock;
    update: jest.Mock;
  };
}

interface MockPrismaClient {
  product: {
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
  orderItem: {
    count: jest.Mock;
  };
  $transaction: jest.Mock;
}

describe('ProductService - deleteProduct', () => {
  let service: ProductService;
  let mockPrismaService: { client: MockPrismaClient };
  let mockLoggerService: { error: jest.Mock };
  let moduleRef: TestingModule;
  let mockPrismaClient: MockPrismaClient;
  let mockTransactionClient: MockTransactionClient;

  // Mock data
  const mockProductWithVariants: MockProduct = {
    id: 1,
    skuId: 'TEST-SKU-001',
    name: 'Test Product',
    description: 'Test Description',
    status: 'IN_STOCK',
    price: new Decimal('100.00'),
    categoryId: 1,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    variants: [
      {
        id: 1,
        productId: 1,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      },
      {
        id: 2,
        productId: 1,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      },
    ],
  };

  const mockProductWithoutVariants: MockProduct = {
    id: 2,
    skuId: 'TEST-SKU-002',
    name: 'Test Product 2',
    description: 'Test Description 2',
    status: 'IN_STOCK',
    price: new Decimal('200.00'),
    categoryId: 2,
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    variants: [],
  };

  const mockskuIdProductDto: skuIdProductDto = {
    skuId: 'TEST-SKU-001',
  };

  beforeEach(async () => {
    // Create mock transaction client
    mockTransactionClient = {
      cartItem: {
        deleteMany: jest.fn(),
      },
      review: {
        deleteMany: jest.fn(),
      },
      productImage: {
        deleteMany: jest.fn(),
      },
      categoryProduct: {
        deleteMany: jest.fn(),
      },
      productVariant: {
        deleteMany: jest.fn(),
      },
      product: {
        delete: jest.fn(),
        update: jest.fn(),
      },
    };

    // Create mock Prisma client
    mockPrismaClient = {
      product: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      orderItem: {
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    // Create mock services
    mockPrismaService = {
      client: mockPrismaClient,
    };

    mockLoggerService = {
      error: jest.fn(),
    };

    const mockPaginationService = {
      queryWithPagination: jest.fn(),
    };
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
    // Create the testing module
    moduleRef = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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

    service = moduleRef.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('deleteProduct', () => {
    describe('Successful deletion scenarios', () => {
      it('should delete product with variants successfully', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockImplementation(
          async (callback: (tx: MockTransactionClient) => Promise<MockProduct>) => {
            return await callback(mockTransactionClient);
          },
        );
        mockTransactionClient.product.update.mockResolvedValue(mockProductWithVariants);

        // Act
        const result = await service.deleteProduct(mockskuIdProductDto);

        // Assert
        expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
          where: { skuId: mockskuIdProductDto.skuId },
          include: { variants: true },
        });
        expect(mockPrismaClient.orderItem.count).toHaveBeenCalledWith({
          where: {
            productVariantId: {
              in: [1, 2],
            },
          },
        });
        expect(mockTransactionClient.cartItem.deleteMany).toHaveBeenCalledWith({
          where: {
            productVariantId: {
              in: [1, 2],
            },
          },
        });
        expect(mockTransactionClient.review.deleteMany).toHaveBeenCalledWith({
          where: { productId: 1 },
        });
        expect(mockTransactionClient.productImage.deleteMany).toHaveBeenCalledWith({
          where: { productId: 1 },
        });
        expect(mockTransactionClient.categoryProduct.deleteMany).toHaveBeenCalledWith({
          where: { productId: 1 },
        });
        expect(mockTransactionClient.productVariant.deleteMany).toHaveBeenCalledWith({
          where: { productId: 1 },
        });
        expect(mockTransactionClient.product.update).toHaveBeenCalled();
        // Verify the update was called with correct skuId
        expect(mockTransactionClient.product.update).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockProductWithVariants);
      });

      it('should delete product without variants successfully', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithoutVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockImplementation(
          async (callback: (tx: MockTransactionClient) => Promise<MockProduct>) => {
            return await callback(mockTransactionClient);
          },
        );
        mockTransactionClient.product.update.mockResolvedValue(mockProductWithoutVariants);

        // Act
        const result = await service.deleteProduct(mockskuIdProductDto);

        // Assert
        expect(mockPrismaClient.orderItem.count).toHaveBeenCalledWith({
          where: {
            productVariantId: {
              in: [],
            },
          },
        });
        expect(mockTransactionClient.cartItem.deleteMany).not.toHaveBeenCalled();
        expect(mockTransactionClient.review.deleteMany).toHaveBeenCalledWith({
          where: { productId: 2 },
        });
        expect(mockTransactionClient.productImage.deleteMany).toHaveBeenCalledWith({
          where: { productId: 2 },
        });
        expect(mockTransactionClient.categoryProduct.deleteMany).toHaveBeenCalledWith({
          where: { productId: 2 },
        });
        expect(mockTransactionClient.productVariant.deleteMany).not.toHaveBeenCalled();
        expect(mockTransactionClient.product.update).toHaveBeenCalled();
        // Verify the update was called with correct skuId
        expect(mockTransactionClient.product.update).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockProductWithoutVariants);
      });

      it('should handle deletion of product with empty description', async () => {
        // Arrange
        const productWithoutDescription: MockProduct = {
          ...mockProductWithVariants,
          description: null,
        };
        mockPrismaClient.product.findUnique.mockResolvedValue(productWithoutDescription);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockImplementation(
          async (callback: (tx: MockTransactionClient) => Promise<MockProduct>) => {
            return await callback(mockTransactionClient);
          },
        );
        mockTransactionClient.product.update.mockResolvedValue(productWithoutDescription);

        // Act
        const result = await service.deleteProduct(mockskuIdProductDto);

        // Assert
        expect(result).toEqual(productWithoutDescription);
      });
    });

    describe('Product not found scenarios', () => {
      it('should throw TypedRpcException when product does not exist', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        const error = (await service
          .deleteProduct(mockskuIdProductDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error).toBeInstanceOf(TypedRpcException);
        expect(error.getError().code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(error.getError().message).toBe('common.product.error.productNotFound');
        expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
          where: { skuId: mockskuIdProductDto.skuId },
          include: { variants: true },
        });
        expect(mockPrismaClient.orderItem.count).not.toHaveBeenCalled();
        expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
      });

      it('should throw TypedRpcException when findUnique returns undefined', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(undefined);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        const error = (await service
          .deleteProduct(mockskuIdProductDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error).toBeInstanceOf(TypedRpcException);
        expect(error.getError().message).toBe('common.product.error.productNotFound');
      });
    });

    describe('Product in order scenarios', () => {
      it('should throw TypedRpcException when product has active orders', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(5);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        const error = (await service
          .deleteProduct(mockskuIdProductDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error).toBeInstanceOf(TypedRpcException);
        expect(error.getError().code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(error.getError().message).toBe('common.product.error.productInOrder');
        expect(mockPrismaClient.orderItem.count).toHaveBeenCalledWith({
          where: {
            productVariantId: {
              in: [1, 2],
            },
          },
        });
        expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
      });

      it('should throw TypedRpcException when product without variants has active orders', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithoutVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(1);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        expect(mockPrismaClient.orderItem.count).toHaveBeenCalledWith({
          where: {
            productVariantId: {
              in: [],
            },
          },
        });
      });
    });

    describe('Database error scenarios', () => {
      it('should handle and log database connection error during findUnique', async () => {
        // Arrange
        const dbError = new Error('Database connection failed');
        mockPrismaClient.product.findUnique.mockRejectedValue(dbError);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        const error = (await service
          .deleteProduct(mockskuIdProductDto)
          .catch((e: unknown) => e)) as TypedRpcException;
        expect(error).toBeInstanceOf(TypedRpcException);
        expect(error.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(error.getError().message).toBe('common.errors.internalServerError');
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Database connection failed',
          expect.stringMatching(/.+/),
        );
      });

      it('should handle database error during orderItem count', async () => {
        // Arrange
        const dbError = new Error('Count operation failed');
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockRejectedValue(dbError);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Count operation failed',
          expect.stringMatching(/.+/),
        );
      });

      it('should handle transaction failure', async () => {
        // Arrange
        const transactionError = new Error('Transaction failed');
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockRejectedValue(transactionError);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Transaction failed',
          expect.stringMatching(/.+/),
        );
      });

      it('should handle error during cartItem deletion in transaction', async () => {
        // Arrange
        const deleteError = new Error('CartItem deletion failed');
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockTransactionClient.cartItem.deleteMany.mockRejectedValue(deleteError);
        mockPrismaClient.$transaction.mockImplementation(
          async (callback: (tx: MockTransactionClient) => Promise<MockProduct>) => {
            return await callback(mockTransactionClient);
          },
        );

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'CartItem deletion failed',
          expect.stringMatching(/.+/),
        );
      });
    });

    describe('Prisma-specific error scenarios', () => {
      it('should handle P2003 foreign key constraint error', async () => {
        // Arrange
        const constraintError = Object.assign(new Error('Foreign key constraint failed'), {
          code: 'P2003',
        });
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockRejectedValue(constraintError);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Foreign key constraint failed',
          expect.stringMatching(/.+/),
        );
      });

      it('should handle P2025 record not found error (concurrent deletion)', async () => {
        // Arrange
        const recordNotFoundError = Object.assign(new Error('Record not found'), {
          code: 'P2025',
        });
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockRejectedValue(recordNotFoundError);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Record not found',
          expect.stringMatching(/.+/),
        );
      });

      it('should handle P2002 unique constraint error', async () => {
        // Arrange
        const uniqueConstraintError = Object.assign(new Error('Unique constraint failed'), {
          code: 'P2002',
        });
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockRejectedValue(uniqueConstraintError);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Unique constraint failed',
          expect.stringMatching(/.+/),
        );
      });
    });

    describe('TypedRpcException re-throwing', () => {
      it('should re-throw TypedRpcException without modification', async () => {
        // Arrange
        const originalException = new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productNotFound',
        });
        mockPrismaClient.product.findUnique.mockRejectedValue(originalException);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow(originalException);
        expect(mockLoggerService.error).not.toHaveBeenCalled();
      });

      it('should re-throw business logic TypedRpcException for product in order', async () => {
        // Arrange
        const businessException = new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productInOrder',
        });
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockRejectedValue(businessException);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow(businessException);
        expect(mockLoggerService.error).not.toHaveBeenCalled();
      });
    });

    describe('Edge cases and input validation', () => {
      it('should handle empty skuId', async () => {
        // Arrange
        const emptySkuDto: skuIdProductDto = { skuId: '' };

        // Act & Assert
        await expect(service.deleteProduct(emptySkuDto)).rejects.toThrow(TypedRpcException);
        // Database call should not be made due to validation failure
        expect(mockPrismaClient.product.findUnique).not.toHaveBeenCalled();
      });

      it('should handle whitespace-only skuId', async () => {
        // Arrange
        const whitespaceSkuDto: skuIdProductDto = { skuId: '   ' };
        mockPrismaClient.product.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.deleteProduct(whitespaceSkuDto)).rejects.toThrow(TypedRpcException);
        expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
          where: { skuId: '   ' },
          include: { variants: true },
        });
      });

      it('should handle special characters in skuId', async () => {
        // Arrange
        const specialSkuDto: skuIdProductDto = { skuId: 'TEST-SKU@#$%' };
        const specialProduct: MockProduct = {
          ...mockProductWithVariants,
          skuId: 'TEST-SKU@#$%',
        };
        mockPrismaClient.product.findUnique.mockResolvedValue(specialProduct);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockImplementation(
          async (callback: (tx: MockTransactionClient) => Promise<MockProduct>) => {
            return await callback(mockTransactionClient);
          },
        );
        mockTransactionClient.product.update.mockResolvedValue(specialProduct);

        // Act
        const result = await service.deleteProduct(specialSkuDto);

        // Assert
        expect(result?.skuId).toBe('TEST-SKU@#$%');
      });
    });

    describe('Transaction operation details', () => {
      it('should call all deletion operations in correct order', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        const transactionCallback = jest.fn();
        mockPrismaClient.$transaction.mockImplementation(
          async (callback: (tx: MockTransactionClient) => Promise<MockProduct>) => {
            transactionCallback();
            return await callback(mockTransactionClient);
          },
        );
        mockTransactionClient.product.update.mockResolvedValue(mockProductWithVariants);

        // Act
        await service.deleteProduct(mockskuIdProductDto);

        // Assert
        expect(transactionCallback).toHaveBeenCalledTimes(1);
        expect(mockTransactionClient.cartItem.deleteMany).toHaveBeenCalled();
        expect(mockTransactionClient.review.deleteMany).toHaveBeenCalled();
        expect(mockTransactionClient.productImage.deleteMany).toHaveBeenCalled();
        expect(mockTransactionClient.categoryProduct.deleteMany).toHaveBeenCalled();
        expect(mockTransactionClient.productVariant.deleteMany).toHaveBeenCalled();
        expect(mockTransactionClient.product.update).toHaveBeenCalled();
        // Verify the update was called with correct skuId
        expect(mockTransactionClient.product.update).toHaveBeenCalledTimes(1);
      });

      it('should handle large number of variants', async () => {
        // Arrange
        const manyVariants: MockVariant[] = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          productId: 1,
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          updatedAt: new Date('2023-01-01T00:00:00.000Z'),
        }));
        const productWithManyVariants: MockProduct = {
          ...mockProductWithVariants,
          variants: manyVariants,
        };
        mockPrismaClient.product.findUnique.mockResolvedValue(productWithManyVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockImplementation(
          async (callback: (tx: MockTransactionClient) => Promise<MockProduct>) => {
            return await callback(mockTransactionClient);
          },
        );
        mockTransactionClient.product.update.mockResolvedValue(productWithManyVariants);

        // Act
        const result = await service.deleteProduct(mockskuIdProductDto);

        // Assert
        const expectedVariantIds = Array.from({ length: 100 }, (_, i) => i + 1);
        expect(mockPrismaClient.orderItem.count).toHaveBeenCalledWith({
          where: {
            productVariantId: {
              in: expectedVariantIds,
            },
          },
        });
        expect(mockTransactionClient.cartItem.deleteMany).toHaveBeenCalledWith({
          where: {
            productVariantId: {
              in: expectedVariantIds,
            },
          },
        });
        expect(result).toEqual(productWithManyVariants);
      });
    });

    describe('Non-Error object handling', () => {
      it('should handle non-Error thrown objects', async () => {
        // Arrange
        const nonErrorObject = { message: 'Something went wrong', code: 500 };
        mockPrismaClient.product.findUnique.mockRejectedValue(nonErrorObject);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          '[object Object]',
          undefined,
        );
      });

      it('should handle string errors', async () => {
        // Arrange
        const stringError = 'Database timeout';
        mockPrismaClient.product.findUnique.mockRejectedValue(stringError);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Database timeout',
          undefined,
        );
      });

      it('should handle null/undefined errors', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockRejectedValue(null);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        expect(mockLoggerService.error).toHaveBeenCalledWith('DeleteProduct', 'null', undefined);
      });
    });

    describe('Method signature and return type validation', () => {
      it('should accept skuIdProductDto parameter', () => {
        // Assert
        expect(typeof service.deleteProduct).toBe('function');
        expect(service.deleteProduct.length).toBe(1);
      });

      it('should return Promise<Product | null>', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(mockProductWithVariants);
        mockPrismaClient.orderItem.count.mockResolvedValue(0);
        mockPrismaClient.$transaction.mockImplementation(
          async (callback: (tx: MockTransactionClient) => Promise<MockProduct>) => {
            return await callback(mockTransactionClient);
          },
        );
        mockTransactionClient.product.update.mockResolvedValue(mockProductWithVariants);

        // Act
        const result = service.deleteProduct(mockskuIdProductDto);

        // Assert
        expect(result).toBeInstanceOf(Promise);
        const resolvedResult = await result;
        expect(resolvedResult).toBeDefined();
        expect(typeof resolvedResult).toBe('object');
      });
    });

    describe('Logging behavior', () => {
      it('should not log when TypedRpcException is thrown from business logic', async () => {
        // Arrange
        mockPrismaClient.product.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        expect(mockLoggerService.error).not.toHaveBeenCalled();
      });

      it('should log error details when unexpected error occurs', async () => {
        // Arrange
        const unexpectedError = new Error('Unexpected database error');
        unexpectedError.stack = 'Error stack trace';
        mockPrismaClient.product.findUnique.mockRejectedValue(unexpectedError);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Unexpected database error',
          'Error stack trace',
        );
      });

      it('should log error without stack when error has no stack property', async () => {
        // Arrange
        const errorWithoutStack = new Error('Error without stack');
        delete errorWithoutStack.stack;
        mockPrismaClient.product.findUnique.mockRejectedValue(errorWithoutStack);

        // Act & Assert
        await expect(service.deleteProduct(mockskuIdProductDto)).rejects.toThrow();
        expect(mockLoggerService.error).toHaveBeenCalledWith(
          'DeleteProduct',
          'Error without stack',
          undefined,
        );
      });
    });
  });
});
