import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaService } from '@app/prisma';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { ProductService } from '../src/product-service.service';

// Mock class-validator
jest.mock('class-validator', () => {
  const actual = jest.requireActual<typeof import('class-validator')>('class-validator');
  return {
    ...actual,
    validateOrReject: jest.fn<Promise<void>, [unknown]>(),
  };
});

// Mock class-transformer
jest.mock('class-transformer', () => {
  const actual = jest.requireActual<typeof import('class-transformer')>('class-transformer');
  return {
    ...actual,
    plainToInstance: jest.fn(),
  };
});

const mockValidateOrReject = validateOrReject as jest.MockedFunction<typeof validateOrReject>;
const mockPlainToInstance = plainToInstance as jest.MockedFunction<typeof plainToInstance>;

interface MockProduct {
  id: number;
  skuId: string;
  name: string;
  description?: string;
  status: StatusProduct;
  basePrice: Decimal;
  quantity: number;
}

interface MockPrismaTransaction {
  product: {
    update: jest.MockedFunction<
      (args: {
        data: {
          name: string;
          skuId: string;
          description?: string;
          status: StatusProduct;
          basePrice: Decimal;
          quantity: number;
        };
        where: { skuId: string };
      }) => Promise<MockProduct>
    >;
    findUnique: jest.MockedFunction<
      (args: { where: { skuId: string } }) => Promise<MockProduct | null>
    >;
  };
}

interface MockPrismaClient {
  $transaction: jest.MockedFunction<
    <T>(fn: (prisma: MockPrismaTransaction) => Promise<T>) => Promise<T>
  >;
  product: {
    findUnique: jest.MockedFunction<
      (args: { where: { skuId: string } | { id: number } }) => Promise<MockProduct | null>
    >;
  };
  $connect: jest.MockedFunction<() => Promise<void>>;
  $disconnect: jest.MockedFunction<() => Promise<void>>;
}

