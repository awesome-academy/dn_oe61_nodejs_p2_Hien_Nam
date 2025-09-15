import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { ProductWithIncludes } from '@app/common/types/product.type';
import { PrismaService } from '@app/prisma';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { ProductStatus } from '../generated/prisma';
import { ProductService } from '../src/product-service.service';

// Mock class-transformer
jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn().mockImplementation((_cls: unknown, obj: unknown) => obj),
  Type: () => () => {},
  Transform: () => () => {},
}));

// Mock class-validator
jest.mock('class-validator', () => ({
  validateOrReject: jest.fn(),
  IsString: () => () => {},
  IsOptional: () => () => {},
  IsNumber: () => () => {},
  IsInt: () => () => {},
  IsArray: () => () => {},
  ArrayNotEmpty: () => () => {},
  IsEnum: () => () => {},
  IsDecimal: () => () => {},
  IsDateString: () => () => {},
  IsNotEmpty: () => () => {},
  ValidateNested: () => () => {},
  Min: () => () => {},
  Max: () => () => {},
  IsDate: () => () => {},
}));
import { NOTIFICATION_SERVICE } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { ProductProducer } from '../src/product.producer';
import { I18nService } from 'nestjs-i18n';
import { CacheService } from '@app/common/cache/cache.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';

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
describe('ProductService - listProductsForUser', () => {
  let service: ProductService;

  const mockPrismaService = {
    client: {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    },
  };

  const mockPaginationService = {
    queryWithPagination: jest.fn(),
  };
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  } as unknown as CacheService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CustomLogger, useValue: mockLogger },
        { provide: PaginationService, useValue: mockPaginationService },

        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: ProductProducer,
          useValue: mockProductProducer,
        },
        {
          provide: NOTIFICATION_SERVICE,
          useValue: mockNotificationClient,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('listProductsForUser', () => {
    const createMockProduct = (id: number, name: string): ProductWithIncludes => {
      const now = new Date();
      return {
        id,
        name,
        skuId: `SKU${id}`,
        description: `Description for ${name}`,
        status: ProductStatus.IN_STOCK,
        basePrice: new Decimal(10.99),
        quantity: 100,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        images: [
          {
            id: 1,
            url: 'https://example.com/image1.jpg',
            productId: id,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ] as ProductWithIncludes['images'],
        variants: [
          {
            id: 1,
            price: 10.99,
            startDate: now,
            endDate: null,
            sizeId: 1,
            productId: id,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            size: {
              id: 1,
              name: 'Medium',
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            },
          },
        ] as ProductWithIncludes['variants'],
        categories: [
          {
            id: 1,
            productId: id,
            categoryId: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            category: {
              id: 1,
              name: 'Food',
              parentId: null,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            },
          },
        ] as ProductWithIncludes['categories'],
        reviews: [
          {
            id: 1,
            rating: 5,
            comment: 'Great product!',
            createdAt: now,
            updatedAt: now,
            userId: 1,
            productId: id,
          },
        ] as ProductWithIncludes['reviews'],
      };
    };

    const createMockPaginationResult = (items: ProductWithIncludes[]) => ({
      items,
      paginations: {
        currentPage: 1,
        totalPages: Math.ceil(items.length / 50) || 1,
        pageSize: 50,
        totalItems: items.length,
        itemsOnPage: items.length,
      },
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('successful scenarios', () => {
      it('should return products successfully with basic query', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockProducts = [createMockProduct(1, 'Test Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(mockPlainToInstance).toHaveBeenCalledWith(GetAllProductUserDto, query);
        expect(mockValidateOrReject).toHaveBeenCalled();
        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );

        expect(result).toEqual(mockPaginationResult);

        // Verify structure and field mapping
        const product = result.items[0];
        expect(product.description).toBe('Description for Test Product');
        expect(product.basePrice).toEqual(new Decimal(10.99));
        expect(product.quantity).toBe(100);
        expect(product.updatedAt).toBeInstanceOf(Date);

        // Verify nested properties
        expect(product.images).toBeDefined();
        expect(product.categories).toBeDefined();
        expect(product.variants).toBeDefined();
        expect(product.reviews).toBeDefined();
        expect(Array.isArray(result.items[0].images)).toBe(true);
        expect(Array.isArray(result.items[0].categories)).toBe(true);
        expect(Array.isArray(result.items[0].variants)).toBe(true);
        expect(Array.isArray(result.items[0].reviews)).toBe(true);
      });

      it('should filter by name correctly', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50, name: 'Pizza' };
        const mockProducts = [createMockProduct(1, 'Pizza')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              name: { contains: 'Pizza' },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );

        expect(result).toEqual(mockPaginationResult);
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('paginations');
        expect(Array.isArray(result.items)).toBe(true);
        expect(result.items.length).toBe(1);
        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              name: { contains: 'Pizza' },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );
      });

      it('should filter by price range correctly', async () => {
        const query: GetAllProductUserDto = {
          page: 1,
          pageSize: 50,
          minPrice: 5.0,
          maxPrice: 20.0,
        };
        const mockProducts = [createMockProduct(1, 'Price Range Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              variants: {
                some: {
                  price: {
                    gte: 5.0,
                    lte: 20.0,
                  },
                },
              },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );

        expect(result.items).toHaveLength(1);
      });

      it('should filter by rating correctly', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50, rating: 4 };
        const mockProducts = [createMockProduct(1, 'High Rating Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              reviews: {
                some: { rating: { gte: 4 } },
              },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );

        expect(result.items).toHaveLength(1);
      });

      it('should handle complex filtering with all parameters', async () => {
        const query: GetAllProductUserDto = {
          page: 2,
          pageSize: 20,
          name: 'Premium Pizza',
          rootCategoryId: 1,
          categoryId: 3,
          minPrice: 15.0,
          maxPrice: 30.0,
          rating: 4,
        };
        const mockProducts = [createMockProduct(1, 'Premium Pizza')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 2, pageSize: 20 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              name: { contains: 'Premium Pizza' },
              categories: {
                some: {
                  OR: [
                    { category: { id: 1, parentId: null } },
                    { category: { id: 3, parentId: 1 } },
                  ],
                },
              },
              variants: {
                some: {
                  price: {
                    gte: 15.0,
                    lte: 30.0,
                  },
                },
              },
              reviews: {
                some: { rating: { gte: 4 } },
              },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );

        expect(result.items).toHaveLength(1);
      });
    });

    describe('error scenarios', () => {
      it('should throw TypedRpcException when validation fails', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const validationError = new Error('Validation failed');

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockRejectedValue(validationError);

        await expect(service.listProductsForUser(query)).rejects.toThrow(validationError);

        expect(mockPlainToInstance).toHaveBeenCalledWith(GetAllProductUserDto, query);
        expect(mockValidateOrReject).toHaveBeenCalled();
        expect(mockPaginationService.queryWithPagination).not.toHaveBeenCalled();
      });

      it('should return empty array when no products found', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockPaginationResult = createMockPaginationResult([]);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('paginations');
        expect(Array.isArray(result.items)).toBe(true);
        expect(result.items.length).toBe(0);
        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );
      });

      it('should propagate database errors', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const databaseError = new Error('Database connection failed');

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockRejectedValue(databaseError);

        await expect(service.listProductsForUser(query)).rejects.toThrow(databaseError);
      });
    });

    describe('edge cases', () => {
      it('should handle zero price values correctly (no price filter applied)', async () => {
        const query: GetAllProductUserDto = {
          page: 1,
          pageSize: 50,
          minPrice: 0,
          maxPrice: 0,
        };
        const mockProducts = [createMockProduct(1, 'Free Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        // Zero values are falsy, so no price filter is applied
        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );

        expect(result.items).toHaveLength(1);
      });

      it('should verify correct method signature and return type', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };
        const mockProducts = [createMockProduct(1, 'Type Test Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        // Verify return type structure
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('paginations');
        expect(Array.isArray(result.items)).toBe(true);
        expect(result.items).toHaveLength(1);

        // Verify product structure
        const product = result.items[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('skuId');
        expect(product).toHaveProperty('status');
        expect(product).toHaveProperty('basePrice');
        expect(product).toHaveProperty('quantity');
        expect(product).toHaveProperty('images');
        expect(product).toHaveProperty('categories');
        expect(product).toHaveProperty('variants');
        expect(product).toHaveProperty('reviews');
        expect(typeof product.id).toBe('number');
        expect(typeof product.name).toBe('string');
        expect(typeof product.skuId).toBe('string');
        expect(product.basePrice).toBeInstanceOf(Decimal);
      });
    });

    describe('buildUserProductWhereClause filtering logic', () => {
      it('should filter by rootCategoryId only', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50, rootCategoryId: 1 };
        const mockProducts = [createMockProduct(1, 'Root Category Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              categories: {
                some: {
                  OR: [{ category: { id: 1, parentId: null } }],
                },
              },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );
      });

      it('should filter by categoryId only', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50, categoryId: 2 };
        const mockProducts = [createMockProduct(1, 'Category Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              categories: {
                some: {
                  OR: [{ category: { id: 2, parentId: undefined } }],
                },
              },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );
      });

      it('should filter by minPrice only', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50, minPrice: 10.0 };
        const mockProducts = [createMockProduct(1, 'Min Price Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              variants: {
                some: {
                  price: {
                    gte: 10.0,
                  },
                },
              },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );
      });

      it('should filter by maxPrice only', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50, maxPrice: 15.0 };
        const mockProducts = [createMockProduct(1, 'Max Price Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
              variants: {
                some: {
                  price: {
                    lte: 15.0,
                  },
                },
              },
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );
      });

      it('should handle empty string name filter correctly', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50, name: '' };
        const mockProducts = [createMockProduct(1, 'Any Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );
      });

      it('should handle undefined optional parameters correctly', async () => {
        const query: GetAllProductUserDto = {
          page: 1,
          pageSize: 50,
          name: undefined,
          rootCategoryId: undefined,
          categoryId: undefined,
          minPrice: undefined,
          maxPrice: undefined,
          rating: undefined,
        };
        const mockProducts = [createMockProduct(1, 'Basic Product')];
        const mockPaginationResult = createMockPaginationResult(mockProducts);

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 1, pageSize: 50 },
          {
            orderBy: { createdAt: 'asc' },
            where: {
              deletedAt: null,
              status: ProductStatus.IN_STOCK,
            },
            include: {
              images: true,
              categories: { include: { category: true } },
              variants: { include: { size: true } },
              reviews: true,
            },
          },
        );
      });

      it('should handle multiple products with different pagination', async () => {
        const query: GetAllProductUserDto = { page: 3, pageSize: 10 };
        const mockProducts = [createMockProduct(1, 'Product 1'), createMockProduct(2, 'Product 2')];
        const mockPaginationResult = {
          items: mockProducts,
          total: 25,
          page: 3,
          pageSize: 10,
          totalPages: 3,
        };

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
          mockPrismaService.client.product,
          { page: 3, pageSize: 10 },
          expect.objectContaining({}),
        );

        expect(result.items).toHaveLength(2);
        expect(result.items[0].name).toBe('Product 1');
        expect(result.items[1].name).toBe('Product 2');
      });

      it('should handle products with null/undefined fields and empty arrays', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };

        // Create product with null/undefined values to trigger fallback logic
        const mockProductWithNulls = {
          id: 1,
          skuId: 'NULL-PRODUCT-001',
          name: 'Product with nulls',
          description: null, // Will trigger ?? '' fallback
          status: ProductStatus.IN_STOCK,
          basePrice: null, // Will trigger ?? 0 fallback
          quantity: null, // Will trigger ?? 0 fallback
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: null, // Will trigger ?? null fallback
          deletedAt: null,
          images: [], // Will trigger ?.length ? images : [] fallback
          categories: [], // Will trigger ?.length ? categories : [] fallback
          variants: [], // Will trigger ?.length ? variants : [] fallback
          reviews: [], // Will trigger ?.length ? reviews : [] fallback
        };

        const mockPaginationResult = {
          items: [mockProductWithNulls],
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        };

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(result.items).toHaveLength(1);
        const product = result.items[0];

        // Verify fallback values are applied correctly
        expect(product.description).toBe(''); // null ?? '' = ''
        expect(product.basePrice).toBe(0); // null ?? 0 = 0
        expect(product.quantity).toBe(0); // null ?? 0 = 0
        expect(product.updatedAt).toBeNull(); // null ?? null = null

        // Verify empty arrays are handled correctly
        expect(product.images).toEqual([]); // [].length ? [] : [] = []
        expect(product.categories).toEqual([]); // [].length ? [] : [] = []
        expect(product.variants).toEqual([]); // [].length ? [] : [] = []
        expect(product.reviews).toEqual([]); // [].length ? [] : [] = []
      });

      it('should handle products with undefined arrays', async () => {
        const query: GetAllProductUserDto = { page: 1, pageSize: 50 };

        // Create product with undefined arrays to trigger fallback logic
        const mockProductWithUndefinedArrays = {
          id: 2,
          skuId: 'UNDEFINED-ARRAYS-002',
          name: 'Product with undefined arrays',
          description: 'Valid description',
          status: ProductStatus.IN_STOCK,
          basePrice: 100,
          quantity: 10,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
          deletedAt: null,
          images: undefined, // Will trigger ?.length ? images : [] fallback
          categories: undefined, // Will trigger ?.length ? categories : [] fallback
          variants: undefined, // Will trigger ?.length ? variants : [] fallback
          reviews: undefined, // Will trigger ?.length ? reviews : [] fallback
        };

        const mockPaginationResult = {
          items: [mockProductWithUndefinedArrays],
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        };

        mockPlainToInstance.mockReturnValue(query);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

        const result = await service.listProductsForUser(query);

        expect(result.items).toHaveLength(1);
        const product = result.items[0];

        // Verify undefined arrays fallback to empty arrays
        expect(product.images).toEqual([]); // undefined?.length ? undefined : [] = []
        expect(product.categories).toEqual([]); // undefined?.length ? undefined : [] = []
        expect(product.variants).toEqual([]); // undefined?.length ? undefined : [] = []
        expect(product.reviews).toEqual([]); // undefined?.length ? undefined : [] = []
      });
    });
  });
});
