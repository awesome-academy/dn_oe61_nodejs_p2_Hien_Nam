import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PaginationDto } from '@app/common/dto/pagination.dto';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { Decimal } from '@prisma/client/runtime/library';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { CustomLogger } from '@app/common/logger/custom-logger.service';

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

describe('ProductService - getAll', () => {
  let service: ProductService;
  let moduleRef: TestingModule;
  let mockPaginationService: jest.Mocked<Pick<PaginationService, 'queryWithPagination'>>;

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    skuId: 'TEST-001',
    description: 'Test description',
    status: StatusProduct.IN_STOCK,
    basePrice: new Decimal('99.99'),
    quantity: 10,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockPaginationResult: PaginationResult<typeof mockProduct> = {
    items: [mockProduct],
    paginations: {
      currentPage: 1,
      totalPages: 1,
      pageSize: 10,
      totalItems: 1,
      itemsOnPage: 1,
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      client: {
        product: {},
      },
    };

    const mockLogger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    mockPaginationService = {
      queryWithPagination: jest.fn(),
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
          useValue: mockLogger,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    moduleRef = module;

    // Reset mocks
    jest.clearAllMocks();
    mockValidateOrReject.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('getAll', () => {
    const validPayload: PaginationDto = {
      page: 1,
      pageSize: 10,
    };

    it('should return products successfully with valid pagination', async () => {
      // Arrange
      const mockDto = new PaginationDto();
      mockDto.page = 1;
      mockDto.pageSize = 10;

      mockPlainToInstance.mockReturnValue(mockDto);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      // Act
      const result = await service.getAll(validPayload);

      // Assert
      expect(mockPlainToInstance).toHaveBeenCalledWith(PaginationDto, validPayload);
      expect(mockValidateOrReject).toHaveBeenCalledWith(mockDto);
      expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({}), // prismaService.client.product
        { page: 1, pageSize: 10 },
        { orderBy: { createdAt: 'asc' }, where: { deletedAt: null } },
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: mockProduct.id,
        name: mockProduct.name,
        skuId: mockProduct.skuId,
        description: mockProduct.description,
        status: mockProduct.status,
        basePrice: mockProduct.basePrice,
        quantity: mockProduct.quantity,
      });
      expect(result.paginations).toEqual(mockPaginationResult.paginations);
    });

    it('should throw error when no products found', async () => {
      // Arrange
      const emptyResult: PaginationResult<typeof mockProduct> = {
        items: [],
        paginations: {
          currentPage: 1,
          totalPages: 1,
          pageSize: 10,
          totalItems: 0,
          itemsOnPage: 0,
        },
      };

      const mockDto = new PaginationDto();
      mockPlainToInstance.mockReturnValue(mockDto);
      mockPaginationService.queryWithPagination.mockResolvedValue(emptyResult);

      // Act & Assert
      await expect(service.getAll(validPayload)).rejects.toThrow(TypedRpcException);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidDto = new PaginationDto();
      const validationError = new Error('Validation failed');

      mockPlainToInstance.mockReturnValue(invalidDto);
      mockValidateOrReject.mockRejectedValue(validationError);

      // Act & Assert
      await expect(service.getAll(validPayload)).rejects.toThrow('Validation failed');
      expect(mockValidateOrReject).toHaveBeenCalledWith(invalidDto);
    });

    it('should handle multiple products correctly', async () => {
      // Arrange
      const secondProduct = {
        id: 2,
        name: 'Second Product',
        skuId: 'TEST-002',
        description: 'Second description',
        status: StatusProduct.SOLD_OUT,
        basePrice: new Decimal('149.99'),
        quantity: 5,
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      const multipleProductsResult: PaginationResult<typeof mockProduct> = {
        items: [mockProduct, secondProduct],
        paginations: {
          currentPage: 1,
          totalPages: 1,
          pageSize: 10,
          totalItems: 2,
          itemsOnPage: 2,
        },
      };

      const mockDto = new PaginationDto();
      mockPlainToInstance.mockReturnValue(mockDto);
      mockPaginationService.queryWithPagination.mockResolvedValue(multipleProductsResult);

      // Act
      const result = await service.getAll(validPayload);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(1);
      expect(result.items[1].id).toBe(2);
      expect(result.items[0]).toBeInstanceOf(Object);
      expect(result.items[1]).toBeInstanceOf(Object);
    });

    it('should handle different page sizes', async () => {
      // Arrange
      const customPageSize = { page: 1, pageSize: 5 };
      const mockDto = new PaginationDto();
      mockDto.page = 1;
      mockDto.pageSize = 5;

      mockPlainToInstance.mockReturnValue(mockDto);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      // Act
      await service.getAll(customPageSize);

      // Assert
      expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({}),
        { page: 1, pageSize: 5 },
        { orderBy: { createdAt: 'asc' }, where: { deletedAt: null } },
      );
    });

    it('should handle different page numbers', async () => {
      // Arrange
      const customPage = { page: 3, pageSize: 10 };
      const mockDto = new PaginationDto();
      mockDto.page = 3;
      mockDto.pageSize = 10;

      mockPlainToInstance.mockReturnValue(mockDto);
      mockPaginationService.queryWithPagination.mockResolvedValue(mockPaginationResult);

      // Act
      await service.getAll(customPage);

      // Assert
      expect(mockPaginationService.queryWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({}),
        { page: 3, pageSize: 10 },
        { orderBy: { createdAt: 'asc' }, where: { deletedAt: null } },
      );
    });

    it('should properly map product fields to ProductResponse', async () => {
      // Arrange
      const productWithAllFields = {
        id: 1,
        name: 'Complete Product',
        skuId: 'COMPLETE-001',
        description: 'Complete description',
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal('299.99'),
        quantity: 15,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        // Additional fields that should not be in response
        someInternalField: 'should not appear',
      };

      const resultWithCompleteProduct: PaginationResult<typeof productWithAllFields> = {
        items: [productWithAllFields],
        paginations: mockPaginationResult.paginations,
      };

      const mockDto = new PaginationDto();
      mockPlainToInstance.mockReturnValue(mockDto);
      mockPaginationService.queryWithPagination.mockResolvedValue(resultWithCompleteProduct);

      // Act
      const result = await service.getAll(validPayload);

      // Assert
      const mappedProduct = result.items[0];
      expect(mappedProduct).toEqual({
        id: 1,
        name: 'Complete Product',
        skuId: 'COMPLETE-001',
        description: 'Complete description',
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal('299.99'),
        quantity: 15,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });
      expect(mappedProduct).not.toHaveProperty('someInternalField');
    });

    it('should handle pagination service errors', async () => {
      // Arrange
      const paginationError = new Error('Pagination service error');
      const mockDto = new PaginationDto();

      mockPlainToInstance.mockReturnValue(mockDto);
      mockPaginationService.queryWithPagination.mockRejectedValue(paginationError);

      // Act & Assert
      await expect(service.getAll(validPayload)).rejects.toThrow('Pagination service error');
    });

    it('should handle undefined optional fields correctly', async () => {
      // Arrange
      const productWithUndefinedFields = {
        id: 1,
        name: 'Minimal Product',
        skuId: 'MIN-001',
        description: undefined,
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal('99.99'),
        quantity: 10,
        createdAt: undefined,
        updatedAt: undefined,
      };

      const resultWithMinimalProduct: PaginationResult<typeof productWithUndefinedFields> = {
        items: [productWithUndefinedFields],
        paginations: mockPaginationResult.paginations,
      };

      const mockDto = new PaginationDto();
      mockPlainToInstance.mockReturnValue(mockDto);
      mockPaginationService.queryWithPagination.mockResolvedValue(resultWithMinimalProduct);

      // Act
      const result = await service.getAll(validPayload);

      // Assert
      const mappedProduct = result.items[0];
      expect(mappedProduct.description).toBeUndefined();
      expect(mappedProduct.createdAt).toBeUndefined();
      expect(mappedProduct.updatedAt).toBeUndefined();
      expect(mappedProduct.id).toBe(1);
      expect(mappedProduct.name).toBe('Minimal Product');
    });
  });
});