describe('ProductService - updateProduct and validationDataProduct', () => {
  let service: ProductService;
  let mockPrismaClient: MockPrismaClient;
  let mockTransaction: MockPrismaTransaction;

  let mockProduct: MockProduct;

  const mockUpdatedProduct: MockProduct = {
    id: 1,
    skuId: 'TEST-SKU-002',
    name: 'Updated Product',
    description: 'Updated Description',
    status: StatusProduct.SOLD_OUT,
    basePrice: new Decimal(199.99),
    quantity: 20,
  };

  const mockUpdateProductDto: UpdateProductDto = {
    name: 'Updated Product',
    skuId: 'TEST-SKU-002',
    description: 'Updated Description',
    status: StatusProduct.SOLD_OUT,
    basePrice: 199.99,
    quantity: 20,
  };

  beforeEach(async () => {
    // Create mock transaction object
    mockTransaction = {
      product: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    // Create mock Prisma client
    mockPrismaClient = {
      $transaction: jest.fn(),
      product: {
        findUnique: jest.fn(),
      },
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    };

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
          useValue: {
            error: jest.fn(),
          },
        },
        {
          provide: PaginationService,
          useValue: {
            queryWithPagination: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);

    // Reset all mocks
    jest.clearAllMocks();
    mockValidateOrReject.mockResolvedValue();
    // Don't set a default return value for mockPlainToInstance - let each test set its own

    // Create fresh mockProduct for each test to prevent mutations carrying over
    mockProduct = {
      id: 1,
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test Description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(99.99),
      quantity: 10,
    };
  });

  describe('updateProduct', () => {
    it('should update a product successfully with all fields', async () => {
      // Mock checkProductExists to return existing product and null for SKU uniqueness check
      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null); // SKU uniqueness check
      mockPlainToInstance.mockReturnValue(mockUpdateProductDto);

      // Mock transaction to return updated product
      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(mockUpdatedProduct);
        return fn(mockTransaction);
      });

      const result = await service.updateProduct(mockUpdateProductDto, 'TEST-SKU-001');

      expect(mockPlainToInstance).toHaveBeenCalledWith(UpdateProductDto, mockUpdateProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockUpdateProductDto);
      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(mockTransaction.product.update).toHaveBeenCalledWith({
        data: {
          name: 'Updated Product',
          skuId: 'TEST-SKU-002',
          description: 'Updated Description',
          status: StatusProduct.SOLD_OUT,
          basePrice: new Decimal(199.99),
          quantity: 20,
        },
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should update product with partial data (only name)', async () => {
      const partialUpdateDto: UpdateProductDto = {
        name: 'Only Name Updated',
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue(partialUpdateDto);

      const expectedUpdatedProduct = {
        ...mockProduct,
        name: 'Only Name Updated',
      };

      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(expectedUpdatedProduct);
        return fn(mockTransaction);
      });

      const result = await service.updateProduct(partialUpdateDto, 'TEST-SKU-001');

      expect(mockTransaction.product.update).toHaveBeenCalledWith({
        data: {
          name: 'Only Name Updated',
          skuId: 'TEST-SKU-001',
          description: 'Test Description',
          status: StatusProduct.IN_STOCK,
          basePrice: new Decimal(99.99),
          quantity: 10,
        },
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(expectedUpdatedProduct);
    });

    it('should update product with all status enum values', async () => {
      const statusValues = [StatusProduct.IN_STOCK, StatusProduct.SOLD_OUT, StatusProduct.PRE_SALE];

      for (const status of statusValues) {
        const updateDto: UpdateProductDto = { status };
        mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
        mockPlainToInstance.mockReturnValue(updateDto);

        const expectedProduct = { ...mockProduct, status };
        mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
          mockTransaction.product.update.mockResolvedValueOnce(expectedProduct);
          return fn(mockTransaction);
        });

        const result = await service.updateProduct(updateDto, 'TEST-SKU-001');

        expect(mockTransaction.product.update).toHaveBeenCalledWith({
          data: {
            name: 'Test Product',
            skuId: 'TEST-SKU-001',
            description: 'Test Description',
            status,
            basePrice: new Decimal(99.99),
            quantity: 10,
          },
          where: { skuId: 'TEST-SKU-001' },
        });
        expect(result).toEqual(expectedProduct);

        jest.clearAllMocks();
        mockValidateOrReject.mockResolvedValue();
      }
    });

    it('should update product with decimal basePrice', async () => {
      const updateDto: UpdateProductDto = {
        basePrice: 123.456,
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue(updateDto);

      const expectedProduct = { ...mockProduct, basePrice: new Decimal(123.456) };
      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(expectedProduct);
        return fn(mockTransaction);
      });

      const result = await service.updateProduct(updateDto, 'TEST-SKU-001');

      expect(mockTransaction.product.update).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          skuId: 'TEST-SKU-001',
          description: 'Test Description',
          status: StatusProduct.IN_STOCK,
          basePrice: new Decimal(123.456),
          quantity: 10,
        },
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(expectedProduct);
    });

    it('should update product with zero values', async () => {
      const updateDto: UpdateProductDto = {
        basePrice: 0,
        quantity: 0,
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue(updateDto);

      const expectedProduct = {
        ...mockProduct,
        basePrice: new Decimal(0),
        quantity: 0,
      };

      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(expectedProduct);
        return fn(mockTransaction);
      });

      const result = await service.updateProduct(updateDto, 'TEST-SKU-001');

      expect(mockTransaction.product.update).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          skuId: 'TEST-SKU-001',
          description: 'Test Description',
          status: StatusProduct.IN_STOCK,
          basePrice: new Decimal(0),
          quantity: 0,
        },
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(expectedProduct);
    });

    it('should throw TypedRpcException when product does not exist', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(null);
      mockPlainToInstance.mockReturnValue(mockUpdateProductDto);

      await expect(service.updateProduct(mockUpdateProductDto, 'NONEXISTENT-SKU')).rejects.toThrow(
        TypedRpcException,
      );

      try {
        await service.updateProduct(mockUpdateProductDto, 'NONEXISTENT-SKU');
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorDetails = typedError.getError();
        expect(errorDetails.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorDetails.message).toBe('common.product.error.productNotFound');
      }
    });

    it('should throw TypedRpcException when new SKU already exists during update', async () => {
      const existingProduct = { ...mockProduct, id: 2 };
      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct) // First call for existing product
        .mockResolvedValueOnce(existingProduct); // Second call finds existing SKU
      mockPlainToInstance.mockReturnValue(mockUpdateProductDto);

      await expect(service.updateProduct(mockUpdateProductDto, 'TEST-SKU-001')).rejects.toThrow(
        TypedRpcException,
      );

      // Reset and test again
      mockPrismaClient.product.findUnique.mockReset();
      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct) // First call for existing product
        .mockResolvedValueOnce(existingProduct); // Second call finds existing SKU
      mockPlainToInstance.mockReturnValue(mockUpdateProductDto);

      try {
        await service.updateProduct(mockUpdateProductDto, 'TEST-SKU-001');
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorDetails = typedError.getError();
        expect(errorDetails.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorDetails.message).toBe('common.product.error.skuIdExists');
      }
    });

    it('should handle validation errors from validateOrReject', async () => {
      const validationError = new Error('Validation failed');
      mockValidateOrReject.mockRejectedValueOnce(validationError);
      mockPlainToInstance.mockReturnValue(mockUpdateProductDto);

      await expect(service.updateProduct(mockUpdateProductDto, 'TEST-SKU-001')).rejects.toThrow(
        validationError,
      );

      expect(mockValidateOrReject).toHaveBeenCalledWith(mockUpdateProductDto);
    });

    it('should handle database transaction errors', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue(mockUpdateProductDto);

      const dbError = new Error('Database transaction failed');
      mockPrismaClient.$transaction.mockRejectedValueOnce(dbError);

      await expect(service.updateProduct(mockUpdateProductDto, 'TEST-SKU-001')).rejects.toThrow(
        dbError,
      );
    });

    it('should handle product update errors within transaction', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue(mockUpdateProductDto);

      const updateError = new Error('Product update failed');
      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockRejectedValueOnce(updateError);
        return fn(mockTransaction);
      });

      await expect(service.updateProduct(mockUpdateProductDto, 'TEST-SKU-001')).rejects.toThrow(
        updateError,
      );
    });

    it('should handle empty skuIdParam', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(null);
      mockPlainToInstance.mockReturnValue(mockUpdateProductDto);

      await expect(service.updateProduct(mockUpdateProductDto, '')).rejects.toThrow(
        TypedRpcException,
      );

      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { skuId: '' },
      });
    });

    it('should handle special characters in skuIdParam', async () => {
      const specialSkuId = 'TEST-SKU-@#$%^&*()';
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue({ name: 'Test' });

      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(mockUpdatedProduct);
        return fn(mockTransaction);
      });

      await service.updateProduct({ name: 'Test' }, specialSkuId);

      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { skuId: specialSkuId },
      });
    });

    it('should handle empty UpdateProductDto object', async () => {
      const emptyDto: UpdateProductDto = {};
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue(emptyDto);

      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(mockProduct);
        return fn(mockTransaction);
      });

      const result = await service.updateProduct(emptyDto, 'TEST-SKU-001');

      expect(mockTransaction.product.update).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          skuId: 'TEST-SKU-001',
          description: 'Test Description',
          status: StatusProduct.IN_STOCK,
          basePrice: new Decimal(99.99),
          quantity: 10,
        },
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should handle very long string values in update DTO', async () => {
      const longString = 'a'.repeat(1000);
      const updateDto: UpdateProductDto = {
        name: longString,
        description: longString,
        skuId: longString,
      };

      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct) // First call for existing product
        .mockResolvedValueOnce(null); // Second call for SKU uniqueness check
      mockPlainToInstance.mockReturnValue(updateDto);

      const expectedProduct = {
        ...mockProduct,
        name: longString,
        description: longString,
        skuId: longString,
      };

      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(expectedProduct);
        return fn(mockTransaction);
      });

      const result = await service.updateProduct(updateDto, 'TEST-SKU-001');

      expect(mockTransaction.product.update).toHaveBeenCalledWith({
        data: {
          name: longString,
          skuId: longString,
          description: longString,
          status: StatusProduct.IN_STOCK,
          basePrice: new Decimal(99.99),
          quantity: 10,
        },
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(expectedProduct);
    });

    it('should handle maximum decimal precision for basePrice', async () => {
      const updateDto: UpdateProductDto = {
        basePrice: 999.999,
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue(updateDto);

      const expectedProduct = { ...mockProduct, basePrice: new Decimal(999.999) };
      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(expectedProduct);
        return fn(mockTransaction);
      });

      const result = await service.updateProduct(updateDto, 'TEST-SKU-001');

      expect(mockTransaction.product.update).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          skuId: 'TEST-SKU-001',
          description: 'Test Description',
          status: StatusProduct.IN_STOCK,
          basePrice: new Decimal(999.999),
          quantity: 10,
        },
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(expectedProduct);
    });

    it('should handle maximum integer value for quantity', async () => {
      const maxInt = Number.MAX_SAFE_INTEGER;
      const updateDto: UpdateProductDto = {
        quantity: maxInt,
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);
      mockPlainToInstance.mockReturnValue(updateDto);

      const expectedProduct = { ...mockProduct, quantity: maxInt };
      mockPrismaClient.$transaction.mockImplementationOnce(async (fn) => {
        mockTransaction.product.update.mockResolvedValueOnce(expectedProduct);
        return fn(mockTransaction);
      });

      const result = await service.updateProduct(updateDto, 'TEST-SKU-001');

      expect(mockTransaction.product.update).toHaveBeenCalledWith({
        data: {
          name: 'Test Product',
          skuId: 'TEST-SKU-001',
          description: 'Test Description',
          status: StatusProduct.IN_STOCK,
          basePrice: new Decimal(99.99),
          quantity: maxInt,
        },
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(expectedProduct);
    });
  });

  describe('validationDataProduct', () => {
    it('should validate and return updated product data successfully', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

      // Access private method through service instance
      const result = await service['validationDataProduct'](mockUpdateProductDto, 'TEST-SKU-001');

      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result.name).toBe('Updated Product');
      expect(result.skuId).toBe('TEST-SKU-002');
      expect(result.description).toBe('Updated Description');
      expect(result.status).toBe(StatusProduct.SOLD_OUT);
      expect(result.basePrice).toEqual(new Decimal(199.99));
      expect(result.quantity).toBe(20);
    });

    it('should call checkProductExists method with correct skuId', async () => {
      const checkProductExistsSpy = jest.spyOn(service, 'checkProductExists');
      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct) // First call for existing product
        .mockResolvedValueOnce(null); // Second call for SKU uniqueness check

      await service['validationDataProduct'](mockUpdateProductDto, 'TEST-SKU-001');

      expect(checkProductExistsSpy).toHaveBeenCalledWith('TEST-SKU-001');
      expect(checkProductExistsSpy).toHaveBeenCalledWith('TEST-SKU-002'); // New SKU check
      expect(checkProductExistsSpy).toHaveBeenCalledTimes(2);

      checkProductExistsSpy.mockRestore();
    });

    it('should throw TypedRpcException when new SKU already exists', async () => {
      const existingProduct = { ...mockProduct, id: 2 };
      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct) // First call for existing product
        .mockResolvedValueOnce(existingProduct); // Second call finds existing SKU

      await expect(
        service['validationDataProduct'](mockUpdateProductDto, 'TEST-SKU-001'),
      ).rejects.toThrow(TypedRpcException);

      // Reset mocks and try again to get proper error
      mockPrismaClient.product.findUnique.mockReset();
      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct) // First call for existing product
        .mockResolvedValueOnce(existingProduct); // Second call finds existing SKU

      try {
        await service['validationDataProduct'](mockUpdateProductDto, 'TEST-SKU-001');
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorDetails = typedError.getError();
        expect(errorDetails.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorDetails.message).toBe('common.product.error.skuIdExists');
      }
    });

    it('should not check SKU uniqueness when SKU is not being changed', async () => {
      const updateDtoSameSku: UpdateProductDto = {
        name: 'Updated Product',
        skuId: 'TEST-SKU-001', // Same as existing SKU
        description: 'Updated Description',
      };

      const checkProductExistsSpy = jest.spyOn(service, 'checkProductExists');
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

      await service['validationDataProduct'](updateDtoSameSku, 'TEST-SKU-001');

      expect(checkProductExistsSpy).toHaveBeenCalledWith('TEST-SKU-001');
      expect(checkProductExistsSpy).toHaveBeenCalledTimes(1); // Only one call, no uniqueness check

      checkProductExistsSpy.mockRestore();
    });

    it('should throw TypedRpcException when product does not exist', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(null);

      await expect(
        service['validationDataProduct'](mockUpdateProductDto, 'NONEXISTENT-SKU'),
      ).rejects.toThrow(TypedRpcException);

      try {
        await service['validationDataProduct'](mockUpdateProductDto, 'NONEXISTENT-SKU');
        fail('Expected TypedRpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorDetails = typedError.getError();
        expect(errorDetails.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorDetails.message).toBe('common.product.error.productNotFound');
      }
    });

    it('should handle partial update data (only name)', async () => {
      const partialDto: UpdateProductDto = { name: 'Only Name Updated' };
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

      const result = await service['validationDataProduct'](partialDto, 'TEST-SKU-001');

      expect(result.name).toBe('Only Name Updated');
      expect(result.skuId).toBe('TEST-SKU-001');
      expect(result.description).toBe('Test Description');
      expect(result.status).toBe(StatusProduct.IN_STOCK);
      expect(result.basePrice).toEqual(new Decimal(99.99));
      expect(result.quantity).toBe(10);
    });

    it('should handle undefined values in update DTO', async () => {
      const dtoWithUndefined: UpdateProductDto = {
        name: undefined,
        skuId: undefined,
        description: undefined,
        status: undefined,
        basePrice: undefined,
        quantity: undefined,
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

      const result = await service['validationDataProduct'](dtoWithUndefined, 'TEST-SKU-001');

      // All values should remain original since all are undefined
      expect(result.name).toBe('Test Product');
      expect(result.skuId).toBe('TEST-SKU-001');
      expect(result.description).toBe('Test Description');
      expect(result.status).toBe(StatusProduct.IN_STOCK);
      expect(result.basePrice).toEqual(new Decimal(99.99));
      expect(result.quantity).toBe(10);
    });

    it('should handle zero values correctly', async () => {
      const zeroDto: UpdateProductDto = {
        basePrice: 0,
        quantity: 0,
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

      const result = await service['validationDataProduct'](zeroDto, 'TEST-SKU-001');

      expect(result.basePrice).toEqual(new Decimal(0));
      expect(result.quantity).toBe(0);
    });

    it('should convert basePrice to Decimal correctly', async () => {
      const decimalDto: UpdateProductDto = {
        basePrice: 123.456,
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

      const result = await service['validationDataProduct'](decimalDto, 'TEST-SKU-001');

      expect(result.basePrice).toBeInstanceOf(Decimal);
      expect(result.basePrice.toString()).toBe('123.456');
    });

    it('should handle all status enum values', async () => {
      const statusValues = [StatusProduct.IN_STOCK, StatusProduct.SOLD_OUT, StatusProduct.PRE_SALE];

      for (const status of statusValues) {
        mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

        const result = await service['validationDataProduct']({ status }, 'TEST-SKU-001');

        expect(result.status).toBe(status);
      }
    });

    it('should handle empty string values', async () => {
      const emptyStringDto: UpdateProductDto = {
        name: '',
        skuId: '',
        description: '',
      };

      mockPrismaClient.product.findUnique
        .mockResolvedValueOnce(mockProduct) // First call for existing product
        .mockResolvedValueOnce(null); // Second call for SKU uniqueness check (empty string)

      const result = await service['validationDataProduct'](emptyStringDto, 'TEST-SKU-001');

      expect(result.name).toBe('');
      expect(result.skuId).toBe('');
      expect(result.description).toBe('');
    });

    it('should handle very large numbers', async () => {
      const largeNumberDto: UpdateProductDto = {
        basePrice: Number.MAX_SAFE_INTEGER,
        quantity: Number.MAX_SAFE_INTEGER,
      };

      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

      const result = await service['validationDataProduct'](largeNumberDto, 'TEST-SKU-001');

      expect(result.basePrice).toEqual(new Decimal(Number.MAX_SAFE_INTEGER));
      expect(result.quantity).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle database errors when checking product existence', async () => {
      const dbError = new Error('Database connection failed');
      mockPrismaClient.product.findUnique.mockRejectedValueOnce(dbError);

      await expect(
        service['validationDataProduct'](mockUpdateProductDto, 'TEST-SKU-001'),
      ).rejects.toThrow(dbError);
    });

    it('should ensure checkProductExists method is properly covered', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValueOnce(mockProduct);

      // Direct call to checkProductExists to ensure coverage
      const result = await service.checkProductExists('TEST-SKU-001');

      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { skuId: 'TEST-SKU-001' },
      });
      expect(result).toEqual(mockProduct);
    });
  });
});
