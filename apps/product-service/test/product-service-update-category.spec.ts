import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ProductService } from '../src/product-service.service';
import { PrismaService } from '@app/prisma/prisma.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { GraphQLUpdateCateroryInput } from '@app/common/types/graphql/arg-type/update-category.typ';
import { CategoryType } from '@app/common/types/graphql/caterories.type';
import { CacheService } from '@app/common/cache/cache.service';
import { NOTIFICATION_SERVICE } from '@app/common';
import { ProductProducer } from '../src/product.producer';

// Mock interfaces
interface MockCategory {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MockPrismaClient {
  category: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
}
const mockPaginationService = {
  paginate: jest.fn(),
};
describe('ProductService - updateCategory', () => {
  let service: ProductService;
  let prismaService: { client: MockPrismaClient };

  const mockDate = new Date('2024-01-01T00:00:00.000Z');
  const mockCategory: MockCategory = {
    id: 1,
    name: 'Test Category',
    parentId: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockParentCategory: MockCategory = {
    id: 2,
    name: 'Parent Category',
    parentId: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  };
  const mockI18nService = {
    translate: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };
  const mockNotificationClient = {
    emit: jest.fn(),
  };
  const mockProductProducer = {
    addJobRetryPayment: jest.fn(),
  };
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  } as unknown as CacheService;
  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  beforeEach(async () => {
    const mockPrismaClient: MockPrismaClient = {
      category: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: { client: mockPrismaClient },
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
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn(),
            translate: jest.fn(),
          },
        },
        {
          provide: ProductProducer,
          useValue: {
            sendMessage: jest.fn(),
            emit: jest.fn(),
          },
        },
        {
          provide: NOTIFICATION_SERVICE,
          useValue: {
            send: jest.fn(),
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('Successful Update Scenarios', () => {
    it('should update category name only', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Updated Category Name',
      };

      const updatedCategory: MockCategory = {
        ...mockCategory,
        name: 'Updated Category Name',
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockResolvedValue(updatedCategory);

      const result: CategoryType = await service.updateCategory(input);

      expect(prismaService.client.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.client.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Category Name' },
      });
      expect(result).toEqual({
        id: 1,
        name: 'Updated Category Name',
        parentId: '',
        createdAt: mockDate,
        updatedAt: updatedCategory.updatedAt,
      });
    });

    it('should update parentId only', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 2,
      };

      const updatedCategory: MockCategory = {
        ...mockCategory,
        parentId: 2,
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      prismaService.client.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockParentCategory);
      prismaService.client.category.update.mockResolvedValue(updatedCategory);

      const result: CategoryType = await service.updateCategory(input);

      expect(prismaService.client.category.findUnique).toHaveBeenCalledTimes(2);
      expect(prismaService.client.category.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: 1 },
      });
      expect(prismaService.client.category.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: 2 },
      });
      expect(prismaService.client.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { parentId: 2 },
      });
      expect(result.parentId).toBe(2);
    });

    it('should update both name and parentId', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Complete Update',
        parentId: 2,
      };

      const updatedCategory: MockCategory = {
        ...mockCategory,
        name: 'Complete Update',
        parentId: 2,
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      prismaService.client.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockParentCategory);
      prismaService.client.category.update.mockResolvedValue(updatedCategory);

      const result: CategoryType = await service.updateCategory(input);

      expect(prismaService.client.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Complete Update',
          parentId: 2,
        },
      });
      expect(result).toEqual({
        id: 1,
        name: 'Complete Update',
        parentId: 2,
        createdAt: mockDate,
        updatedAt: updatedCategory.updatedAt,
      });
    });

    it('should handle null parentId (root category)', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Root Category',
        parentId: undefined,
      };

      const updatedCategory: MockCategory = {
        ...mockCategory,
        name: 'Root Category',
        parentId: null,
      };

      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockResolvedValue(updatedCategory);

      const result: CategoryType = await service.updateCategory(input);

      expect(result.parentId).toBe('');
      expect(prismaService.client.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Root Category',
          parentId: undefined,
        },
      });
    });

    it('should handle large ID values', async () => {
      const largeId = 2147483647;
      const input: GraphQLUpdateCateroryInput = {
        id: largeId,
        name: 'Large ID Category',
      };

      const largeCategoryMock: MockCategory = {
        ...mockCategory,
        id: largeId,
        name: 'Large ID Category',
      };

      prismaService.client.category.findUnique.mockResolvedValue(largeCategoryMock);
      prismaService.client.category.update.mockResolvedValue(largeCategoryMock);

      const result: CategoryType = await service.updateCategory(input);

      expect(result.id).toBe(largeId);
      expect(prismaService.client.category.findUnique).toHaveBeenCalledWith({
        where: { id: largeId },
      });
    });
  });

  describe('Validation Error Scenarios', () => {
    it('should throw error when parentId equals id (self-parent)', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 1,
      };

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.category.parentCannotBeSelf',
      });

      await expect(service.updateCategory(input)).rejects.toThrow(expectedError);

      expect(prismaService.client.category.findUnique).not.toHaveBeenCalled();
    });

    it('should throw error when category not found', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 999,
        name: 'Non-existent Category',
      };

      prismaService.client.category.findUnique.mockResolvedValue(null);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.category.categoryNotFound',
      });

      await expect(service.updateCategory(input)).rejects.toThrow(expectedError);

      expect(prismaService.client.category.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(prismaService.client.category.update).not.toHaveBeenCalled();
    });

    it('should throw error when parent category not found', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 999,
      };

      prismaService.client.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(null);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.category.parentNotFound',
      });

      await expect(service.updateCategory(input)).rejects.toThrow(expectedError);

      expect(prismaService.client.category.findUnique).toHaveBeenCalledTimes(2);
      expect(prismaService.client.category.update).not.toHaveBeenCalled();
    });

    it('should handle zero parentId validation', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 0,
      };

      prismaService.client.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(null);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.category.parentNotFound',
      });

      await expect(service.updateCategory(input)).rejects.toThrow(expectedError);
    });
  });

  describe('Database Error Scenarios', () => {
    it('should handle Prisma P2002 constraint violation', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Duplicate Name',
      };

      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint violation',
      };

      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockRejectedValue(prismaError);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.category.parentCannotBeSelf',
      });

      await expect(service.updateCategory(input)).rejects.toThrow(expectedError);
    });

    it('should handle database connection error', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };

      const dbError = new Error('Database connection failed');
      prismaService.client.category.findUnique.mockRejectedValue(dbError);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });

      await expect(service.updateCategory(input)).rejects.toThrow(expectedError);
    });

    it('should handle update operation failure', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Updated Name',
      };

      const updateError = new Error('Update operation failed');
      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockRejectedValue(updateError);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });

      await expect(service.updateCategory(input)).rejects.toThrow(expectedError);
    });

    it('should propagate TypedRpcException without modification', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };

      const customError = new TypedRpcException({
        code: HTTP_ERROR_CODE.FORBIDDEN,
        message: 'custom.error.message',
      });

      prismaService.client.category.findUnique.mockRejectedValue(customError);

      await expect(service.updateCategory(input)).rejects.toThrow(customError);
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle special characters in name', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Café & Restaurant 🍕',
      };

      const updatedCategory: MockCategory = {
        ...mockCategory,
        name: 'Café & Restaurant 🍕',
      };

      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockResolvedValue(updatedCategory);

      const result: CategoryType = await service.updateCategory(input);

      expect(result.name).toBe('Café & Restaurant 🍕');
    });

    it('should handle very long category name', async () => {
      const longName = 'A'.repeat(255);
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: longName,
      };

      const updatedCategory: MockCategory = {
        ...mockCategory,
        name: longName,
      };

      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockResolvedValue(updatedCategory);

      const result: CategoryType = await service.updateCategory(input);

      expect(result.name).toBe(longName);
      expect(result.name.length).toBe(255);
    });

    it('should handle null values in database response', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };

      const categoryWithNulls: MockCategory = {
        id: 1,
        name: 'Test Category',
        parentId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      prismaService.client.category.findUnique.mockResolvedValue(categoryWithNulls);
      prismaService.client.category.update.mockResolvedValue(categoryWithNulls);

      const result: CategoryType = await service.updateCategory(input);

      expect(result.parentId).toBe('');
      expect(result.createdAt).toBe(mockDate);
      expect(result.updatedAt).toBe(mockDate);
    });

    it('should handle undefined name field (no name update)', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 2,
      };

      const freshMockCategory: MockCategory = {
        id: 1,
        name: 'Test Category',
        parentId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const updatedCategoryWithParent: MockCategory = {
        ...freshMockCategory,
        parentId: 2,
      };

      prismaService.client.category.findUnique
        .mockResolvedValueOnce(freshMockCategory)
        .mockResolvedValueOnce(mockParentCategory);
      prismaService.client.category.update.mockResolvedValue(updatedCategoryWithParent);

      const result: CategoryType = await service.updateCategory(input);

      expect(prismaService.client.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { parentId: 2 },
      });
      expect(result.name).toBe('Test Category');
    });

    it('should handle concurrent update scenarios', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Concurrent Update',
      };

      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockResolvedValue({
        ...mockCategory,
        name: 'Concurrent Update',
      });

      const promises = Array(3)
        .fill(null)
        .map(() => service.updateCategory(input));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.name).toBe('Concurrent Update');
      });
    });
  });

  describe('Method Signature and Return Type Verification', () => {
    it('should return Promise<CategoryType>', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Type Test',
      };

      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockResolvedValue(mockCategory);

      const result = service.updateCategory(input);

      expect(result).toBeInstanceOf(Promise);

      const resolvedResult = await result;
      expect(typeof resolvedResult.id).toBe('number');
      expect(typeof resolvedResult.name).toBe('string');
      expect(['number', 'string'].includes(typeof resolvedResult.parentId)).toBe(true);
      expect(resolvedResult.createdAt instanceof Date || resolvedResult.createdAt === null).toBe(
        true,
      );
      expect(resolvedResult.updatedAt instanceof Date || resolvedResult.updatedAt === null).toBe(
        true,
      );
    });

    it('should handle method call with minimal required data', async () => {
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
      };

      prismaService.client.category.findUnique.mockResolvedValue(mockCategory);
      prismaService.client.category.update.mockResolvedValue(mockCategory);

      const result: CategoryType = await service.updateCategory(input);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(prismaService.client.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {},
      });
    });
  });
});
