import { skuIdProductDto } from '@app/common/dto/product/delete-product.dto';
import {
  CategoryResponse,
  ChildCategories,
} from '@app/common/dto/product/response/category-response';
import { ProductWithCategories } from '@app/common/dto/product/response/product-with-categories.interface';
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
import { ConfigService } from '@nestjs/config';
import { NOTIFICATION_SERVICE } from '@app/common';
import { I18nService } from 'nestjs-i18n';
import { ProductProducer } from '../src/product.producer';

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
// Type for accessing private method
interface ProductServiceWithPrivate {
  groupedCategories: (product: ProductWithCategories) => Promise<CategoryResponse[]>;
}

describe('ProductService - getById and groupedCategories', () => {
  let service: ProductService;
  let mockPrismaClient: {
    product: {
      findUnique: jest.MockedFunction<
        (args: {
          where: { skuId: string };
          include: {
            images: boolean;
            categories: { include: { category: boolean } };
            variants: { include: { size: boolean } };
          };
        }) => Promise<ProductWithCategories | null>
      >;
    };
    category: {
      findMany: jest.MockedFunction<
        (args: {
          where: { parentId: { in: number[] } };
          take: number;
          skip: number;
        }) => Promise<Array<{ id: number; name: string; parentId: number | null }>>
      >;
    };
  };
  let mockLogger: {
    log: jest.MockedFunction<(message: string) => void>;
    error: jest.MockedFunction<(context: string, message: string, stack?: string) => void>;
    warn: jest.MockedFunction<(message: string) => void>;
    debug: jest.MockedFunction<(message: string) => void>;
    verbose: jest.MockedFunction<(message: string) => void>;
  };

  beforeEach(async () => {
    mockPrismaClient = {
      product: {
        findUnique: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
      },
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
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
          useValue: mockLogger,
        },
        {
          provide: PaginationService,
          useValue: {
            queryWithPagination: jest.fn(),
          },
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

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    const mockskuIdProductDto: skuIdProductDto = {
      skuId: 'PROD-001',
    };

    const mockProductFromDatabase = {
      id: 1,
      skuId: 'PROD-001',
      name: 'Test Product',
      description: 'Test Description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal('99.99'),
      quantity: 10,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      images: [
        { id: 1, url: 'https://example.com/image1.jpg' },
        { id: 2, url: 'https://example.com/image2.jpg' },
      ],
      categories: [
        {
          category: {
            id: 1,
            name: 'Electronics',
            parentId: null,
          },
        },
      ],
      variants: [
        {
          id: 1,
          price: new Decimal('89.99'),
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          size: {
            id: 1,
            nameSize: 'Medium',
            description: 'Medium size',
          },
        },
      ],
    };

    const mockChildCategories = [{ id: 2, name: 'Smartphones', parentId: 1 }];

    beforeEach(() => {
      mockPlainToInstance.mockReturnValue(mockskuIdProductDto);
      mockValidateOrReject.mockResolvedValue();
    });

    it('should return product detail successfully when product exists', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...mockProductFromDatabase,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue(mockChildCategories);

      const result = await service.getById(mockskuIdProductDto);

      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
      expect(result!.skuId).toBe('PROD-001');
      expect(result!.name).toBe('Test Product');
      expect(result!.description).toBe('Test Description');
      expect(result!.status).toBe(StatusProduct.IN_STOCK);
      expect(result!.basePrice).toEqual(new Decimal('99.99'));
      expect(result!.quantity).toBe(10);

      expect(result!.images).toHaveLength(2);
      expect(result!.images[0]).toEqual({
        id: 1,
        url: 'https://example.com/image1.jpg',
      });

      expect(result!.variants).toHaveLength(1);
      expect(result!.variants[0].id).toBe(1);
      expect(result!.variants[0].price).toEqual(new Decimal('89.99'));
      expect(result!.variants[0].size.id).toBe('1');
      expect(result!.variants[0].size.nameSize).toBe('Medium');

      expect(result!.categories).toHaveLength(1);
      expect(result!.categories[0].rootCategory.name).toBe('Electronics');

      expect(mockPrismaClient.product.findUnique).toHaveBeenCalledWith({
        where: { skuId: 'PROD-001' },
        include: {
          images: true,
          categories: {
            include: {
              category: true,
            },
          },
          variants: {
            include: {
              size: true,
            },
          },
        },
      });
    });

    it('should throw TypedRpcException when product not found', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue(null);

      await expect(service.getById(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);

      try {
        await service.getById(mockskuIdProductDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorData = typedError.getError();
        expect(errorData.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorData.message).toBe('common.product.error.productNotFound');
      }
    });

    it('should handle validation errors from DTO', async () => {
      const validationError = new Error('Validation failed');
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.getById(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);

      expect(mockPrismaClient.product.findUnique).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'DeleteProduct',
        'Validation failed',
        expect.stringMatching(/.*/),
      );
    });

    it('should handle database errors and throw TypedRpcException', async () => {
      const databaseError = new Error('Database connection failed');
      mockPrismaClient.product.findUnique.mockRejectedValue(databaseError);

      await expect(service.getById(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'DeleteProduct',
        'Database connection failed',
        expect.stringMatching(/.*/),
      );
    });

    it('should handle product with null description', async () => {
      const productWithNullDescription = {
        ...mockProductFromDatabase,
        description: null,
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithNullDescription,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.description).toBe('');
    });

    it('should handle product with null image URLs', async () => {
      const productWithNullImageUrls = {
        ...mockProductFromDatabase,
        images: [
          { id: 1, url: null },
          { id: 2, url: 'https://example.com/image2.jpg' },
        ],
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithNullImageUrls,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.images[0].url).toBe('');
      expect(result!.images[1].url).toBe('https://example.com/image2.jpg');
    });

    it('should handle product with null variant dates', async () => {
      const productWithNullDates = {
        ...mockProductFromDatabase,
        variants: [
          {
            id: 1,
            price: new Decimal('99.99'),
            startDate: null,
            endDate: null,
            size: {
              id: 1,
              nameSize: 'Medium',
              description: null,
            },
          },
        ],
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithNullDates,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.variants[0].startDate).toBeNull();
      expect(result!.variants[0].endDate).toBeNull();
      expect(result!.variants[0].size.description).toBe('');
    });

    it('should handle product with no images', async () => {
      const productWithNoImages = {
        ...mockProductFromDatabase,
        images: [],
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithNoImages,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.images).toEqual([]);
    });

    it('should handle product with no variants', async () => {
      const productWithNoVariants = {
        ...mockProductFromDatabase,
        variants: [],
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithNoVariants,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.variants).toEqual([]);
    });

    it('should handle product with no categories', async () => {
      const productWithNoCategories = {
        ...mockProductFromDatabase,
        categories: [],
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithNoCategories,
        deletedAt: null,
      });

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.categories).toEqual([]);
      expect(mockPrismaClient.category.findMany).not.toHaveBeenCalled();
    });

    it('should handle different product statuses', async () => {
      const soldOutProduct = {
        ...mockProductFromDatabase,
        deletedAt: null,
        status: StatusProduct.SOLD_OUT,
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({ ...soldOutProduct, deletedAt: null });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.status).toBe(StatusProduct.SOLD_OUT);
    });

    it('should validate DTO using plainToInstance and validateOrReject', async () => {
      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...mockProductFromDatabase,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      await service.getById(mockskuIdProductDto);

      expect(mockPlainToInstance).toHaveBeenCalledWith(skuIdProductDto, mockskuIdProductDto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockskuIdProductDto);
    });

    it('should propagate TypedRpcException without modification', async () => {
      const typedRpcError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'custom.error.message',
      });

      mockValidateOrReject.mockRejectedValue(typedRpcError);

      await expect(service.getById(mockskuIdProductDto)).rejects.toThrow(typedRpcError);

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle large decimal prices correctly', async () => {
      const productWithLargePrice = {
        ...mockProductFromDatabase,
        basePrice: new Decimal('999999.99'),
        variants: [
          {
            id: 1,
            price: new Decimal('888888.88'),
            startDate: new Date('2023-01-01T00:00:00.000Z'),
            endDate: new Date('2023-12-31T23:59:59.999Z'),
            size: {
              id: 1,
              nameSize: 'Large',
              description: 'Large size',
            },
          },
        ],
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithLargePrice,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.basePrice).toEqual(new Decimal('999999.99'));
      expect(result!.variants[0].price).toEqual(new Decimal('888888.88'));
    });

    it('should handle null groupedCategories result', async () => {
      const productWithCategories = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: 1,
              name: 'Electronics',
              parentId: null,
            },
          },
        ],
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithCategories,
        deletedAt: null,
      });

      // Spy on the private groupedCategories method to return null
      const groupedCategoriesSpy = jest
        .spyOn(service as unknown as ProductServiceWithPrivate, 'groupedCategories')
        .mockResolvedValue(null as unknown as CategoryResponse[]);

      const result = await service.getById(mockskuIdProductDto);

      // Should use the fallback empty array when groupedCategories returns null
      expect(result!.categories).toEqual([]);
      expect(groupedCategoriesSpy).toHaveBeenCalledWith({
        ...productWithCategories,
        deletedAt: null,
      });

      groupedCategoriesSpy.mockRestore();
    });

    it('should handle variant with null nameSize', async () => {
      const productWithNullNameSize = {
        ...mockProductFromDatabase,
        variants: [
          {
            id: 1,
            price: new Decimal('99.99'),
            startDate: new Date('2023-01-01T00:00:00.000Z'),
            endDate: new Date('2023-12-31T23:59:59.999Z'),
            size: {
              id: 1,
              nameSize: null,
              description: 'Size with null name',
            },
          },
        ],
      };

      mockPrismaClient.product.findUnique.mockResolvedValue({
        ...productWithNullNameSize,
        deletedAt: null,
      });
      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await service.getById(mockskuIdProductDto);

      expect(result!.variants[0].size.nameSize).toBe('');
    });

    it('should handle non-Error exceptions', async () => {
      const nonErrorException = 'String error';
      mockPrismaClient.product.findUnique.mockRejectedValue(nonErrorException);

      await expect(service.getById(mockskuIdProductDto)).rejects.toThrow(TypedRpcException);

      expect(mockLogger.error).toHaveBeenCalledWith('DeleteProduct', 'String error', undefined);
    });
  });

  describe('groupedCategories', () => {
    const mockProductFromDatabase: ProductWithCategories = {
      id: 1,
      skuId: 'PROD-001',
      name: 'Test Product',
      description: 'Test Description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal('99.99'),
      quantity: 10,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      deletedAt: null,
      categories: [
        {
          category: {
            id: 1,
            name: 'Electronics',
            parentId: null,
          },
        },
        {
          category: {
            id: 2,
            name: 'Clothing',
            parentId: null,
          },
        },
      ],
    };

    const mockChildCategories = [
      { id: 3, name: 'Smartphones', parentId: 1 },
      { id: 4, name: 'Laptops', parentId: 1 },
      { id: 5, name: 'T-Shirts', parentId: 2 },
      { id: 6, name: 'Jeans', parentId: 2 },
    ];

    it('should return grouped categories with root and child categories', async () => {
      mockPrismaClient.category.findMany.mockResolvedValue(mockChildCategories);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        mockProductFromDatabase,
      );

      expect(result).toHaveLength(2);

      // Verify first category group
      expect(result[0].rootCategory).toEqual({
        id: 1,
        name: 'Electronics',
        parent: '',
      });
      expect(result[0].childCategories).toHaveLength(2);
      expect(result[0].childCategories).toEqual([
        { id: 3, name: 'Smartphones', parent: 1 },
        { id: 4, name: 'Laptops', parent: 1 },
      ]);

      // Verify second category group
      expect(result[1].rootCategory).toEqual({
        id: 2,
        name: 'Clothing',
        parent: '',
      });
      expect(result[1].childCategories).toHaveLength(2);
      expect(result[1].childCategories).toEqual([
        { id: 5, name: 'T-Shirts', parent: 2 },
        { id: 6, name: 'Jeans', parent: 2 },
      ]);

      expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith({
        where: {
          parentId: {
            in: [1, 2],
          },
        },
      });
    });

    it('should return empty array when product has no root categories', async () => {
      const productWithNoRootCategories: ProductWithCategories = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: 3,
              name: 'Child Category',
              parentId: 1,
            },
          },
        ],
      };

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithNoRootCategories,
      );

      expect(result).toEqual([]);
      expect(mockPrismaClient.category.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when product has no categories', async () => {
      const productWithNoCategories: ProductWithCategories = {
        ...mockProductFromDatabase,
        categories: [],
      };

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithNoCategories,
      );

      expect(result).toEqual([]);
      expect(mockPrismaClient.category.findMany).not.toHaveBeenCalled();
    });

    it('should handle root categories with no child categories', async () => {
      const productWithSingleRootCategory: ProductWithCategories = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: 1,
              name: 'Electronics',
              parentId: null,
            },
          },
        ],
      };

      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithSingleRootCategory,
      );

      expect(result).toHaveLength(1);
      expect(result[0].rootCategory).toEqual({
        id: 1,
        name: 'Electronics',
        parent: '',
      });
      expect(result[0].childCategories).toEqual([]);

      expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith({
        where: {
          parentId: {
            in: [1],
          },
        },
      });
    });

    it('should filter child categories correctly by parentId', async () => {
      const mixedChildCategories = [
        { id: 3, name: 'Smartphones', parentId: 1 },
        { id: 4, name: 'T-Shirts', parentId: 2 },
        { id: 5, name: 'Laptops', parentId: 1 },
        { id: 6, name: 'Unrelated', parentId: 99 },
      ];

      mockPrismaClient.category.findMany.mockResolvedValue(mixedChildCategories);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        mockProductFromDatabase,
      );

      expect(result).toHaveLength(2);

      // Electronics category should have 2 children
      const electronicsCategory = result.find((r) => r.rootCategory.name === 'Electronics');
      expect(electronicsCategory?.childCategories).toHaveLength(2);
      expect(electronicsCategory?.childCategories.map((c) => c.name)).toEqual([
        'Smartphones',
        'Laptops',
      ]);

      // Clothing category should have 1 child
      const clothingCategory = result.find((r) => r.rootCategory.name === 'Clothing');
      expect(clothingCategory?.childCategories).toHaveLength(1);
      expect(clothingCategory?.childCategories[0].name).toBe('T-Shirts');
    });

    it('should handle database error during child category fetch', async () => {
      const databaseError = new Error('Database connection failed');
      mockPrismaClient.category.findMany.mockRejectedValue(databaseError);

      await expect(
        (service as unknown as ProductServiceWithPrivate).groupedCategories(
          mockProductFromDatabase,
        ),
      ).rejects.toThrow('Database connection failed');

      expect(mockPrismaClient.category.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle categories with special characters in names', async () => {
      const productWithSpecialCategories: ProductWithCategories = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: 1,
              name: 'Food & Beverages',
              parentId: null,
            },
          },
        ],
      };

      const specialChildCategories = [{ id: 3, name: 'Organic Coffee & Tea', parentId: 1 }];

      mockPrismaClient.category.findMany.mockResolvedValue(specialChildCategories);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithSpecialCategories,
      );

      expect(result[0].rootCategory.name).toBe('Food & Beverages');
      expect(result[0].childCategories[0].name).toBe('Organic Coffee & Tea');
    });

    it('should handle child categories with null parentId filtering', async () => {
      const productWithCategories = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: 1,
              name: 'Electronics',
              parentId: null,
            },
          },
        ],
      };

      const childCategoriesWithMixed = [
        {
          id: 2,
          name: 'Smartphones',
          parentId: null, // This should be filtered out
        },
        {
          id: 3,
          name: 'Laptops',
          parentId: 1, // This should be included
        },
      ];

      mockPrismaClient.category.findMany.mockResolvedValue(childCategoriesWithMixed);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithCategories,
      );

      expect(result).toHaveLength(1);
      expect(result[0].rootCategory.name).toBe('Electronics');
      expect(result[0].childCategories).toHaveLength(1);
      expect(result[0].childCategories[0].name).toBe('Laptops');
      expect(result[0].childCategories[0].parent).toBe(1);
    });

    it('should maintain referential integrity between root and child categories', async () => {
      mockPrismaClient.category.findMany.mockResolvedValue(mockChildCategories);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        mockProductFromDatabase,
      );

      result.forEach((categoryGroup: CategoryResponse) => {
        categoryGroup.childCategories.forEach((child: ChildCategories) => {
          expect(child.parent).toBe(categoryGroup.rootCategory.id);
        });
      });
    });

    it('should handle large number of categories efficiently', async () => {
      const manyRootCategories = Array.from({ length: 5 }, (_, i) => ({
        category: {
          id: i + 1,
          name: `Category ${i + 1}`,
          parentId: null,
        },
      }));

      const manyChildCategories = Array.from({ length: 10 }, (_, i) => ({
        id: i + 6,
        name: `Child Category ${i + 1}`,
        parentId: Math.floor(i / 2) + 1,
      }));

      const productWithManyCategories: ProductWithCategories = {
        ...mockProductFromDatabase,
        categories: manyRootCategories,
      };

      mockPrismaClient.category.findMany.mockResolvedValue(manyChildCategories);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithManyCategories,
      );

      expect(result).toHaveLength(5);
      expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith({
        where: {
          parentId: {
            in: [1, 2, 3, 4, 5],
          },
        },
      });
    });

    it('should return correct data types in response', async () => {
      mockPrismaClient.category.findMany.mockResolvedValue(mockChildCategories);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        mockProductFromDatabase,
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      result.forEach((categoryGroup: CategoryResponse) => {
        expect(typeof categoryGroup.rootCategory.id).toBe('number');
        expect(typeof categoryGroup.rootCategory.name).toBe('string');
        expect(typeof categoryGroup.rootCategory.parent).toBe('string');

        expect(Array.isArray(categoryGroup.childCategories)).toBe(true);
        categoryGroup.childCategories.forEach((child: ChildCategories) => {
          expect(typeof child.id).toBe('number');
          expect(typeof child.name).toBe('string');
          expect(typeof child.parent).toBe('number');
        });
      });
    });

    it('should handle concurrent calls correctly', async () => {
      mockPrismaClient.category.findMany.mockResolvedValue(mockChildCategories);

      const promises = [
        (service as unknown as ProductServiceWithPrivate).groupedCategories(
          mockProductFromDatabase,
        ),
        (service as unknown as ProductServiceWithPrivate).groupedCategories(
          mockProductFromDatabase,
        ),
        (service as unknown as ProductServiceWithPrivate).groupedCategories(
          mockProductFromDatabase,
        ),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toHaveLength(2);
        expect(result[0].rootCategory.name).toBe('Electronics');
        expect(result[1].rootCategory.name).toBe('Clothing');
      });

      expect(mockPrismaClient.category.findMany).toHaveBeenCalledTimes(3);
    });

    it('should handle child categories with null parentId', async () => {
      const childCategoriesWithNullParent = [
        { id: 3, name: 'Smartphones', parentId: 1 },
        { id: 4, name: 'Orphan Category', parentId: null },
      ];

      mockPrismaClient.category.findMany.mockResolvedValue(childCategoriesWithNullParent);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        mockProductFromDatabase,
      );

      expect(result).toHaveLength(2);
      // The orphan category should not be included in any root category's children
      expect(result[0].childCategories).toHaveLength(1);
      expect(result[0].childCategories[0].name).toBe('Smartphones');
      expect(result[1].childCategories).toHaveLength(0);
    });

    it('should return empty array when no root categories found after processing', async () => {
      const productWithNonRootCategories = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: 5,
              name: 'Child Category Only',
              parentId: 99, // Not a root category
            },
          },
        ],
      };

      mockPrismaClient.category.findMany.mockResolvedValue([]);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithNonRootCategories,
      );

      expect(result).toEqual([]);
    });
    it('should handle a child category with a null parentId to cover nullish coalescing', async () => {
      const productWithRootCategory = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: null, // Using null to match the child's parentId for the filter
              name: 'Root With Null ID',
              parentId: null,
            },
          },
        ],
      } as unknown as ProductWithCategories;

      const childCategoriesWithNullParent = [
        {
          id: 11,
          name: 'Child With Null Parent',
          parentId: null, // This should be filtered IN and then mapped to ''
        },
      ];

      mockPrismaClient.category.findMany.mockResolvedValue(childCategoriesWithNullParent);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithRootCategory,
      );

      expect(result).toHaveLength(1);
      const rootCategory = result[0];
      expect(rootCategory.childCategories).toHaveLength(1);

      const child = rootCategory.childCategories[0];
      expect(child.name).toBe('Child With Null Parent');
      expect(child.parent).toBe(''); // This verifies the nullish coalescing
    });

    it('should return an empty array when product has only child categories', async () => {
      const productWithOnlyChildCategories = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: 10,
              name: 'A Child Category',
              parentId: 1, // This is not a root category
            },
          },
        ],
      };

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithOnlyChildCategories,
      );

      expect(result).toEqual([]);
      expect(mockPrismaClient.category.findMany).not.toHaveBeenCalled();
    });

    it('should handle edge case with comprehensive category scenarios', async () => {
      const productWithMixedCategories = {
        ...mockProductFromDatabase,
        categories: [
          {
            category: {
              id: 1,
              name: 'Electronics',
              parentId: null,
            },
          },
          {
            category: {
              id: 2,
              name: 'Books',
              parentId: null,
            },
          },
        ],
      };

      // Mix of child categories with different parent relationships
      const mixedChildCategories = [
        {
          id: 10,
          name: 'Smartphones',
          parentId: 1, // Valid parent
        },
        {
          id: 11,
          name: 'Fiction',
          parentId: 2, // Valid parent
        },
        {
          id: 12,
          name: 'Orphan',
          parentId: 999, // Non-existent parent - will be filtered out
        },
      ];

      mockPrismaClient.category.findMany.mockResolvedValue(mixedChildCategories);

      const result = await (service as unknown as ProductServiceWithPrivate).groupedCategories(
        productWithMixedCategories,
      );

      expect(result).toHaveLength(2);
      expect(result[0].rootCategory.name).toBe('Electronics');
      expect(result[0].childCategories).toHaveLength(1);
      expect(result[0].childCategories[0].name).toBe('Smartphones');
      expect(result[0].childCategories[0].parent).toBe(1);

      expect(result[1].rootCategory.name).toBe('Books');
      expect(result[1].childCategories).toHaveLength(1);
      expect(result[1].childCategories[0].name).toBe('Fiction');
      expect(result[1].childCategories[0].parent).toBe(2);
    });
  });
});
