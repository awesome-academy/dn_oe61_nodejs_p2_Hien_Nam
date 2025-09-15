import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '@app/prisma';
import { ProductService } from '../src/product-service.service';
import { GraphQLCateroryInput } from '@app/common/types/graphql/arg-type/create-category.type';
import { CategoryType } from '@app/common/types/graphql/caterories.type';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { ProductProducer } from '../src/product.producer';
import { NOTIFICATION_SERVICE } from '@app/common';

// Mock class-transformer
jest.mock('class-transformer', () => ({
  plainToInstance: jest.fn(),
  Type: jest.fn(() => () => {}),
  Transform: jest.fn(() => () => {}),
}));

describe('ProductService - createCategory', () => {
  let service: ProductService;
  let mockPrismaService: {
    client: {
      category: {
        findUnique: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
      };
    };
  };
  let mockLogger: jest.Mocked<CustomLogger>;
  let mockPaginationService: jest.Mocked<PaginationService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockI18nService: jest.Mocked<I18nService>;
  let mockProductProducer: jest.Mocked<ProductProducer>;
  let mockNotificationClient: jest.Mocked<ClientProxy>;
  let plainToInstanceMock: jest.MockedFunction<typeof plainToInstance>;

  const mockDate = new Date('2024-01-01T00:00:00Z');

  const mockCategoryData = {
    id: 1,
    name: 'Test Category',
    parentId: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const expectedCategoryResponse: CategoryType = {
    id: 1,
    name: 'Test Category',
    parentId: '',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async (): Promise<void> => {
    const mockPrisma = {
      client: {
        category: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
        },
      },
    };

    const mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const mockPagination = {
      paginate: jest.fn(),
      getPaginationMeta: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn(),
    };

    const mockI18n = {
      t: jest.fn(),
      translate: jest.fn(),
    };

    const mockProducer = {
      sendMessage: jest.fn(),
      emit: jest.fn(),
    };

    const mockNotification = {
      send: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
        {
          provide: PaginationService,
          useValue: mockPagination,
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
        {
          provide: I18nService,
          useValue: mockI18n,
        },
        {
          provide: ProductProducer,
          useValue: mockProducer,
        },
        {
          provide: NOTIFICATION_SERVICE,
          useValue: mockNotification,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    mockPrismaService = module.get(PrismaService);
    mockLogger = module.get(CustomLogger);
    mockPaginationService = module.get(PaginationService);
    mockConfigService = module.get(ConfigService);
    mockI18nService = module.get(I18nService);
    mockProductProducer = module.get(ProductProducer);
    mockNotificationClient = module.get(NOTIFICATION_SERVICE);

    // Suppress unused variable warnings
    void mockLogger;
    void mockPaginationService;
    void mockConfigService;
    void mockI18nService;
    void mockProductProducer;
    void mockNotificationClient;
    plainToInstanceMock = plainToInstance as jest.MockedFunction<typeof plainToInstance>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Successful Scenarios', () => {
    it('should create root category successfully without parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Root Category',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Root Category',
        parentId: undefined,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(mockCategoryData);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(expectedCategoryResponse);
      expect(plainToInstanceMock).toHaveBeenCalledWith(GraphQLCateroryInput, input);
      expect(mockPrismaService.client.category.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Root Category',
          parentId: null,
        },
      });
      expect(mockPrismaService.client.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Root Category',
          parentId: null,
        },
      });
    });

    it('should create child category successfully with valid parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Child Category',
        parentId: 1,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Child Category',
        parentId: 1,
      };
      const parentCategory = {
        id: 1,
        name: 'Parent Category',
        parentId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const childCategoryData = {
        ...mockCategoryData,
        id: 2,
        name: 'Child Category',
        parentId: 1,
      };
      const expectedChildResponse: CategoryType = {
        id: 2,
        name: 'Child Category',
        parentId: 1,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findUnique.mockResolvedValue(parentCategory);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(childCategoryData);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(expectedChildResponse);
      expect(mockPrismaService.client.category.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaService.client.category.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Child Category',
          parentId: 1,
        },
      });
      expect(mockPrismaService.client.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Child Category',
          parentId: 1,
        },
      });
    });

    it('should create category with special characters in name', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Café & Restaurant',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Café & Restaurant',
        parentId: undefined,
      };
      const specialCategoryData = {
        ...mockCategoryData,
        name: 'Café & Restaurant',
      };
      const expectedSpecialResponse: CategoryType = {
        ...expectedCategoryResponse,
        name: 'Café & Restaurant',
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(specialCategoryData);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(expectedSpecialResponse);
      expect(result.name).toBe('Café & Restaurant');
    });

    it('should create category with zero parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Zero Parent Category',
        parentId: 0,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Zero Parent Category',
        parentId: 0,
      };
      const parentCategory = {
        id: 0,
        name: 'Zero Parent',
        parentId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const zeroCategoryData = {
        ...mockCategoryData,
        name: 'Zero Parent Category',
        parentId: 0,
      };
      const expectedZeroResponse: CategoryType = {
        ...expectedCategoryResponse,
        name: 'Zero Parent Category',
        parentId: '', // 0 is falsy, so it becomes empty string
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findUnique.mockResolvedValue(parentCategory);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(zeroCategoryData);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(expectedZeroResponse);
      expect(result.parentId).toBe(''); // 0 becomes empty string due to || '' logic
    });

    it('should handle parentId conversion correctly (null vs undefined)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Conversion Test',
        parentId: undefined,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Conversion Test',
        parentId: undefined,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue({
        ...mockCategoryData,
        name: 'Conversion Test',
      });

      // Act
      await service.createCategory(input);

      // Assert
      expect(mockPrismaService.client.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Conversion Test',
          parentId: null, // undefined should be converted to null
        },
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should throw BAD_REQUEST when parent category not found', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Child Category',
        parentId: 999,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Child Category',
        parentId: 999,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findUnique.mockResolvedValue(null);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.category.parentNotFound',
      });

      // Act & Assert
      await expect(service.createCategory(input)).rejects.toThrow(expectedError);
      expect(mockPrismaService.client.category.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(mockPrismaService.client.category.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.client.category.create).not.toHaveBeenCalled();
    });

    it('should throw CONFLICT when category name already exists in same parent', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Existing Category',
        parentId: 1,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Existing Category',
        parentId: 1,
      };
      const parentCategory = {
        id: 1,
        name: 'Parent Category',
        parentId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const existingCategory = {
        id: 2,
        name: 'Existing Category',
        parentId: 1,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findUnique.mockResolvedValue(parentCategory);
      mockPrismaService.client.category.findFirst.mockResolvedValue(existingCategory);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.category.nameExists',
      });

      // Act & Assert
      await expect(service.createCategory(input)).rejects.toThrow(expectedError);
      expect(mockPrismaService.client.category.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Existing Category',
          parentId: 1,
        },
      });
      expect(mockPrismaService.client.category.create).not.toHaveBeenCalled();
    });

    it('should throw CONFLICT when Prisma unique constraint violation (P2002)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Duplicate Category',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Duplicate Category',
        parentId: undefined,
      };
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockRejectedValue(prismaError);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.category.nameExists',
      });

      // Act & Assert
      await expect(service.createCategory(input)).rejects.toThrow(expectedError);
    });

    it('should re-throw TypedRpcException without modification', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      const originalError = new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'custom.error.message',
      });

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockRejectedValue(originalError);

      // Act & Assert
      await expect(service.createCategory(input)).rejects.toThrow(originalError);
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      const unknownError = new Error('Database connection failed');

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockRejectedValue(unknownError);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });

      // Act & Assert
      await expect(service.createCategory(input)).rejects.toThrow(expectedError);
    });

    it('should handle database connection timeout', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      const timeoutError = new Error('Connection timeout');

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockRejectedValue(timeoutError);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });

      // Act & Assert
      await expect(service.createCategory(input)).rejects.toThrow(expectedError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long category name', async (): Promise<void> => {
      // Arrange
      const longName = 'A'.repeat(255);
      const input: GraphQLCateroryInput = {
        name: longName,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: longName,
        parentId: undefined,
      };
      const longNameData = {
        ...mockCategoryData,
        name: longName,
      };
      const expectedLongResponse: CategoryType = {
        ...expectedCategoryResponse,
        name: longName,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(longNameData);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(expectedLongResponse);
      expect(result.name).toHaveLength(255);
    });

    it('should handle large parentId values', async (): Promise<void> => {
      // Arrange
      const largeParentId = 2147483647; // Max 32-bit integer
      const input: GraphQLCateroryInput = {
        name: 'Large Parent ID Category',
        parentId: largeParentId,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Large Parent ID Category',
        parentId: largeParentId,
      };
      const parentCategory = {
        id: largeParentId,
        name: 'Large Parent',
        parentId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const largeCategoryData = {
        ...mockCategoryData,
        name: 'Large Parent ID Category',
        parentId: largeParentId,
      };
      const expectedLargeResponse: CategoryType = {
        ...expectedCategoryResponse,
        name: 'Large Parent ID Category',
        parentId: largeParentId,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findUnique.mockResolvedValue(parentCategory);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(largeCategoryData);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(expectedLargeResponse);
      expect(result.parentId).toBe(largeParentId);
    });

    it('should handle category name with unicode characters', async (): Promise<void> => {
      // Arrange
      const unicodeName = '🍕 Pizza & 🍔 Burger';
      const input: GraphQLCateroryInput = {
        name: unicodeName,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: unicodeName,
        parentId: undefined,
      };
      const unicodeData = {
        ...mockCategoryData,
        name: unicodeName,
      };
      const expectedUnicodeResponse: CategoryType = {
        ...expectedCategoryResponse,
        name: unicodeName,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(unicodeData);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(expectedUnicodeResponse);
      expect(result.name).toBe(unicodeName);
    });

    it('should handle null parentId in database response correctly', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Null Parent Test',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Null Parent Test',
        parentId: undefined,
      };
      const nullParentData = {
        ...mockCategoryData,
        name: 'Null Parent Test',
        parentId: null, // Explicitly null from database
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(nullParentData);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result.parentId).toBe(''); // null should be converted to empty string
    });
  });

  describe('Method Verification', () => {
    it('should have correct method signature and return type', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(mockCategoryData);

      // Act
      const result = service.createCategory(input);

      // Assert
      expect(result).toBeInstanceOf(Promise);
      const resolvedResult = await result;
      expect(resolvedResult).toHaveProperty('id');
      expect(resolvedResult).toHaveProperty('name');
      expect(resolvedResult).toHaveProperty('parentId');
      expect(resolvedResult).toHaveProperty('createdAt');
      expect(resolvedResult).toHaveProperty('updatedAt');
      expect(typeof resolvedResult.id).toBe('number');
      expect(typeof resolvedResult.name).toBe('string');
      expect(resolvedResult.createdAt).toBeInstanceOf(Date);
      expect(resolvedResult.updatedAt).toBeInstanceOf(Date);
    });

    it('should call plainToInstance with correct parameters', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Transform Test',
        parentId: 5,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Transform Test',
        parentId: 5,
      };
      const parentCategory = {
        id: 5,
        name: 'Parent',
        parentId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findUnique.mockResolvedValue(parentCategory);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue({
        ...mockCategoryData,
        name: 'Transform Test',
        parentId: 5,
      });

      // Act
      await service.createCategory(input);

      // Assert
      expect(plainToInstanceMock).toHaveBeenCalledWith(GraphQLCateroryInput, input);
      expect(plainToInstanceMock).toHaveBeenCalledTimes(1);
    });

    it('should validate response structure matches CategoryType', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Structure Test',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Structure Test',
        parentId: undefined,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue({
        ...mockCategoryData,
        name: 'Structure Test',
      });

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(typeof result.id).toBe('number');
      expect(typeof result.name).toBe('string');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('parentId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent createCategory calls', async (): Promise<void> => {
      // Arrange
      const input1: GraphQLCateroryInput = { name: 'Concurrent 1' };
      const input2: GraphQLCateroryInput = { name: 'Concurrent 2' };
      const input3: GraphQLCateroryInput = { name: 'Concurrent 3' };

      const dto1: GraphQLCateroryInput = { name: 'Concurrent 1', parentId: undefined };
      const dto2: GraphQLCateroryInput = { name: 'Concurrent 2', parentId: undefined };
      const dto3: GraphQLCateroryInput = { name: 'Concurrent 3', parentId: undefined };

      const data1 = { ...mockCategoryData, id: 1, name: 'Concurrent 1' };
      const data2 = { ...mockCategoryData, id: 2, name: 'Concurrent 2' };
      const data3 = { ...mockCategoryData, id: 3, name: 'Concurrent 3' };

      const expected1: CategoryType = { ...expectedCategoryResponse, id: 1, name: 'Concurrent 1' };
      const expected2: CategoryType = { ...expectedCategoryResponse, id: 2, name: 'Concurrent 2' };
      const expected3: CategoryType = { ...expectedCategoryResponse, id: 3, name: 'Concurrent 3' };

      plainToInstanceMock
        .mockReturnValueOnce(dto1)
        .mockReturnValueOnce(dto2)
        .mockReturnValueOnce(dto3);

      mockPrismaService.client.category.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockPrismaService.client.category.create
        .mockResolvedValueOnce(data1)
        .mockResolvedValueOnce(data2)
        .mockResolvedValueOnce(data3);

      // Act
      const [result1, result2, result3] = await Promise.all([
        service.createCategory(input1),
        service.createCategory(input2),
        service.createCategory(input3),
      ]);

      // Assert
      expect(result1).toEqual(expected1);
      expect(result2).toEqual(expected2);
      expect(result3).toEqual(expected3);
      expect(mockPrismaService.client.category.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Transformation', () => {
    it('should correctly transform database response to CategoryType', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Transform Test',
        parentId: 10,
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Transform Test',
        parentId: 10,
      };
      const parentCategory = {
        id: 10,
        name: 'Parent',
        parentId: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const databaseResponse = {
        id: 15,
        name: 'Transform Test',
        parentId: 10,
        createdAt: mockDate,
        updatedAt: mockDate,
      };
      const expectedTransformed: CategoryType = {
        id: 15,
        name: 'Transform Test',
        parentId: 10,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findUnique.mockResolvedValue(parentCategory);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(databaseResponse);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result).toEqual(expectedTransformed);
      expect(result.id).toBe(databaseResponse.id);
      expect(result.name).toBe(databaseResponse.name);
      expect(result.parentId).toBe(databaseResponse.parentId);
      expect(result.createdAt).toBe(databaseResponse.createdAt);
      expect(result.updatedAt).toBe(databaseResponse.updatedAt);
    });

    it('should handle parentId null to empty string conversion', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Root Category Test',
      };
      const transformedDto: GraphQLCateroryInput = {
        name: 'Root Category Test',
        parentId: undefined,
      };
      const databaseResponse = {
        id: 20,
        name: 'Root Category Test',
        parentId: null, // Database returns null
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      plainToInstanceMock.mockReturnValue(transformedDto);
      mockPrismaService.client.category.findFirst.mockResolvedValue(null);
      mockPrismaService.client.category.create.mockResolvedValue(databaseResponse);

      // Act
      const result = await service.createCategory(input);

      // Assert
      expect(result.parentId).toBe(''); // null should become empty string
      expect(result.parentId).not.toBe(null);
      expect(result.parentId).not.toBe(undefined);
    });
  });
});
