import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { CategoryResolver } from '../resolvers/category.resolver';
import { CategoryService } from '../services/category.service';
import { GraphQLUpdateCateroryInput } from '@app/common/types/graphql/arg-type/update-category.typ';
import { CategoryType } from '@app/common/types/graphql/caterories.type';

describe('CategoryResolver - updateCategory', () => {
  let resolver: CategoryResolver;
  let mockCategoryService: jest.Mocked<CategoryService>;
  let updateCategorySpy: jest.SpyInstance;

  const mockDate = new Date('2024-01-01T00:00:00Z');

  const mockCategoryType: CategoryType = {
    id: 1,
    name: 'Updated Category',
    parentId: '',
    createdAt: mockDate,
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  };

  beforeEach(async (): Promise<void> => {
    const mockService = {
      updateCategory: jest.fn(),
      createCategory: jest.fn(),
      getCategories: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
    };

    const mockI18nService = {
      translate: jest.fn().mockReturnValue('translated message'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryResolver,
        {
          provide: CategoryService,
          useValue: mockService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    resolver = module.get<CategoryResolver>(CategoryResolver);
    mockCategoryService = module.get(CategoryService);
    updateCategorySpy = jest.spyOn(mockCategoryService, 'updateCategory');
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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
      expect(updateCategorySpy).toHaveBeenCalledTimes(1);
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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.parentId).toBe(5);
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.name).toBe('Complete Update');
      expect(result.parentId).toBe(3);
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.parentId).toBe('');
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should update category with only id (minimal update)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
      };
      updateCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(mockCategoryType);
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should handle category name with special characters', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Café & Restaurant 🍕',
      };
      const expectedResponse: CategoryType = {
        ...mockCategoryType,
        name: 'Café & Restaurant 🍕',
      };
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.parentId).toBe(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle service throwing BadRequestException', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 999,
        name: 'Non-existent Category',
      };
      const error = new BadRequestException('Category not found');
      updateCategorySpy.mockRejectedValue(error);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.updateCategory(input)).rejects.toThrow('Category not found');
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should handle service throwing generic Error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const error = new Error('Database connection failed');
      updateCategorySpy.mockRejectedValue(error);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(Error);
      await expect(resolver.updateCategory(input)).rejects.toThrow('Database connection failed');
    });

    it('should handle service returning null response', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      mockCategoryService.updateCategory.mockResolvedValue(null as unknown as CategoryType);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toBeNull();
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should handle service timeout error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const timeoutError = new Error('Request timeout');
      mockCategoryService.updateCategory.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow('Request timeout');
    });

    it('should handle parent category not found error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 999,
      };
      const notFoundError = new BadRequestException('Parent category not found');
      mockCategoryService.updateCategory.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.updateCategory(input)).rejects.toThrow('Parent category not found');
    });

    it('should handle circular reference error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: 1, // Circular reference
      };
      const circularError = new BadRequestException('Cannot set category as its own parent');
      mockCategoryService.updateCategory.mockRejectedValue(circularError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.updateCategory(input)).rejects.toThrow(
        'Cannot set category as its own parent',
      );
    });

    it('should handle duplicate name error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Existing Category Name',
      };
      const duplicateError = new BadRequestException('Category name already exists');
      mockCategoryService.updateCategory.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.updateCategory(input)).rejects.toThrow('Category name already exists');
    });

    it('should handle microservice communication error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      const microserviceError = new Error('Microservice unavailable');
      mockCategoryService.updateCategory.mockRejectedValue(microserviceError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow('Microservice unavailable');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string name (should be caught by validation)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: '',
      };
      const validationError = new BadRequestException('Name cannot be empty');
      mockCategoryService.updateCategory.mockRejectedValue(validationError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.updateCategory(input)).rejects.toThrow('Name cannot be empty');
    });

    it('should handle whitespace-only name', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: '   ',
      };
      const whitespaceError = new BadRequestException('Name cannot be whitespace only');
      mockCategoryService.updateCategory.mockRejectedValue(whitespaceError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.updateCategory(input)).rejects.toThrow(
        'Name cannot be whitespace only',
      );
    });

    it('should handle negative id', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: -1,
        name: 'Negative ID Category',
      };
      const negativeIdError = new BadRequestException('Invalid category ID');
      mockCategoryService.updateCategory.mockRejectedValue(negativeIdError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.updateCategory(input)).rejects.toThrow('Invalid category ID');
    });

    it('should handle negative parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        parentId: -1,
      };
      const negativeParentError = new BadRequestException('Invalid parent ID');
      mockCategoryService.updateCategory.mockRejectedValue(negativeParentError);

      // Act & Assert
      await expect(resolver.updateCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.updateCategory(input)).rejects.toThrow('Invalid parent ID');
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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.parentId).toBe(largeParentId);
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
      updateCategorySpy.mockResolvedValue(expectedResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.name).toBe(unicodeName);
    });
  });

  describe('Method Verification', () => {
    it('should have correct method signature', (): void => {
      // Assert
      expect(typeof resolver.updateCategory).toBe('function');
    });

    it('should return Promise<CategoryType>', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
      };
      updateCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = resolver.updateCategory(input);

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
    });

    it('should call CategoryService.updateCategory with correct parameters', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Test Category',
        parentId: 5,
      };
      updateCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      await resolver.updateCategory(input);

      // Assert
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
      expect(updateCategorySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Structure Validation', () => {
    it('should return response with correct CategoryType structure', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Structure Test',
      };
      updateCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = await resolver.updateCategory(input);

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

    it('should return category with correct field types', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Type Test',
      };
      updateCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(typeof result.id).toBe('number');
      expect(typeof result.name).toBe('string');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name.length).toBeGreaterThan(0);
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
      updateCategorySpy.mockResolvedValue(responseWithNumberParent);

      // Act
      const result = await resolver.updateCategory(input);

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
      updateCategorySpy.mockResolvedValue(responseWithEmptyParent);

      // Act
      const result = await resolver.updateCategory(input);

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

      mockCategoryService.updateCategory
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2)
        .mockResolvedValueOnce(response3);

      // Act
      const [result1, result2, result3] = await Promise.all([
        resolver.updateCategory(input1),
        resolver.updateCategory(input2),
        resolver.updateCategory(input3),
      ]);

      // Assert
      expect(result1).toEqual(response1);
      expect(result2).toEqual(response2);
      expect(result3).toEqual(response3);
      expect(updateCategorySpy).toHaveBeenCalledTimes(3);
      expect(updateCategorySpy).toHaveBeenNthCalledWith(1, input1);
      expect(updateCategorySpy).toHaveBeenNthCalledWith(2, input2);
      expect(updateCategorySpy).toHaveBeenNthCalledWith(3, input3);
    });
  });

  describe('Input Validation', () => {
    it('should handle input with only required fields (id)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
      };
      updateCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(mockCategoryType);
      expect(updateCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should handle input with all optional fields provided', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Complete Update',
        parentId: 5,
      };
      const completeResponse: CategoryType = {
        ...mockCategoryType,
        name: 'Complete Update',
        parentId: 5,
      };
      updateCategorySpy.mockResolvedValue(completeResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(completeResponse);
      expect(result.name).toBe('Complete Update');
      expect(result.parentId).toBe(5);
    });

    it('should handle partial updates (name only)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLUpdateCateroryInput = {
        id: 1,
        name: 'Name Only Update',
      };
      const nameOnlyResponse: CategoryType = {
        ...mockCategoryType,
        name: 'Name Only Update',
      };
      updateCategorySpy.mockResolvedValue(nameOnlyResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(nameOnlyResponse);
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
      updateCategorySpy.mockResolvedValue(parentOnlyResponse);

      // Act
      const result = await resolver.updateCategory(input);

      // Assert
      expect(result).toEqual(parentOnlyResponse);
      expect(result.parentId).toBe(10);
    });
  });
});
