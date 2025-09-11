import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CategoryResolver } from '../resolvers/category.resolver';
import { CategoryService } from '../services/category.service';
import { PaginationArgs } from '@app/common/types/graphql/arg-type/pagination.type';
import {
  CategoriesType,
  CategoryGroupGraphQL,
  RootCategoryGraphQL,
  ChildCategoryGraphQL,
} from '@app/common/types/graphql/caterories.type';
import { PaginationMeta } from '@app/common/interfaces/pagination';

// Mock the AuthRoles decorator to bypass authentication in tests
jest.mock('@app/common/decorators/auth-role.decorator', () => ({
  AuthRoles: (): MethodDecorator => (): void => {},
}));

describe('CategoryResolver', () => {
  let resolver: CategoryResolver;
  let mockCategoryService: jest.Mocked<CategoryService>;
  let getCategoriesSpy: jest.SpyInstance;

  const mockRootCategory: RootCategoryGraphQL = {
    id: 1,
    name: 'Beverages',
    parent: 'null',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockChildCategories: ChildCategoryGraphQL[] = [
    {
      id: 3,
      name: 'Soft Drinks',
      parent: '1',
      createdAt: new Date('2023-01-03'),
      updatedAt: new Date('2023-01-03'),
    },
  ];

  const mockCategoryGroupData: CategoryGroupGraphQL[] = [
    {
      rootCategory: mockRootCategory,
      childCategories: mockChildCategories,
    },
    {
      rootCategory: {
        id: 2,
        name: 'Food',
        parent: 'null',
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
      },
      childCategories: [],
    },
  ];

  const mockPaginationMeta: PaginationMeta = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 2,
    pageSize: 10,
    itemsOnPage: 2,
  };

  const mockCategoriesResponse: CategoriesType = {
    items: mockCategoryGroupData,
    paginations: mockPaginationMeta,
  };

  beforeEach(async (): Promise<void> => {
    const mockService = {
      getCategories: jest.fn(),
      createCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryResolver,
        {
          provide: CategoryService,
          useValue: mockService,
        },
      ],
    }).compile();

    resolver = module.get<CategoryResolver>(CategoryResolver);
    mockCategoryService = module.get(CategoryService);
    getCategoriesSpy = jest.spyOn(mockCategoryService, 'getCategories');

    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    const validPaginationArgs: PaginationArgs = {
      page: 1,
      pageSize: 10,
    };

    describe('Successful Scenarios', () => {
      it('should return categories with pagination successfully', async (): Promise<void> => {
        // Arrange
        mockCategoryService.getCategories.mockResolvedValue(mockCategoriesResponse);

        // Act
        const result = await resolver.getCategories({ page: 1, pageSize: 10 });

        // Assert
        expect(result).toEqual({
          items: mockCategoryGroupData,
          paginations: mockPaginationMeta,
        });
        expect(getCategoriesSpy).toHaveBeenCalledWith(validPaginationArgs);
        expect(getCategoriesSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle empty categories list', async (): Promise<void> => {
        // Arrange
        const emptyResult: CategoriesType = {
          items: [],
          paginations: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            pageSize: 10,
            itemsOnPage: 0,
          },
        };
        mockCategoryService.getCategories.mockResolvedValue(emptyResult);

        // Act
        const result = await resolver.getCategories({ page: 1, pageSize: 10 });

        // Assert
        expect(result).toEqual({
          items: [],
          paginations: emptyResult.paginations,
        });
      });

      it('should handle single category', async (): Promise<void> => {
        // Arrange
        const singleCategoryResult: CategoriesType = {
          items: [mockCategoryGroupData[0]],
          paginations: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            pageSize: 10,
            itemsOnPage: 1,
          },
        };
        mockCategoryService.getCategories.mockResolvedValue(singleCategoryResult);

        // Act
        const result = await resolver.getCategories({ page: 1, pageSize: 10 });

        // Assert
        expect(result).toEqual({
          items: [mockCategoryGroupData[0]],
          paginations: singleCategoryResult.paginations,
        });
      });

      it('should handle different pagination parameters', async (): Promise<void> => {
        // Arrange
        const customPaginationArgs: PaginationArgs = {
          page: 2,
          pageSize: 5,
        };
        const largePaginationResult: CategoriesType = {
          items: mockCategoryGroupData.slice(0, 1),
          paginations: {
            currentPage: 2,
            totalPages: 2,
            totalItems: 2,
            pageSize: 5,
            itemsOnPage: 1,
          },
        };
        mockCategoryService.getCategories.mockResolvedValue(largePaginationResult);

        // Act
        const result = await resolver.getCategories(customPaginationArgs);

        // Assert
        expect(result).toEqual(largePaginationResult);
        expect(getCategoriesSpy).toHaveBeenCalledWith(customPaginationArgs);
      });

      it('should handle categories with parent-child relationships', async (): Promise<void> => {
        // Arrange
        const hierarchicalCategoryGroups: CategoryGroupGraphQL[] = [
          {
            rootCategory: {
              id: 1,
              name: 'Beverages',
              parent: 'null',
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-01-01'),
            },
            childCategories: [
              {
                id: 2,
                name: 'Soft Drinks',
                parent: '1',
                createdAt: new Date('2023-01-02'),
                updatedAt: new Date('2023-01-02'),
              },
            ],
          },
        ];
        const hierarchicalResult: CategoriesType = {
          items: hierarchicalCategoryGroups,
          paginations: mockPaginationMeta,
        };
        mockCategoryService.getCategories.mockResolvedValue(hierarchicalResult);

        // Act
        const result = await resolver.getCategories({ page: 1, pageSize: 10 });

        // Assert
        expect(result.items).toHaveLength(1);
        expect(result.items![0].rootCategory.parent).toBe('null');
        expect(result.items![0].childCategories[0].parent).toBe('1');
      });
    });

    describe('Error Scenarios', () => {
      it('should handle service throwing BadRequestException', async (): Promise<void> => {
        // Arrange
        const errorMessage = 'Invalid pagination parameters';
        mockCategoryService.getCategories.mockRejectedValue(new BadRequestException(errorMessage));

        // Act & Assert
        await expect(resolver.getCategories(validPaginationArgs)).rejects.toThrow(
          BadRequestException,
        );
        expect(getCategoriesSpy).toHaveBeenCalledWith(validPaginationArgs);
      });

      it('should handle service throwing generic Error', async (): Promise<void> => {
        // Arrange
        const errorMessage = 'Database connection failed';
        mockCategoryService.getCategories.mockRejectedValue(new Error(errorMessage));

        // Act & Assert
        await expect(resolver.getCategories(validPaginationArgs)).rejects.toThrow(Error);
      });

      it('should handle service throwing unknown error', async (): Promise<void> => {
        // Arrange
        const unknownError = 'Unknown error occurred';
        mockCategoryService.getCategories.mockRejectedValue(unknownError);

        // Act & Assert
        await expect(resolver.getCategories(validPaginationArgs)).rejects.toBe(unknownError);
      });

      it('should handle service timeout error', async (): Promise<void> => {
        // Arrange
        const timeoutError = new Error('Service timeout');
        mockCategoryService.getCategories.mockRejectedValue(timeoutError);

        // Act & Assert
        await expect(resolver.getCategories(validPaginationArgs)).rejects.toThrow(
          'Service timeout',
        );
      });

      it('should handle microservice communication error', async (): Promise<void> => {
        // Arrange
        const microserviceError = new Error('Microservice unavailable');
        mockCategoryService.getCategories.mockRejectedValue(microserviceError);

        // Act & Assert
        await expect(resolver.getCategories(validPaginationArgs)).rejects.toThrow(
          'Microservice unavailable',
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large page numbers', async (): Promise<void> => {
        // Arrange
        const largePaginationArgs: PaginationArgs = {
          page: 999999,
          pageSize: 10,
        };
        const emptyResult: CategoriesType = {
          items: [],
          paginations: {
            currentPage: 999999,
            totalPages: 1,
            totalItems: 2,
            pageSize: 10,
            itemsOnPage: 0,
          },
        };
        mockCategoryService.getCategories.mockResolvedValue(emptyResult);

        // Act
        const result = await resolver.getCategories(largePaginationArgs);

        // Assert
        expect(result.items).toEqual([]);
        expect(result.paginations?.currentPage).toBe(999999);
      });

      it('should handle very large page sizes', async (): Promise<void> => {
        // Arrange
        const largePaginationArgs: PaginationArgs = {
          page: 1,
          pageSize: 1000,
        };
        const largePaginationResult: CategoriesType = {
          items: mockCategoryGroupData,
          paginations: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 2,
            pageSize: 1000,
            itemsOnPage: 2,
          },
        };
        mockCategoryService.getCategories.mockResolvedValue(largePaginationResult);

        // Act
        const result = await resolver.getCategories(largePaginationArgs);

        // Assert
        expect(result.paginations?.pageSize).toBe(1000);
        expect(result.items).toEqual(mockCategoryGroupData);
      });

      it('should handle categories with special characters in names', async (): Promise<void> => {
        // Arrange
        const specialCharCategoryGroups: CategoryGroupGraphQL[] = [
          {
            rootCategory: {
              id: 1,
              name: 'Café & Bistro',
              parent: 'null',
              createdAt: new Date('2024-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-01T00:00:00Z'),
            },
            childCategories: [
              {
                id: 2,
                name: 'Drinks (Hot & Cold)',
                parent: '1',
                createdAt: new Date('2024-01-02T00:00:00Z'),
                updatedAt: new Date('2024-01-02T00:00:00Z'),
              },
            ],
          },
        ];
        const specialCharResult: CategoriesType = {
          items: specialCharCategoryGroups,
          paginations: mockPaginationMeta,
        };
        mockCategoryService.getCategories.mockResolvedValue(specialCharResult);

        // Act
        const result = await resolver.getCategories({ page: 1, pageSize: 10 });

        // Assert
        expect(result.items).toEqual(specialCharCategoryGroups);
        expect(result.items![0].rootCategory.name).toBe('Café & Bistro');
        expect(result.items![0].childCategories[0].name).toBe('Drinks (Hot & Cold)');
      });

      it('should handle categories with very long names', async (): Promise<void> => {
        // Arrange
        const longNameCategoryGroup: CategoryGroupGraphQL = {
          rootCategory: {
            id: 1,
            name: 'A'.repeat(255),
            parent: 'null',
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
          },
          childCategories: [],
        };
        const longNameResult: CategoriesType = {
          items: [longNameCategoryGroup],
          paginations: mockPaginationMeta,
        };
        mockCategoryService.getCategories.mockResolvedValue(longNameResult);

        // Act
        const result = await resolver.getCategories({ page: 1, pageSize: 10 });

        // Assert
        expect(result.items).toHaveLength(1);
        expect(result.items![0].rootCategory.name).toBe('A'.repeat(255));
      });
    });

    describe('Method Verification', () => {
      it('should have correct method signature', (): void => {
        // Assert
        expect(typeof resolver.getCategories).toBe('function');
        expect(resolver.getCategories.length).toBe(1);
      });

      it('should return Promise with correct structure', async (): Promise<void> => {
        // Arrange
        mockCategoryService.getCategories.mockResolvedValue(mockCategoriesResponse);

        // Act
        const result = resolver.getCategories(validPaginationArgs);

        // Assert
        expect(result).toBeInstanceOf(Promise);
        const resolvedResult = await result;
        expect(Array.isArray(resolvedResult.items)).toBe(true);
        expect(typeof resolvedResult.paginations).toBe('object');
        expect(Array.isArray(resolvedResult.items)).toBe(true);
        expect(typeof resolvedResult.paginations?.currentPage).toBe('number');
        expect(typeof resolvedResult.paginations?.totalPages).toBe('number');
        expect(typeof resolvedResult.paginations?.totalItems).toBe('number');
        expect(typeof resolvedResult.paginations?.pageSize).toBe('number');
        expect(typeof resolvedResult.paginations?.itemsOnPage).toBe('number');
      });

      it('should call CategoryService.getCategories with correct parameters', async (): Promise<void> => {
        // Arrange
        mockCategoryService.getCategories.mockResolvedValue(mockCategoriesResponse);
        const testArgs: PaginationArgs = { page: 3, pageSize: 20 };

        // Act
        await resolver.getCategories(testArgs);

        // Assert
        expect(getCategoriesSpy).toHaveBeenCalledWith(testArgs);
        expect(getCategoriesSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('Response Structure Validation', () => {
      it('should return response with correct structure for success case', async (): Promise<void> => {
        // Arrange
        mockCategoryService.getCategories.mockResolvedValue(mockCategoriesResponse);

        // Act
        const result = await resolver.getCategories({ page: 1, pageSize: 10 });

        // Assert
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('paginations');
        expect(Array.isArray(result.items)).toBe(true);
      });

      it('should return categories with correct CategoryType structure', async (): Promise<void> => {
        // Arrange
        const largePaginationArgs: PaginationArgs = {
          page: 1,
          pageSize: 1000,
        };
        const largePaginationResult: CategoriesType = {
          items: mockCategoryGroupData,
          paginations: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 2,
            pageSize: 1000,
            itemsOnPage: 2,
          },
        };
        mockCategoryService.getCategories.mockResolvedValue(largePaginationResult);

        // Act
        const result = await resolver.getCategories(largePaginationArgs);

        // Assert
        result.items!.forEach((categoryGroup): void => {
          expect(categoryGroup).toHaveProperty('rootCategory');
          expect(categoryGroup).toHaveProperty('childCategories');
          expect(categoryGroup.rootCategory).toHaveProperty('id');
          expect(categoryGroup.rootCategory).toHaveProperty('name');
          expect(categoryGroup.rootCategory).toHaveProperty('createdAt');
          expect(categoryGroup.rootCategory).toHaveProperty('updatedAt');
          expect(typeof categoryGroup.rootCategory.id).toBe('number');
          expect(typeof categoryGroup.rootCategory.name).toBe('string');
          expect(categoryGroup.rootCategory.createdAt).toBeInstanceOf(Date);
          expect(categoryGroup.rootCategory.updatedAt).toBeInstanceOf(Date);
          expect(Array.isArray(categoryGroup.childCategories)).toBe(true);
        });
      });

      it('should return pagination with correct PaginationMeta structure', async (): Promise<void> => {
        // Arrange
        mockCategoryService.getCategories.mockResolvedValue(mockCategoriesResponse);

        // Act
        const result = await resolver.getCategories({ page: 1, pageSize: 10 });

        // Assert
        expect(result.paginations).toHaveProperty('currentPage');
        expect(result.paginations).toHaveProperty('totalPages');
        expect(result.paginations).toHaveProperty('totalItems');
        expect(result.paginations).toHaveProperty('pageSize');
        expect(result.paginations).toHaveProperty('itemsOnPage');
        expect(typeof result.paginations!.currentPage).toBe('number');
        expect(typeof result.paginations!.totalPages).toBe('number');
        expect(typeof result.paginations!.totalItems).toBe('number');
        expect(typeof result.paginations!.pageSize).toBe('number');
        expect(typeof result.paginations!.itemsOnPage).toBe('number');
      });
    });

    describe('Concurrent Requests', () => {
      it('should handle multiple concurrent getCategories calls', async (): Promise<void> => {
        // Arrange
        mockCategoryService.getCategories.mockResolvedValue(mockCategoriesResponse);
        const args1: PaginationArgs = { page: 1, pageSize: 10 };
        const args2: PaginationArgs = { page: 2, pageSize: 5 };
        const args3: PaginationArgs = { page: 1, pageSize: 20 };

        // Act
        const [result1, result2, result3] = await Promise.all([
          resolver.getCategories(args1),
          resolver.getCategories(args2),
          resolver.getCategories(args3),
        ]);

        // Assert
        expect(Array.isArray(result1.items)).toBe(true);
        expect(Array.isArray(result2.items)).toBe(true);
        expect(Array.isArray(result3.items)).toBe(true);
        expect(getCategoriesSpy).toHaveBeenCalledTimes(3);
        expect(getCategoriesSpy).toHaveBeenNthCalledWith(1, args1);
        expect(getCategoriesSpy).toHaveBeenNthCalledWith(2, args2);
        expect(getCategoriesSpy).toHaveBeenNthCalledWith(3, args3);
      });
    });
  });
});
