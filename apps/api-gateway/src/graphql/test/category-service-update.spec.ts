import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { I18nService } from 'nestjs-i18n';
import { of, throwError } from 'rxjs';
import { CategoryService } from '../services/category.service';
import { GraphQLUpdateCateroryInput } from '@app/common/types/graphql/arg-type/update-category.typ';
import { CategoryType } from '@app/common/types/graphql/caterories.type';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { PRODUCT_SERVICE } from '@app/common/constant/service.constant';
import { CustomLogger } from '@app/common/logger/custom-logger.service';

describe('CategoryService - updateCategory', () => {
  let service: CategoryService;
  let mockProductClient: jest.Mocked<ClientProxy>;
  let mockI18nService: jest.Mocked<I18nService>;
  let mockLogger: jest.Mocked<CustomLogger>;
  let mockSend: jest.MockedFunction<ClientProxy['send']>;
  let mockTranslate: jest.MockedFunction<I18nService['translate']>;

  const mockDate = new Date('2024-01-01T00:00:00Z');
  const mockUpdatedDate = new Date('2024-01-02T00:00:00Z');

  const mockCategoryType: CategoryType = {
    id: 1,
    name: 'Updated Category',
    parentId: '',
    createdAt: mockDate,
    updatedAt: mockUpdatedDate,
  };

  beforeEach(async (): Promise<void> => {
    const mockClient = {
      send: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    };

    const mockI18n = {
      translate: jest.fn(),
      t: jest.fn(),
      lang: jest.fn(),
      getSupportedLanguages: jest.fn(),
      refresh: jest.fn(),
    };

    const mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockClient,
        },
        {
          provide: I18nService,
          useValue: mockI18n,
        },
        {
          provide: CustomLogger,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    mockProductClient = module.get<ClientProxy>(PRODUCT_SERVICE) as jest.Mocked<ClientProxy>;
    mockI18nService = module.get<I18nService>(I18nService) as jest.Mocked<I18nService>;
    mockLogger = module.get<CustomLogger>(CustomLogger) as jest.Mocked<CustomLogger>;
    mockSend = jest.fn();
    mockTranslate = jest.fn();
    mockProductClient.send = mockSend;
    mockI18nService.translate = mockTranslate;

    // Suppress unused variable warnings
    void mockLogger;
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Successful Scenarios', () => {
    it('should update category name successfully', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Updated Category Name',
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        name: 'Updated Category Name',
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockSend).toHaveBeenCalledWith(ProductPattern.UPDATE_CATEGORY, input);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should update category parentId successfully', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 5,
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        parentId: 5,
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.parentId).toBe(5);
      expect(mockSend).toHaveBeenCalledWith(ProductPattern.UPDATE_CATEGORY, input);
    });

    it('should update both name and parentId successfully', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Complete Update',
        parentId: 3,
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        name: 'Complete Update',
        parentId: 3,
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.name).toBe('Complete Update');
      expect(result.parentId).toBe(3);
    });

    it('should update category to root level (parentId undefined)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Root Category',
        parentId: undefined,
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        name: 'Root Category',
        parentId: '',
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.parentId).toBe('');
    });

    it('should handle minimal update (only id)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
      };
      mockSend.mockReturnValue(of(mockCategoryType));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(mockCategoryType);
      expect(mockSend).toHaveBeenCalledWith(ProductPattern.UPDATE_CATEGORY, input);
    });

    it('should handle special characters in name', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Café & Restaurant 🍕',
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        name: 'Café & Restaurant 🍕',
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.name).toBe('Café & Restaurant 🍕');
    });

    it('should handle very long category name', async (): Promise<void> => {
      // Arrange
      const longName = 'A'.repeat(255);
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: longName,
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        name: longName,
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.name).toHaveLength(255);
    });

    it('should handle large id values', async (): Promise<void> => {
      // Arrange
      const largeId = 2147483647; // Max 32-bit integer
      const input: GraphQLUpdateCateroryInput = {
        id: largeId,
        name: 'Large ID Category',
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        id: largeId,
        name: 'Large ID Category',
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.id).toBe(largeId);
    });

    it('should handle zero parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 0,
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        parentId: 0,
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.parentId).toBe(0);
    });

    it('should handle unicode characters in name', async (): Promise<void> => {
      // Arrange
      const unicodeName = '🍕 Pizza & 🍔 Burger 中文';
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: unicodeName,
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        name: unicodeName,
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.name).toBe(unicodeName);
    });
  });

  describe('Error Scenarios', () => {
    it('should throw BadRequestException when microservice returns null', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const translatedMessage = 'Update category failed';
      mockSend.mockReturnValue(of(null));
      mockTranslate.mockReturnValue(translatedMessage);

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(service.updateCategory(input)).rejects.toThrow(translatedMessage);
      expect(mockTranslate).toHaveBeenCalledWith('common.category.action.updateCategory.failed');
    });

    it('should throw BadRequestException when microservice returns undefined', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const translatedMessage = 'Update category failed';
      mockSend.mockReturnValue(of(undefined));
      mockTranslate.mockReturnValue(translatedMessage);

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow(BadRequestException);
      expect(mockTranslate).toHaveBeenCalledWith('common.category.action.updateCategory.failed');
    });

    it('should handle microservice communication error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const microserviceError = new Error('Microservice unavailable');
      mockSend.mockReturnValue(throwError(() => microserviceError));

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow('Microservice unavailable');
      expect(mockSend).toHaveBeenCalledWith(ProductPattern.UPDATE_CATEGORY, input);
    });

    it('should handle microservice timeout error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const timeoutError = new Error('Request timeout');
      mockSend.mockReturnValue(throwError(() => timeoutError));

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow('Request timeout');
    });

    it('should handle RPC exception from microservice', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 999,
        name: 'Non-existent Category',
      };
      const rpcError = new Error('Category not found');
      mockSend.mockReturnValue(throwError(() => rpcError));

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow('Category not found');
    });

    it('should handle i18n service error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      mockSend.mockReturnValue(of(null));
      mockTranslate.mockImplementation(() => {
        throw new Error('Translation service error');
      });

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow('Translation service error');
    });

    it('should handle network connectivity issues', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const networkError = new Error('ECONNREFUSED');
      mockSend.mockReturnValue(throwError(() => networkError));

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow('ECONNREFUSED');
    });

    it('should handle malformed response from microservice', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const malformedResponse = { invalidField: 'invalid' };
      mockSend.mockReturnValue(of(malformedResponse as unknown as CategoryType));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(malformedResponse);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object response', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const emptyResponse = {} as CategoryType;
      mockSend.mockReturnValue(of(emptyResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(emptyResponse);
    });

    it('should throw BadRequestException for false response (falsy value)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const translatedMessage = 'Update category failed';
      mockSend.mockReturnValue(of(false as unknown as CategoryType));
      mockTranslate.mockReturnValue(translatedMessage);

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(service.updateCategory(input)).rejects.toThrow(translatedMessage);
      expect(mockTranslate).toHaveBeenCalledWith('common.category.action.updateCategory.failed');
    });

    it('should throw BadRequestException for zero response (falsy value)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const translatedMessage = 'Update category failed';
      mockSend.mockReturnValue(of(0 as unknown as CategoryType));
      mockTranslate.mockReturnValue(translatedMessage);

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(service.updateCategory(input)).rejects.toThrow(translatedMessage);
      expect(mockTranslate).toHaveBeenCalledWith('common.category.action.updateCategory.failed');
    });

    it('should throw BadRequestException for empty string response (falsy value)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const translatedMessage = 'Update category failed';
      mockSend.mockReturnValue(of('' as unknown as CategoryType));
      mockTranslate.mockReturnValue(translatedMessage);

      // Act & Assert
      await expect(service.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(service.updateCategory(input)).rejects.toThrow(translatedMessage);
      expect(mockTranslate).toHaveBeenCalledWith('common.category.action.updateCategory.failed');
    });

    it('should handle very large parentId values', async (): Promise<void> => {
      // Arrange
      const largeParentId = 2147483647;
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: largeParentId,
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        parentId: largeParentId,
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.parentId).toBe(largeParentId);
    });

    it('should handle negative id values', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: -1,
        name: 'Negative ID Category',
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        id: -1,
        name: 'Negative ID Category',
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.id).toBe(-1);
    });
  });

  describe('Method Verification', () => {
    it('should have correct method signature', (): void => {
      // Assert
      expect(typeof service.updateCategory).toBe('function');
    });

    it('should return Promise<CategoryType>', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      mockSend.mockReturnValue(of(mockCategoryType));

      // Act
      const result = service.updateCategory(input);

      // Assert
      expect(result).toBeInstanceOf(Promise);
      const resolvedResult = await result;
      expect(resolvedResult).toHaveProperty('id');
      expect(resolvedResult).toHaveProperty('name');
      expect(resolvedResult).toHaveProperty('parentId');
      expect(resolvedResult).toHaveProperty('createdAt');
      expect(resolvedResult).toHaveProperty('updatedAt');
    });

    it('should call productClient.send with correct parameters', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
        parentId: 5,
      };
      mockSend.mockReturnValue(of(mockCategoryType));

      // Act
      await service.updateCategory(input);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(ProductPattern.UPDATE_CATEGORY, input);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should use correct ProductPattern enum value', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      mockSend.mockReturnValue(of(mockCategoryType));

      // Act
      await service.updateCategory(input);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        ProductPattern.UPDATE_CATEGORY,
        expect.objectContaining(input),
      );
    });
  });

  describe('Response Structure Validation', () => {
    it('should return response with correct CategoryType structure', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Structure Test',
      };
      mockSend.mockReturnValue(of(mockCategoryType));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('parentId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(typeof result.id).toBe('number');
      expect(typeof result.name).toBe('string');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle different parentId types correctly', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 5,
      };
      const responseWithNumberParent: CategoryType = {
        ...mockCategoryType,
        parentId: 5,
      };
      mockSend.mockReturnValue(of(responseWithNumberParent));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(typeof result.parentId).toBe('number');
      expect(result.parentId).toBe(5);
    });

    it('should handle empty string parentId correctly', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Root Category',
      };
      const responseWithEmptyParent: CategoryType = {
        ...mockCategoryType,
        parentId: '',
      };
      mockSend.mockReturnValue(of(responseWithEmptyParent));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result.parentId).toBe('');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent updateCategory calls', async (): Promise<void> => {
      // Arrange
      const input1: GraphQLUpdateCateroryInput = { id: 1, name: 'Concurrent 1' };
      const input2: GraphQLUpdateCateroryInput = { id: 2, name: 'Concurrent 2' };
      const input3: GraphQLUpdateCateroryInput = { id: 3, name: 'Concurrent 3' };

      const response1: CategoryType = { ...mockCategoryType, id: 1, name: 'Concurrent 1' };
      const response2: CategoryType = { ...mockCategoryType, id: 2, name: 'Concurrent 2' };
      const response3: CategoryType = { ...mockCategoryType, id: 3, name: 'Concurrent 3' };

      mockSend
        .mockReturnValueOnce(of(response1))
        .mockReturnValueOnce(of(response2))
        .mockReturnValueOnce(of(response3));

      // Act
      const [result1, result2, result3] = await Promise.all([
        service.updateCategory(input1),
        service.updateCategory(input2),
        service.updateCategory(input3),
      ]);

      // Assert
      expect(result1).toEqual(response1);
      expect(result2).toEqual(response2);
      expect(result3).toEqual(response3);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });
  });

  describe('Input Validation', () => {
    it('should handle input with only required fields (id)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
      };
      mockSend.mockReturnValue(of(mockCategoryType));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(mockCategoryType);
      expect(mockSend).toHaveBeenCalledWith(ProductPattern.UPDATE_CATEGORY, input);
    });

    it('should handle partial updates (name only)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Name Only Update',
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        name: 'Name Only Update',
      };
      mockSend.mockReturnValue(of(expectedResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.name).toBe('Name Only Update');
    });

    it('should handle partial updates (parentId only)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 10,
      };
      const parentOnlyResponse: CategoryType = {
        ...mockCategoryType,
        parentId: 10,
      };
      mockSend.mockReturnValue(of(parentOnlyResponse));

      // Act
      const result = await service.updateCategory(input);

      // Assert
      expect(result).toEqual(parentOnlyResponse);
      expect(result.parentId).toBe(10);
    });
  });
});
