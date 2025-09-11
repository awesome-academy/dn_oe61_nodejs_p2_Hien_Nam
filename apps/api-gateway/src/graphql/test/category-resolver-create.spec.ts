import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { CategoryResolver } from '../resolvers/category.resolver';
import { CategoryService } from '../services/category.service';
import { GraphQLCateroryInput } from '@app/common/types/graphql/arg-type/create-category.type';
import { CategoryType } from '@app/common/types/graphql/caterories.type';

describe('CategoryResolver - createCategory', () => {
  let resolver: CategoryResolver;
  let mockCategoryService: jest.Mocked<CategoryService>;
  let createCategorySpy: jest.SpyInstance;

  const mockCategoryType: CategoryType = {
    id: 1,
    name: 'Test Category',
    parentId: '',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async (): Promise<void> => {
    const mockService = {
      createCategory: jest.fn(),
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
    createCategorySpy = jest.spyOn(mockCategoryService, 'createCategory');
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Successful Scenarios', () => {
    it('should create category successfully with valid input', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'New Category',
        parentId: undefined,
      };
      createCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(mockCategoryType);
      expect(createCategorySpy).toHaveBeenCalledWith(input);
      expect(createCategorySpy).toHaveBeenCalledTimes(1);
    });

    it('should create root category without parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Root Category',
      };
      const rootCategory: CategoryType = {
        ...mockCategoryType,
        name: 'Root Category',
        parentId: '',
      };
      createCategorySpy.mockResolvedValue(rootCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(rootCategory);
      expect(result.parentId).toBe('');
      expect(createCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should create child category with parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Child Category',
        parentId: 1,
      };
      const childCategory: CategoryType = {
        ...mockCategoryType,
        id: 2,
        name: 'Child Category',
        parentId: 1,
      };
      createCategorySpy.mockResolvedValue(childCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(childCategory);
      expect(result.parentId).toBe(1);
      expect(createCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should handle category with special characters in name', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Café & Restaurant',
        parentId: undefined,
      };
      const specialCharCategory: CategoryType = {
        ...mockCategoryType,
        name: 'Café & Restaurant',
      };
      mockCategoryService.createCategory.mockResolvedValue(specialCharCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(specialCharCategory);
      expect(result.name).toBe('Café & Restaurant');
    });

    it('should handle category with very long name', async (): Promise<void> => {
      // Arrange
      const longName = 'A'.repeat(255);
      const input: GraphQLCateroryInput = {
        name: longName,
        parentId: undefined,
      };
      const longNameCategory: CategoryType = {
        ...mockCategoryType,
        name: longName,
      };
      mockCategoryService.createCategory.mockResolvedValue(longNameCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(longNameCategory);
      expect(result.name).toHaveLength(255);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle service throwing BadRequestException', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Invalid Category',
        parentId: undefined,
      };
      const error = new BadRequestException('Category name already exists');
      createCategorySpy.mockRejectedValue(error);

      // Act & Assert
      await expect(resolver.createCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.createCategory(input)).rejects.toThrow('Category name already exists');
      expect(createCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should handle service throwing generic Error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      const error = new Error('Database connection failed');
      createCategorySpy.mockRejectedValue(error);

      // Act & Assert
      await expect(resolver.createCategory(input)).rejects.toThrow(Error);
      await expect(resolver.createCategory(input)).rejects.toThrow('Database connection failed');
    });

    it('should handle service returning null response', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      mockCategoryService.createCategory.mockResolvedValue(null as unknown as CategoryType);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toBeNull();
      expect(createCategorySpy).toHaveBeenCalledWith(input);
    });

    it('should handle service timeout error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      const timeoutError = new Error('Request timeout');
      mockCategoryService.createCategory.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(resolver.createCategory(input)).rejects.toThrow('Request timeout');
    });

    it('should handle parent category not found error', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Child Category',
        parentId: 999,
      };
      const notFoundError = new BadRequestException('Parent category not found');
      mockCategoryService.createCategory.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(resolver.createCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.createCategory(input)).rejects.toThrow('Parent category not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: 0,
      };
      const zeroParentCategory: CategoryType = {
        ...mockCategoryType,
        parentId: 0,
      };
      mockCategoryService.createCategory.mockResolvedValue(zeroParentCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(zeroParentCategory);
      expect(result.parentId).toBe(0);
    });

    it('should handle negative parentId', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: -1,
      };
      const negativeParentCategory: CategoryType = {
        ...mockCategoryType,
        parentId: -1,
      };
      mockCategoryService.createCategory.mockResolvedValue(negativeParentCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(negativeParentCategory);
      expect(result.parentId).toBe(-1);
    });

    it('should handle very large parentId', async (): Promise<void> => {
      // Arrange
      const largeParentId = 2147483647; // Max 32-bit integer
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: largeParentId,
      };
      const largeParentCategory: CategoryType = {
        ...mockCategoryType,
        parentId: largeParentId,
      };
      mockCategoryService.createCategory.mockResolvedValue(largeParentCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(largeParentCategory);
      expect(result.parentId).toBe(largeParentId);
    });

    it('should handle empty string name (validation should catch this)', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: '',
        parentId: undefined,
      };
      const validationError = new BadRequestException('Name cannot be empty');
      mockCategoryService.createCategory.mockRejectedValue(validationError);

      // Act & Assert
      await expect(resolver.createCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.createCategory(input)).rejects.toThrow('Name cannot be empty');
    });

    it('should handle whitespace-only name', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: '   ',
        parentId: undefined,
      };
      const whitespaceError = new BadRequestException('Name cannot be whitespace only');
      mockCategoryService.createCategory.mockRejectedValue(whitespaceError);

      // Act & Assert
      await expect(resolver.createCategory(input)).rejects.toThrow(BadRequestException);
      await expect(resolver.createCategory(input)).rejects.toThrow(
        'Name cannot be whitespace only',
      );
    });
  });

  describe('Method Verification', () => {
    it('should have correct method signature', (): void => {
      // Assert
      expect(typeof resolver.createCategory).toBe('function');
    });

    it('should return Promise<CategoryType>', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      createCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = resolver.createCategory(input);

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

    it('should call CategoryService.createCategory with correct parameters', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: 5,
      };
      createCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      await resolver.createCategory(input);

      // Assert
      expect(createCategorySpy).toHaveBeenCalledWith(input);
      expect(createCategorySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Structure Validation', () => {
    it('should return response with correct CategoryType structure', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      createCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = await resolver.createCategory(input);

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
      const input: GraphQLCateroryInput = {
        name: 'Test Category',
        parentId: undefined,
      };
      createCategorySpy.mockResolvedValue(mockCategoryType);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(typeof result.id).toBe('number');
      expect(typeof result.name).toBe('string');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent createCategory calls', async (): Promise<void> => {
      // Arrange
      const input1: GraphQLCateroryInput = { name: 'Category 1' };
      const input2: GraphQLCateroryInput = { name: 'Category 2' };
      const input3: GraphQLCateroryInput = { name: 'Category 3' };

      const response1: CategoryType = { ...mockCategoryType, id: 1, name: 'Category 1' };
      const response2: CategoryType = { ...mockCategoryType, id: 2, name: 'Category 2' };
      const response3: CategoryType = { ...mockCategoryType, id: 3, name: 'Category 3' };

      mockCategoryService.createCategory
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2)
        .mockResolvedValueOnce(response3);

      // Act
      const [result1, result2, result3] = await Promise.all([
        resolver.createCategory(input1),
        resolver.createCategory(input2),
        resolver.createCategory(input3),
      ]);

      // Assert
      expect(result1).toEqual(response1);
      expect(result2).toEqual(response2);
      expect(result3).toEqual(response3);
      expect(createCategorySpy).toHaveBeenCalledTimes(3);
      expect(createCategorySpy).toHaveBeenNthCalledWith(1, input1);
      expect(createCategorySpy).toHaveBeenNthCalledWith(2, input2);
      expect(createCategorySpy).toHaveBeenNthCalledWith(3, input3);
    });
  });

  describe('Input Validation', () => {
    it('should handle input with only required fields', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Minimal Category',
      };
      const minimalCategory: CategoryType = {
        ...mockCategoryType,
        name: 'Minimal Category',
      };
      mockCategoryService.createCategory.mockResolvedValue(minimalCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(minimalCategory);
      expect(result.name).toBe('Minimal Category');
    });

    it('should handle input with all fields provided', async (): Promise<void> => {
      // Arrange
      const input: GraphQLCateroryInput = {
        name: 'Complete Category',
        parentId: 5,
      };
      const completeCategory: CategoryType = {
        ...mockCategoryType,
        name: 'Complete Category',
        parentId: 5,
      };
      mockCategoryService.createCategory.mockResolvedValue(completeCategory);

      // Act
      const result = await resolver.createCategory(input);

      // Assert
      expect(result).toEqual(completeCategory);
      expect(result.name).toBe('Complete Category');
      expect(result.parentId).toBe(5);
    });
  });
});
