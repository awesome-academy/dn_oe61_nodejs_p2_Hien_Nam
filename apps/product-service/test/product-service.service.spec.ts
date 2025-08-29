import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma';
import { CreateProductDto } from '@app/common/dto/product/create-product.dto';
import { ProductDto } from '@app/common/dto/product/product.dto';
import { VariantInput } from '@app/common/dto/product/variants.dto';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

jest.mock('class-validator', () => {
  const actual = jest.requireActual<typeof import('class-validator')>('class-validator');
  return {
    ...actual,
    validateOrReject: jest.fn<Promise<void>, [unknown]>(),
  };
});

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
  basePrice: number;
  quantity: number;
}

interface MockPrismaTransaction {
  product: {
    create: jest.MockedFunction<(args: { data: Partial<MockProduct> }) => Promise<MockProduct>>;
  };
  productImage: {
    create: jest.MockedFunction<
      (args: { data: { url: string; productId: number } }) => Promise<{ id: number }>
    >;
  };
  productVariant: {
    create: jest.MockedFunction<
      (args: {
        data: {
          price: number;
          startDate: Date;
          endDate: Date | null;
          productId: number;
          sizeId: number;
        };
      }) => Promise<{ id: number }>
    >;
  };
  categoryProduct: {
    create: jest.MockedFunction<
      (args: { data: { categoryId: number; productId: number } }) => Promise<{ id: number }>
    >;
  };
}

type TransactionCallback = (prisma: MockPrismaTransaction) => Promise<MockProduct>;

