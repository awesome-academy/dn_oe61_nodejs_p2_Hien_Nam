import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Decimal } from '@prisma/client/runtime/library';
import { skuIdProductDto } from '@app/common/dto/product/delete-product.dto';

// Mock class-validator and class-transformer
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

// Type definitions for mock data
interface MockProductImage {
  id: number;
  url: string | null;
}

interface MockSize {
  id: number;
  nameSize: string;
  description: string | null;
}

interface MockProductVariant {
  id: number;
  price: Decimal;
  startDate: Date;
  endDate: Date | null;
  size: MockSize;
}

interface MockCategory {
  category: {
    id: number;
    name: string;
    parentId: number | null;
  };
}

interface MockReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  userId: number;
  productId: number;
}

interface MockProductWithIncludes {
  id: number;
  name: string;
  skuId: string;
  description: string | null;
  basePrice: Decimal;
  status: StatusProduct;
  quantity: number;
  images: MockProductImage[];
  categories: MockCategory[];
  variants: MockProductVariant[];
  reviews: MockReview[];
}

describe('ProductService - getProductDetailForUser', () => {
  let service: ProductService;
  let mockPrismaService: {
    client: {
      product: {
        findUnique: jest.MockedFunction<
          (args: {
            where: { skuId: string };
            include: {
              images: boolean;
              categories: { include: { category: boolean } };
              variants: { include: { size: boolean } };
              reviews: boolean;
            };
          }) => Promise<MockProductWithIncludes | null>
        >;
      };
    };
  };
  let mockLoggerService: {
    error: jest.MockedFunction<(message: string, trace?: string, context?: string) => void>;
    log: jest.MockedFunction<(message: string, context?: string) => void>;
    warn: jest.MockedFunction<(message: string, context?: string) => void>;
    debug: jest.MockedFunction<(message: string, context?: string) => void>;
    verbose: jest.MockedFunction<(message: string, context?: string) => void>;
    write: jest.MockedFunction<(chunk: string) => boolean>;
  };

  // Helper function to create mock product data
  const createMockProduct = (
    id: number,
    skuId: string,
    overrides: Partial<MockProductWithIncludes> = {},
  ): MockProductWithIncludes => {
    const now = new Date();
    return {
      id,
      name: `Test Product ${id}`,
      skuId,
      description: `Test product description ${id}`,
      basePrice: new Decimal(99.99),
      status: StatusProduct.IN_STOCK,
      quantity: 10,
      images: [
        {
          id: 1,
          url: 'https://example.com/image1.jpg',
        },
        {
          id: 2,
          url: 'https://example.com/image2.jpg',
        },
      ],
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
            name: 'Smartphones',
            parentId: 1,
          },
        },
      ],
      variants: [
        {
          id: 1,
          price: new Decimal(109.99),
          startDate: now,
          endDate: null,
          size: {
            id: 1,
            nameSize: 'Medium',
            description: 'Medium size',
          },
        },
        {
          id: 2,
          price: new Decimal(119.99),
          startDate: now,
          endDate: new Date(now.getTime() + 86400000), // +1 day
          size: {
            id: 2,
            nameSize: 'Large',
            description: null,
          },
        },
      ],
      reviews: [
        {
          id: 1,
          rating: 5,
          comment: 'Great product!',
          createdAt: now,
          updatedAt: null,
          userId: 1,
          productId: id,
        },
        {
          id: 2,
          rating: 4,
          comment: null,
          createdAt: now,
          updatedAt: now,
          userId: 2,
          productId: id,
        },
      ],
      ...overrides,
    };
  };

  beforeEach(async () => {
    mockPrismaService = {
      client: {
        product: {
          findUnique: jest.fn(),
        },
      },
    };

    mockLoggerService = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
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
          useValue: {
            queryWithPagination: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);

    // Mock the private groupedCategories method
    jest
      .spyOn(
        service as unknown as {
          groupedCategories: (
            product: MockProductWithIncludes,
          ) => Promise<Array<{ rootCategory: unknown; childCategories: unknown[] }>>;
        },
        'groupedCategories',
      )
      .mockImplementation((product: MockProductWithIncludes) => {
        return Promise.resolve(
          product.categories.map((cat) => ({
            rootCategory: cat.category.parentId === null ? cat.category : null,
            childCategories: cat.category.parentId !== null ? [cat.category] : [],
          })),
        );
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('successful scenarios', () => {
    it('should return product detail successfully with all data', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-001' };
      const mockProduct = createMockProduct(1, 'TEST-SKU-001');

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.skuId).toBe('TEST-SKU-001');
      expect(result?.name).toBe('Test Product 1');
      expect(result?.description).toBe('Test product description 1');
      expect(result?.basePrice).toEqual(new Decimal(99.99));
      expect(result?.status).toBe(StatusProduct.IN_STOCK);
      expect(result?.quantity).toBe(10);
      expect(result?.images).toHaveLength(2);
      expect(result?.variants).toHaveLength(2);
      expect(result?.reviews).toHaveLength(2);
      expect(result?.categories).toBeDefined();

      expect(mockPlainToInstance).toHaveBeenCalledWith(skuIdProductDto, dto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(dto);
      expect(mockPrismaService.client.product.findUnique).toHaveBeenCalledWith({
        where: { skuId: 'TEST-SKU-001' },
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
          reviews: true,
        },
      });
    });

    it('should handle product with empty description correctly', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-002' };
      const mockProduct = createMockProduct(2, 'TEST-SKU-002', {
        description: null,
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result).toBeDefined();
      expect(result?.description).toBe('');
    });

    it('should handle product with empty arrays correctly', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-003' };
      const mockProduct = createMockProduct(3, 'TEST-SKU-003', {
        images: [],
        variants: [],
        reviews: [],
        categories: [],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result).toBeDefined();
      expect(result?.images).toHaveLength(0);
      expect(result?.variants).toHaveLength(0);
      expect(result?.reviews).toHaveLength(0);
      expect(result?.categories).toHaveLength(0);
    });

    it('should handle different product statuses correctly', async () => {
      const statuses = [StatusProduct.IN_STOCK, StatusProduct.SOLD_OUT, StatusProduct.PRE_SALE];

      for (const status of statuses) {
        const dto: skuIdProductDto = { skuId: `TEST-SKU-${status}` };
        const mockProduct = createMockProduct(1, `TEST-SKU-${status}`, { status });

        mockPlainToInstance.mockReturnValue(dto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

        const result = await service.getProductDetailForUser(dto);

        expect(result?.status).toBe(status);
      }
    });

    it('should handle variants with null endDate and size description', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-004' };
      const mockProduct = createMockProduct(4, 'TEST-SKU-004', {
        variants: [
          {
            id: 1,
            price: new Decimal(99.99),
            startDate: new Date(),
            endDate: null,
            size: {
              id: 1,
              nameSize: 'Small',
              description: null,
            },
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.variants[0].endDate).toBeNull();
      expect(result?.variants[0].size.description).toBe('');
    });

    it('should handle reviews with null comment and updatedAt', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-005' };
      const mockProduct = createMockProduct(5, 'TEST-SKU-005', {
        reviews: [
          {
            id: 1,
            rating: 3,
            comment: null,
            createdAt: new Date(),
            updatedAt: null,
            userId: 1,
            productId: 5,
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.reviews[0].comment).toBe('');
      expect(result?.reviews[0].updatedAt).toBeNull();
    });

    it('should handle images with null url correctly', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-006' };
      const mockProduct = createMockProduct(6, 'TEST-SKU-006', {
        images: [
          {
            id: 1,
            url: null,
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.images[0].url).toBe('');
    });
  });

  describe('error scenarios', () => {
    it('should throw TypedRpcException when product is not found', async () => {
      const dto: skuIdProductDto = { skuId: 'NON-EXISTENT-SKU' };

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductDetailForUser(dto)).rejects.toThrow(TypedRpcException);

      try {
        await service.getProductDetailForUser(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        expect(typedError.getError().code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(typedError.getError().message).toBe('common.product.error.productNotFound');
      }
    });

    it('should throw validation error when DTO validation fails', async () => {
      const dto: skuIdProductDto = { skuId: '' };
      const validationError = new Error('Validation failed: skuId should not be empty');

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockRejectedValue(validationError);

      await expect(service.getProductDetailForUser(dto)).rejects.toThrow(TypedRpcException);

      try {
        await service.getProductDetailForUser(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        expect(typedError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(typedError.getError().message).toBe('common.errors.internalServerError');
      }

      expect(mockPlainToInstance).toHaveBeenCalledWith(skuIdProductDto, dto);
      expect(mockValidateOrReject).toHaveBeenCalledWith(dto);
      expect(mockPrismaService.client.product.findUnique).not.toHaveBeenCalled();
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'DeleteProduct',
        'Validation failed: skuId should not be empty',
        expect.stringMatching(/.+/),
      );
    });

    it('should handle database connection errors', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-DB-ERROR' };
      const dbError = new Error('Database connection failed');

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockRejectedValue(dbError);

      await expect(service.getProductDetailForUser(dto)).rejects.toThrow(TypedRpcException);

      try {
        await service.getProductDetailForUser(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        expect(typedError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(typedError.getError().message).toBe('common.errors.internalServerError');
      }

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'DeleteProduct',
        'Database connection failed',
        expect.stringMatching(/.+/),
      );
    });

    it('should handle groupedCategories method errors', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-CATEGORY-ERROR' };
      const mockProduct = createMockProduct(1, 'TEST-SKU-CATEGORY-ERROR');
      const categoryError = new Error('Category grouping failed');

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);
      jest
        .spyOn(
          service as unknown as {
            groupedCategories: (product: MockProductWithIncludes) => Promise<unknown>;
          },
          'groupedCategories',
        )
        .mockRejectedValue(categoryError);

      await expect(service.getProductDetailForUser(dto)).rejects.toThrow(TypedRpcException);

      try {
        await service.getProductDetailForUser(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        expect(typedError.getError().code).toBe(HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR);
        expect(typedError.getError().message).toBe('common.errors.internalServerError');
      }

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'DeleteProduct',
        'Category grouping failed',
        expect.stringMatching(/.+/),
      );
    });

    it('should handle non-Error exceptions correctly', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-STRING-ERROR' };
      const stringError = 'String error message';

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockRejectedValue(stringError);

      await expect(service.getProductDetailForUser(dto)).rejects.toThrow(TypedRpcException);

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'DeleteProduct',
        'String error message',
        undefined,
      );
    });

    it('should re-throw TypedRpcException without wrapping', async () => {
      const dto: skuIdProductDto = { skuId: 'TEST-SKU-TYPED-ERROR' };
      const typedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'Custom typed error',
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockRejectedValue(typedError);

      await expect(service.getProductDetailForUser(dto)).rejects.toThrow(typedError);

      expect(mockLoggerService.error).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in skuId', async () => {
      const specialSkuIds = [
        'SKU-123!@#',
        'SKU_WITH_UNDERSCORES',
        'SKU.WITH.DOTS',
        'SKU WITH SPACES',
      ];

      for (const skuId of specialSkuIds) {
        const dto: skuIdProductDto = { skuId };
        const mockProduct = createMockProduct(1, skuId);

        mockPlainToInstance.mockReturnValue(dto);
        mockValidateOrReject.mockResolvedValue(undefined);
        mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

        const result = await service.getProductDetailForUser(dto);

        expect(result?.skuId).toBe(skuId);
      }
    });

    it('should handle very large product data', async () => {
      const dto: skuIdProductDto = { skuId: 'LARGE-PRODUCT-SKU' };
      const largeImages = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        url: `https://example.com/image${i + 1}.jpg`,
      }));
      const largeVariants = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        price: new Decimal(99.99 + i),
        startDate: new Date(),
        endDate: null,
        size: {
          id: i + 1,
          nameSize: `Size ${i + 1}`,
          description: `Description ${i + 1}`,
        },
      }));
      const largeReviews = Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        rating: (i % 5) + 1,
        comment: `Review comment ${i + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: i + 1,
        productId: 1,
      }));

      const mockProduct = createMockProduct(1, 'LARGE-PRODUCT-SKU', {
        images: largeImages,
        variants: largeVariants,
        reviews: largeReviews,
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.images).toHaveLength(100);
      expect(result?.variants).toHaveLength(50);
      expect(result?.reviews).toHaveLength(200);
    });

    it('should handle concurrent requests for same product', async () => {
      const dto: skuIdProductDto = { skuId: 'CONCURRENT-SKU' };
      const mockProduct = createMockProduct(1, 'CONCURRENT-SKU');

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const promises = Array.from({ length: 10 }, () => service.getProductDetailForUser(dto));
      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result?.skuId).toBe('CONCURRENT-SKU');
      });

      expect(mockPrismaService.client.product.findUnique).toHaveBeenCalledTimes(10);
    });

    it('should verify correct method signature and return type', async () => {
      const dto: skuIdProductDto = { skuId: 'TYPE-CHECK-SKU' };
      const mockProduct = createMockProduct(1, 'TYPE-CHECK-SKU');

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      // Type assertions to verify return type structure
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(typeof result!.id).toBe('number');
      expect(typeof result!.name).toBe('string');
      expect(typeof result!.skuId).toBe('string');
      expect(typeof result!.description).toBe('string');
      expect(result!.basePrice).toBeInstanceOf(Decimal);
      expect(typeof result!.status).toBe('string');
      expect(typeof result!.quantity).toBe('number');
      expect(Array.isArray(result!.images)).toBe(true);
      expect(Array.isArray(result!.categories)).toBe(true);
      expect(Array.isArray(result!.variants)).toBe(true);
      expect(Array.isArray(result!.reviews)).toBe(true);

      // Verify images structure
      if (result?.images && result.images.length > 0) {
        const image = result.images[0];
        expect(typeof image.id).toBe('number');
        expect(typeof image.url).toBe('string');
      }

      // Verify categories structure
      if (result?.categories && result.categories.length > 0) {
        const category = result.categories[0];
        expect(category.rootCategory === null || typeof category.rootCategory === 'object').toBe(
          true,
        );
        expect(Array.isArray(category.childCategories)).toBe(true);
      }

      // Verify variants structure
      if (result?.variants && result.variants.length > 0) {
        const variant = result.variants[0];
        expect(typeof variant.id).toBe('number');
        expect(variant.startDate).toBeInstanceOf(Date);
        expect(variant.endDate === null || typeof variant.endDate === 'string').toBe(true);
        expect(variant.price).toBeInstanceOf(Decimal);
        expect(typeof variant.size.id).toBe('string');
        expect(typeof variant.size.nameSize).toBe('string');
        expect(typeof variant.size.description).toBe('string');
      }

      // Verify reviews structure
      if (result?.reviews && result.reviews.length > 0) {
        const review = result.reviews[0];
        expect(typeof review.id).toBe('number');
        expect(typeof review.rating).toBe('number');
        expect(typeof review.comment).toBe('string');
        expect(review.createdAt).toBeInstanceOf(Date);
        expect(typeof review.userId).toBe('number');
        expect(typeof review.productId).toBe('number');
        // updatedAt can be Date or null
        expect(review.updatedAt === null || review.updatedAt instanceof Date).toBe(true);
      }
    });
  });

  describe('data transformation', () => {
    it('should correctly transform variant dates to strings', async () => {
      const dto: skuIdProductDto = { skuId: 'DATE-TRANSFORM-SKU' };
      const startDate = new Date('2024-01-01T10:00:00Z');
      const endDate = new Date('2024-12-31T23:59:59Z');

      const mockProduct = createMockProduct(1, 'DATE-TRANSFORM-SKU', {
        variants: [
          {
            id: 1,
            price: new Decimal(99.99),
            startDate,
            endDate,
            size: {
              id: 1,
              nameSize: 'Medium',
              description: 'Medium size',
            },
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.variants[0].startDate).toEqual(startDate);
      expect(result?.variants[0].endDate).toEqual(endDate);
    });

    it('should correctly transform size id to string', async () => {
      const dto: skuIdProductDto = { skuId: 'SIZE-ID-TRANSFORM-SKU' };
      const mockProduct = createMockProduct(1, 'SIZE-ID-TRANSFORM-SKU', {
        variants: [
          {
            id: 1,
            price: new Decimal(99.99),
            startDate: new Date(),
            endDate: null,
            size: {
              id: 12345,
              nameSize: 'XL',
              description: 'Extra Large',
            },
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.variants[0].size.id).toBe('12345');
      expect(typeof result?.variants[0].size.id).toBe('string');
    });

    it('should handle null values correctly in all transformations', async () => {
      const dto: skuIdProductDto = { skuId: 'NULL-TRANSFORM-SKU' };
      const mockProduct = createMockProduct(1, 'NULL-TRANSFORM-SKU', {
        description: null,
        images: [{ id: 1, url: null }],
        variants: [
          {
            id: 1,
            price: new Decimal(99.99),
            startDate: new Date(),
            endDate: null,
            size: {
              id: 1,
              nameSize: 'Small',
              description: null,
            },
          },
        ],
        reviews: [
          {
            id: 1,
            rating: 5,
            comment: null,
            createdAt: new Date(),
            updatedAt: null,
            userId: 1,
            productId: 1,
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.description).toBe('');
      expect(result?.images[0].url).toBe('');
      expect(result?.variants[0].endDate).toBeNull();
      expect(result?.variants[0].size.description).toBe('');
      expect(result?.reviews[0].comment).toBe('');
      expect(result?.reviews[0].updatedAt).toBeNull();
    });

    it('should handle null groupedCategories correctly', async () => {
      const dto: skuIdProductDto = { skuId: 'NULL-CATEGORIES-SKU' };
      const mockProduct = createMockProduct(1, 'NULL-CATEGORIES-SKU');

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      // Mock groupedCategories to return null
      jest
        .spyOn(
          service as unknown as {
            groupedCategories: (product: MockProductWithIncludes) => Promise<unknown>;
          },
          'groupedCategories',
        )
        .mockResolvedValue(null);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.categories).toEqual([]);
    });

    it('should handle null startDate in variants correctly', async () => {
      const dto: skuIdProductDto = { skuId: 'NULL-STARTDATE-SKU' };
      const mockProduct = createMockProduct(1, 'NULL-STARTDATE-SKU', {
        variants: [
          {
            id: 1,
            price: new Decimal(99.99),
            startDate: null as unknown as Date,
            endDate: new Date(),
            size: {
              id: 1,
              nameSize: 'Medium',
              description: 'Medium size',
            },
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.variants[0].startDate).toBeNull();
    });

    it('should handle null nameSize in variant size correctly', async () => {
      const dto: skuIdProductDto = { skuId: 'NULL-NAMESIZE-SKU' };
      const mockProduct = createMockProduct(1, 'NULL-NAMESIZE-SKU', {
        variants: [
          {
            id: 1,
            price: new Decimal(99.99),
            startDate: new Date(),
            endDate: new Date(),
            size: {
              id: 1,
              nameSize: null as unknown as string,
              description: 'Size description',
            },
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.variants[0].size.nameSize).toBe('');
    });

    it('should handle null quantity correctly (line 1013)', async () => {
      const dto: skuIdProductDto = { skuId: 'NULL-QUANTITY-SKU' };
      const mockProduct = createMockProduct(1, 'NULL-QUANTITY-SKU', {
        quantity: null as unknown as number,
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.quantity).toBe(0);
    });

    it('should handle null variant price correctly (line 1021)', async () => {
      const dto: skuIdProductDto = { skuId: 'NULL-VARIANT-PRICE-SKU' };
      const mockProduct = createMockProduct(1, 'NULL-VARIANT-PRICE-SKU', {
        variants: [
          {
            id: 1,
            price: null as unknown as Decimal,
            startDate: new Date(),
            endDate: new Date(),
            size: {
              id: 1,
              nameSize: 'Large',
              description: 'Large size',
            },
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.variants[0].price).toBe(0);
    });

    it('should handle null review rating correctly (line 1032)', async () => {
      const dto: skuIdProductDto = { skuId: 'NULL-REVIEW-RATING-SKU' };
      const mockProduct = createMockProduct(1, 'NULL-REVIEW-RATING-SKU', {
        reviews: [
          {
            id: 1,
            rating: null as unknown as number,
            comment: 'Great product!',
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: 1,
            productId: 1,
          },
        ],
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.reviews[0].rating).toBe(0);
    });

    it('should handle null basePrice correctly (line 1011)', async () => {
      const dto: skuIdProductDto = { skuId: 'NULL-BASEPRICE-SKU' };
      const mockProduct = createMockProduct(1, 'NULL-BASEPRICE-SKU', {
        basePrice: null as unknown as Decimal,
      });

      mockPlainToInstance.mockReturnValue(dto);
      mockValidateOrReject.mockResolvedValue(undefined);
      mockPrismaService.client.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getProductDetailForUser(dto);

      expect(result?.basePrice).toBe(0);
    });
  });
});
