import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../../src/product/admin/product.service';
import { I18nService } from 'nestjs-i18n';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { CacheService } from '@app/common/cache/cache.service';
import { UpstashCacheService } from '@app/common/cache/upstash-cache/upstash-cache.service';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { Decimal } from '@prisma/client/runtime/library';
import { PaginationResult } from '@app/common/interfaces/pagination';

// Mock the callMicroservice helper
jest.mock('@app/common/helpers/microservices', () => ({
  callMicroservice: jest.fn(),
}));

// Mock the buildBaseResponse utility
jest.mock('@app/common/utils/data.util', () => ({
  buildBaseResponse: jest.fn(),
}));

import { callMicroservice } from '@app/common/helpers/microservices';
import { buildBaseResponse } from '@app/common/utils/data.util';

const mockCallMicroservice = callMicroservice as jest.MockedFunction<typeof callMicroservice>;
const mockBuildBaseResponse = buildBaseResponse as jest.MockedFunction<typeof buildBaseResponse>;

describe('ProductService - getAll', () => {
  let service: ProductService;
  let moduleRef: TestingModule;

  const mockProductClient = {
    send: jest.fn(),
    emit: jest.fn(),
    close: jest.fn(),
    connect: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
    t: jest.fn(),
    getSupportedLanguages: jest.fn(),
    getTranslations: jest.fn(),
    refresh: jest.fn(),
    hbsHelper: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
    getImageUrl: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteByPattern: jest.fn().mockResolvedValue(0),
    generateKey: jest.fn(),
  };

  const mockUpstashCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteByPattern: jest.fn().mockResolvedValue(0),
    generateKey: jest.fn(),
  };

  const mockProductResponse: ProductResponse = {
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

  const mockPaginationResult: PaginationResult<ProductResponse> = {
    items: [mockProductResponse],
    paginations: {
      currentPage: 1,
      totalPages: 1,
      pageSize: 10,
      totalItems: 1,
      itemsOnPage: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClient,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: UpstashCacheService,
          useValue: mockUpstashCacheService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    moduleRef = module;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('getAll', () => {
    const validQuery = { page: 1, pageSize: 10 };

    it('should return products successfully with valid query', async () => {
      // Arrange
      const expectedResponse: BaseResponse<ProductResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: [mockProductResponse],
      };

      mockCallMicroservice.mockResolvedValue(mockPaginationResult);
      mockBuildBaseResponse.mockReturnValue(expectedResponse);

      // Act
      const result = await service.getAll(validQuery);

      // Assert
      expect(mockProductClient.send).toHaveBeenCalledWith(ProductPattern.GET_ALL, validQuery);
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.GET_ALL, validQuery),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, mockPaginationResult);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle empty result from microservice', async () => {
      // Arrange
      const emptyPaginationResult: PaginationResult<ProductResponse> = {
        items: [],
        paginations: {
          currentPage: 1,
          totalPages: 1,
          pageSize: 10,
          totalItems: 0,
          itemsOnPage: 0,
        },
      };

      const expectedResponse: BaseResponse<ProductResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: [],
      };

      mockCallMicroservice.mockResolvedValue(emptyPaginationResult);
      mockBuildBaseResponse.mockReturnValue(expectedResponse);

      // Act
      const result = await service.getAll(validQuery);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, emptyPaginationResult);
    });

    it('should handle null result from microservice', async () => {
      // Arrange
      mockCallMicroservice.mockResolvedValue(null);
      mockI18nService.translate.mockReturnValue('Failed to retrieve product list');

      const expectedResponse: BaseResponse<ProductResponse[]> = {
        statusKey: StatusKey.FAILED,
        data: undefined,
      };
      mockBuildBaseResponse.mockReturnValue(expectedResponse);

      // Act
      const result = await service.getAll(validQuery);

      // Assert
      expect(mockI18nService.translate).toHaveBeenCalledWith('common.product.action.getAll.failed');
      expect(mockBuildBaseResponse).toHaveBeenCalledWith(StatusKey.SUCCESS, null);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle microservice timeout error', async () => {
      // Arrange
      const timeoutError = new Error('Timeout error');
      mockCallMicroservice.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.getAll(validQuery)).rejects.toThrow('Timeout error');
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        mockProductClient.send(ProductPattern.GET_ALL, validQuery),
        PRODUCT_SERVICE,
        mockLoggerService,
        {
          timeoutMs: TIMEOUT_MS_DEFAULT,
          retries: RETRIES_DEFAULT,
        },
      );
    });

    it('should handle microservice connection error', async () => {
      // Arrange
      const connectionError = new Error('Connection refused');
      mockCallMicroservice.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(service.getAll(validQuery)).rejects.toThrow('Connection refused');
    });

    it('should handle large page numbers', async () => {
      // Arrange
      const largePageQuery = { page: 999999, pageSize: 10 };
      mockCallMicroservice.mockResolvedValue(mockPaginationResult);
      mockBuildBaseResponse.mockReturnValue({
        statusKey: StatusKey.SUCCESS,
        data: [mockProductResponse],
      });

      // Act
      await service.getAll(largePageQuery);

      // Assert
      expect(mockProductClient.send).toHaveBeenCalledWith(ProductPattern.GET_ALL, largePageQuery);
    });

    it('should handle large limit numbers', async () => {
      // Arrange
      const largeLimitQuery = { page: 1, pageSize: 999999 };
      mockCallMicroservice.mockResolvedValue(mockPaginationResult);
      mockBuildBaseResponse.mockReturnValue({
        statusKey: StatusKey.SUCCESS,
        data: [mockProductResponse],
      });

      // Act
      await service.getAll(largeLimitQuery);

      // Assert
      expect(mockProductClient.send).toHaveBeenCalledWith(ProductPattern.GET_ALL, largeLimitQuery);
    });

    it('should maintain correct types throughout the flow', async () => {
      // Arrange
      const multipleProducts: ProductResponse[] = [
        mockProductResponse,
        {
          id: 2,
          name: 'Product 2',
          skuId: 'TEST-002',
          description: 'Description 2',
          status: StatusProduct.SOLD_OUT,
          basePrice: new Decimal('199.99'),
          quantity: 20,
          createdAt: new Date('2024-01-02T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        },
      ];

      const paginationResult: PaginationResult<ProductResponse> = {
        items: multipleProducts,
        paginations: {
          currentPage: 1,
          totalPages: 1,
          pageSize: 10,
          totalItems: 2,
          itemsOnPage: 2,
        },
      };

      const expectedResponse: BaseResponse<ProductResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: multipleProducts,
      };

      mockCallMicroservice.mockResolvedValue(paginationResult);
      mockBuildBaseResponse.mockReturnValue(expectedResponse);

      // Act
      const result = await service.getAll(validQuery);

      // Assert
      expect(result.data).toEqual(multipleProducts);
      expect(result.data![0]).toHaveProperty('id');
      expect(result.data![0]).toHaveProperty('name');
      expect(result.data![0]).toHaveProperty('skuId');
      expect(result.data![0]).toHaveProperty('status');
      expect(result.data![0]).toHaveProperty('basePrice');
      expect(typeof result.data![0].id).toBe('number');
      expect(typeof result.data![0].name).toBe('string');
      expect(typeof result.data![0].skuId).toBe('string');
    });
  });
});