describe('ProductService', () => {
  let service: ProductService;

  const mockPrismaService = {
    client: {
      product: {
        findUnique: jest.fn() as jest.MockedFunction<
          (args: { where: { skuId: string } }) => Promise<MockProduct | null>
        >,
        create: jest.fn() as jest.MockedFunction<
          (args: { data: Partial<MockProduct> }) => Promise<MockProduct>
        >,
      },
      productImage: {
        create: jest.fn() as jest.MockedFunction<
          (args: { data: { url: string; productId: number } }) => Promise<{ id: number }>
        >,
      },
      productVariant: {
        create: jest.fn() as jest.MockedFunction<
          (args: {
            data: {
              price: number;
              startDate: Date;
              endDate: Date | null;
              productId: number;
              sizeId: number;
            };
          }) => Promise<{ id: number }>
        >,
      },
      categoryProduct: {
        create: jest.fn() as jest.MockedFunction<
          (args: { data: { categoryId: number; productId: number } }) => Promise<{ id: number }>
        >,
      },
      $transaction: jest.fn() as jest.MockedFunction<
        (callback: TransactionCallback) => Promise<MockProduct>
      >,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('checkProductExists', () => {
    it('should return a product if it exists', async () => {
      const skuId = 'EXISTING-SKU';
      const mockProduct: MockProduct = {
        id: 1,
        skuId,
        name: 'Test Product',
        description: 'Test Description',
        status: StatusProduct.IN_STOCK,
        basePrice: 99.99,
        quantity: 10,
      };
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.checkProductExists(skuId);

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.client.product.findUnique).toHaveBeenCalledWith({
        where: { skuId },
      });
      expect(mockPrismaService.client.product.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return null if the product does not exist', async () => {
      const skuId = 'NON-EXISTING-SKU';
      mockPrismaService.client.product.findUnique.mockResolvedValue(null);

      const result = await service.checkProductExists(skuId);

      expect(result).toBeNull();
      expect(mockPrismaService.client.product.findUnique).toHaveBeenCalledWith({
        where: { skuId },
      });
      expect(mockPrismaService.client.product.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      const skuId = 'ERROR-SKU';
      const databaseError = new Error('Database connection failed');
      mockPrismaService.client.product.findUnique.mockRejectedValue(databaseError);

      await expect(service.checkProductExists(skuId)).rejects.toThrow(databaseError);
      expect(mockPrismaService.client.product.findUnique).toHaveBeenCalledWith({
        where: { skuId },
      });
      expect(mockPrismaService.client.product.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('createProduct', () => {
    const mockVariants: VariantInput[] = [
      {
        price: 109.99,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        sizeId: 1,
      },
      {
        price: 119.99,
        startDate: new Date('2024-01-01'),
        endDate: undefined, // Test optional endDate
        sizeId: 2,
      },
    ];

    const mockProductData: ProductDto = {
      skuId: 'NEW-SKU',
      name: 'New Product',
      description: 'A great new product',
      status: StatusProduct.IN_STOCK,
      basePrice: 99.99,
      quantity: 10,
      variants: mockVariants,
      categoryIds: [1, 2],
    };

    const mockSecureUrl: string[] = [
      'http://example.com/image1.jpg',
      'http://example.com/image2.jpg',
    ];

    const mockCreateProductDto: CreateProductDto = {
      productData: mockProductData,
      secureUrl: mockSecureUrl,
    };

    const mockCreatedProduct: MockProduct = {
      id: 1,
      skuId: mockProductData.skuId,
      name: mockProductData.name,
      description: mockProductData.description,
      status: mockProductData.status,
      basePrice: mockProductData.basePrice,
      quantity: mockProductData.quantity,
    };

    it('should create a product successfully', async () => {
      const mockDto = { ...mockCreateProductDto };
      mockPlainToInstance.mockReturnValue(mockDto);
      mockValidateOrReject.mockResolvedValue(undefined);

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: TransactionCallback) => {
          const prismaMock: MockPrismaTransaction = {
            product: {
              create: jest.fn().mockResolvedValue(mockCreatedProduct),
            },
            productImage: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            productVariant: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            categoryProduct: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const result = await service.createProduct(mockCreateProductDto);

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductDto, mockCreateProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockDto);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCreatedProduct);
    });

    it('should throw an error if validation fails', async () => {
      const mockDto = { ...mockCreateProductDto };
      const validationError = new Error('Validation failed');
      mockPlainToInstance.mockReturnValue(mockDto);
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.createProduct(mockCreateProductDto)).rejects.toThrow(validationError);

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductDto, mockCreateProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockDto);
      expect(mockPrismaService.client.$transaction).not.toHaveBeenCalled();
    });

    it('should throw an error if the transaction fails', async () => {
      const mockDto = { ...mockCreateProductDto };
      const transactionError = new Error('Transaction failed');
      mockPlainToInstance.mockReturnValue(mockDto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.$transaction.mockRejectedValue(transactionError);

      await expect(service.createProduct(mockCreateProductDto)).rejects.toThrow(transactionError);

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductDto, mockCreateProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockDto);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle product creation failure within transaction', async () => {
      const mockDto = { ...mockCreateProductDto };
      const productCreationError = new Error('Product creation failed');
      mockPlainToInstance.mockReturnValue(mockDto);
      mockValidateOrReject.mockResolvedValue(undefined);

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: TransactionCallback) => {
          const prismaMock: MockPrismaTransaction = {
            product: {
              create: jest.fn().mockRejectedValue(productCreationError),
            },
            productImage: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            productVariant: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            categoryProduct: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.createProduct(mockCreateProductDto)).rejects.toThrow(
        productCreationError,
      );

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductDto, mockCreateProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockDto);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle image creation failure within transaction', async () => {
      const mockDto = { ...mockCreateProductDto };
      const imageCreationError = new Error('Image creation failed');
      mockPlainToInstance.mockReturnValue(mockDto);
      mockValidateOrReject.mockResolvedValue(undefined);

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: TransactionCallback) => {
          const prismaMock: MockPrismaTransaction = {
            product: {
              create: jest.fn().mockResolvedValue(mockCreatedProduct),
            },
            productImage: {
              create: jest.fn().mockRejectedValue(imageCreationError),
            },
            productVariant: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            categoryProduct: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.createProduct(mockCreateProductDto)).rejects.toThrow(imageCreationError);

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductDto, mockCreateProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockDto);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle variant creation failure within transaction', async () => {
      const mockDto = { ...mockCreateProductDto };
      const variantCreationError = new Error('Variant creation failed');
      mockPlainToInstance.mockReturnValue(mockDto);
      mockValidateOrReject.mockResolvedValue(undefined);

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: TransactionCallback) => {
          const prismaMock: MockPrismaTransaction = {
            product: {
              create: jest.fn().mockResolvedValue(mockCreatedProduct),
            },
            productImage: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            productVariant: {
              create: jest.fn().mockRejectedValue(variantCreationError),
            },
            categoryProduct: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.createProduct(mockCreateProductDto)).rejects.toThrow(
        variantCreationError,
      );

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductDto, mockCreateProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockDto);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle category creation failure within transaction', async () => {
      const mockDto = { ...mockCreateProductDto };
      const categoryCreationError = new Error('Category creation failed');
      mockPlainToInstance.mockReturnValue(mockDto);
      mockValidateOrReject.mockResolvedValue(undefined);

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: TransactionCallback) => {
          const prismaMock: MockPrismaTransaction = {
            product: {
              create: jest.fn().mockResolvedValue(mockCreatedProduct),
            },
            productImage: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            productVariant: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            categoryProduct: {
              create: jest.fn().mockRejectedValue(categoryCreationError),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.createProduct(mockCreateProductDto)).rejects.toThrow(
        categoryCreationError,
      );

      expect(mockPlainToInstance).toHaveBeenCalledWith(CreateProductDto, mockCreateProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockDto);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle variants with null endDate correctly', async () => {
      const mockDto = { ...mockCreateProductDto };
      mockPlainToInstance.mockReturnValue(mockDto);
      mockValidateOrReject.mockResolvedValue(undefined);

      const capturedVariantData: {
        price: number;
        startDate: Date;
        endDate: Date | null;
        productId: number;
        sizeId: number;
      }[] = [];

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: TransactionCallback) => {
          const prismaMock: MockPrismaTransaction = {
            product: {
              create: jest.fn().mockResolvedValue(mockCreatedProduct),
            },
            productImage: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
            productVariant: {
              create: jest.fn().mockImplementation(
                (args: {
                  data: {
                    price: number;
                    startDate: Date;
                    endDate: Date | null;
                    productId: number;
                    sizeId: number;
                  };
                }) => {
                  capturedVariantData.push(args.data);
                  return Promise.resolve({ id: 1 });
                },
              ),
            },
            categoryProduct: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const result = await service.createProduct(mockCreateProductDto);

      expect(result).toEqual(mockCreatedProduct);
      expect(capturedVariantData).toHaveLength(2);
      expect(capturedVariantData[0].endDate).toBeInstanceOf(Date);
      expect(capturedVariantData[1].endDate).toBeNull();
    });
  });
});
