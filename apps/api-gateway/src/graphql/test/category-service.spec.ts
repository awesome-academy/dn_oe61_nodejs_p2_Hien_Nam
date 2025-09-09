import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { CategoryService } from '../services/category.service';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PRODUCT_SERVICE } from '@app/common';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { PaginationArgs } from '@app/common/types/graphql/arg-type/pagination.type';
import { CategoryGroupGraphQL, CategoryType } from '@app/common/types/graphql/caterories.type';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { I18nService } from 'nestjs-i18n';
import { GraphQLCateroryInput } from '@app/common/types/graphql/arg-type/create-category.type';

describe('CategoryService', () => {
  let service: CategoryService;
  let mockProductClient: jest.Mocked<ClientProxy>;
  let productClientSendSpy: jest.SpyInstance;

  const mockCategoryGroupData: CategoryGroupGraphQL[] = [
    {
      rootCategory: {
        id: 1,
        name: 'Beverages',
        parent: 'null',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
      childCategories: [
        {
          id: 3,
          name: 'Coffee',
          parent: '1',
          createdAt: new Date('2024-01-03T00:00:00Z'),
          updatedAt: new Date('2024-01-03T00:00:00Z'),
        },
      ],
    },
    {
      rootCategory: {
        id: 2,
        name: 'Food',
        parent: 'null',
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      },
      childCategories: [],
    },
  ];

  const mockPaginationResult: PaginationResult<CategoryGroupGraphQL> = {
    items: mockCategoryGroupData,
    paginations: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 2,
      pageSize: 10,
      itemsOnPage: 2,
    },
  };

  beforeEach(async (): Promise<void> => {
    const mockProductClientService = {
      send: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PRODUCT_SERVICE,
          useValue: mockProductClientService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockReturnValue('translated message'),
          },
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    mockProductClient = module.get(PRODUCT_SERVICE);
    productClientSendSpy = jest.spyOn(mockProductClient, 'send');

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
        productClientSendSpy.mockReturnValue(of(mockPaginationResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: mockCategoryGroupData,
          paginations: mockPaginationResult.paginations,
        });
        expect(productClientSendSpy).toHaveBeenCalledWith(
          ProductPattern.GET_ALL_CATERORY,
          validPaginationArgs,
        );
        expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle empty categories list', async (): Promise<void> => {
        // Arrange
        const emptyResult: PaginationResult<CategoryGroupGraphQL> = {
          items: [],
          paginations: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            pageSize: 10,
            itemsOnPage: 0,
          },
        };
        productClientSendSpy.mockReturnValue(of(emptyResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: [],
          paginations: emptyResult.paginations,
        });
        expect(result.items).toEqual([]);
        expect(result.paginations!.totalItems).toBe(0);
      });

      it('should handle single category', async (): Promise<void> => {
        // Arrange
        const singleCategoryResult: PaginationResult<CategoryGroupGraphQL> = {
          items: [mockCategoryGroupData[0]],
          paginations: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            pageSize: 10,
            itemsOnPage: 1,
          },
        };
        productClientSendSpy.mockReturnValue(of(singleCategoryResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: [mockCategoryGroupData[0]],
          paginations: singleCategoryResult.paginations,
        });
        expect(result.items!).toHaveLength(1);
        expect(result.items).toEqual([mockCategoryGroupData[0]]);
      });

      it('should handle different pagination parameters', async (): Promise<void> => {
        // Arrange
        const customPaginationArgs: PaginationArgs = {
          page: 2,
          pageSize: 5,
        };
        const customPaginationResult: PaginationResult<CategoryGroupGraphQL> = {
          items: mockCategoryGroupData.slice(0, 1),
          paginations: {
            currentPage: 2,
            totalPages: 2,
            totalItems: 3,
            pageSize: 5,
            itemsOnPage: 2,
          },
        };
        productClientSendSpy.mockReturnValue(of(customPaginationResult));

        // Act
        const result = await service.getCategories(customPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: customPaginationResult.items,
          paginations: customPaginationResult.paginations,
        });
        expect(productClientSendSpy).toHaveBeenCalledWith(
          ProductPattern.GET_ALL_CATERORY,
          customPaginationArgs,
        );
      });

      it('should handle categories with parent-child relationships', async (): Promise<void> => {
        // Arrange
        const mockCategoryGroupGraphQL1: CategoryGroupGraphQL = {
          rootCategory: {
            id: 1,
            name: 'Electronics',
            parent: 'root',
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-02'),
          },
          childCategories: [
            {
              id: 11,
              name: 'Smartphones',
              parent: 'Electronics',
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-01-02'),
            },
          ],
        };

        const mockCategoryGroupGraphQL2: CategoryGroupGraphQL = {
          rootCategory: {
            id: 2,
            name: 'Books',
            parent: 'root',
            createdAt: new Date('2023-02-01'),
            updatedAt: new Date('2023-02-02'),
          },
          childCategories: [
            {
              id: 21,
              name: 'Fiction',
              parent: 'Books',
              createdAt: new Date('2023-02-01'),
              updatedAt: new Date('2023-02-02'),
            },
          ],
        };

        const hierarchicalCategories: CategoryGroupGraphQL[] = [
          mockCategoryGroupGraphQL1,
          mockCategoryGroupGraphQL2,
        ];
        const hierarchicalResult: PaginationResult<CategoryGroupGraphQL> = {
          items: hierarchicalCategories,
          paginations: mockPaginationResult.paginations,
        };
        productClientSendSpy.mockReturnValue(of(hierarchicalResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: hierarchicalCategories,
          paginations: hierarchicalResult.paginations,
        });
        expect(result.items!).toHaveLength(2);
        expect(result.items![0]).toEqual(hierarchicalCategories[0]);
        expect(result.items![0].rootCategory.name).toBe('Electronics');
        expect(result.items![1].rootCategory.name).toBe('Books');
      });

      it('should handle large datasets with multiple pages', async (): Promise<void> => {
        // Arrange
        const largeDatasetResult: PaginationResult<CategoryGroupGraphQL> = {
          items: mockCategoryGroupData,
          paginations: {
            currentPage: 1,
            totalPages: 10,
            totalItems: 100,
            pageSize: 10,
            itemsOnPage: 10,
          },
        };
        productClientSendSpy.mockReturnValue(of(largeDatasetResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: largeDatasetResult.items,
          paginations: largeDatasetResult.paginations,
        });
        expect(result.paginations!.totalPages).toBe(10);
        expect(result.paginations!.totalItems).toBe(100);
      });
    });

    describe('Null/Undefined Result Handling', () => {
      it('should return default pagination when result is null', async (): Promise<void> => {
        // Arrange
        productClientSendSpy.mockReturnValue(of(null));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: [],
          paginations: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            pageSize: 10,
            itemsOnPage: 0,
          },
        });
        expect(productClientSendSpy).toHaveBeenCalledWith(
          ProductPattern.GET_ALL_CATERORY,
          validPaginationArgs,
        );
      });

      it('should return default pagination when result is undefined', async (): Promise<void> => {
        // Arrange
        productClientSendSpy.mockReturnValue(of(undefined));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: [],
          paginations: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            pageSize: 10,
            itemsOnPage: 0,
          },
        });
      });

      it('should use custom pageSize when provided in args', async (): Promise<void> => {
        // Arrange
        const customPageSizeArgs: PaginationArgs = {
          page: 1,
          pageSize: 20,
        };
        productClientSendSpy.mockReturnValue(of(null));

        // Act
        const result = await service.getCategories(customPageSizeArgs);

        // Assert
        expect(result.paginations!.pageSize).toBe(20);
        expect(result.paginations!.currentPage).toBe(1);
        expect(result.paginations!.totalPages).toBe(0);
        expect(result.paginations!.totalItems).toBe(0);
        expect(result.paginations!.itemsOnPage).toBe(0);
      });

      it('should use default pageSize when not provided in args', async (): Promise<void> => {
        // Arrange
        const argsWithoutPageSize: PaginationArgs = {
          page: 1,
        };
        productClientSendSpy.mockReturnValue(of(null));

        // Act
        const result = await service.getCategories(argsWithoutPageSize);

        // Assert
        expect(result.paginations!.pageSize).toBe(10);
      });
    });

    describe('Error Scenarios', () => {
      it('should handle microservice throwing BadRequestException', async (): Promise<void> => {
        // Arrange
        const errorMessage = 'Invalid pagination parameters';
        productClientSendSpy.mockReturnValue(
          throwError(() => new BadRequestException(errorMessage)),
        );

        // Act & Assert
        await expect(service.getCategories(validPaginationArgs)).rejects.toThrow(
          BadRequestException,
        );
        expect(productClientSendSpy).toHaveBeenCalledWith(
          ProductPattern.GET_ALL_CATERORY,
          validPaginationArgs,
        );
      });

      it('should handle microservice throwing generic Error', async (): Promise<void> => {
        // Arrange
        const errorMessage = 'Database connection failed';
        productClientSendSpy.mockReturnValue(throwError(() => new Error(errorMessage)));

        // Act & Assert
        await expect(service.getCategories(validPaginationArgs)).rejects.toThrow(Error);
      });

      it('should handle microservice timeout error', async (): Promise<void> => {
        // Arrange
        const timeoutError = new Error('Service timeout');
        productClientSendSpy.mockReturnValue(throwError(() => timeoutError));

        // Act & Assert
        await expect(service.getCategories(validPaginationArgs)).rejects.toThrow('Service timeout');
      });

      it('should handle microservice unavailable error', async (): Promise<void> => {
        // Arrange
        const unavailableError = new Error('Microservice unavailable');
        productClientSendSpy.mockReturnValue(throwError(() => unavailableError));

        // Act & Assert
        await expect(service.getCategories(validPaginationArgs)).rejects.toThrow(
          'Microservice unavailable',
        );
      });

      it('should handle unknown error types', async (): Promise<void> => {
        // Arrange
        const unknownError = 'Unknown error occurred';
        productClientSendSpy.mockReturnValue(throwError(() => unknownError));

        // Act & Assert
        await expect(service.getCategories(validPaginationArgs)).rejects.toBe(unknownError);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large page numbers', async (): Promise<void> => {
        // Arrange
        const largePaginationArgs: PaginationArgs = {
          page: 999999,
          pageSize: 10,
        };
        const emptyResult: PaginationResult<CategoryGroupGraphQL> = {
          items: [],
          paginations: {
            currentPage: 999999,
            totalPages: 1,
            totalItems: 3,
            pageSize: 10,
            itemsOnPage: 0,
          },
        };
        productClientSendSpy.mockReturnValue(of(emptyResult));

        // Act
        const result = await service.getCategories(largePaginationArgs);

        // Assert
        expect(result).toEqual({
          items: emptyResult.items,
          paginations: emptyResult.paginations,
        });
        expect(result.paginations!.currentPage).toBe(999999);
      });

      it('should handle very large page sizes', async (): Promise<void> => {
        // Arrange
        const largePaginationArgs: PaginationArgs = {
          page: 1,
          pageSize: 1000,
        };
        const largePageResult: PaginationResult<CategoryGroupGraphQL> = {
          items: mockCategoryGroupData,
          paginations: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 3,
            pageSize: 1000,
            itemsOnPage: 3,
          },
        };
        productClientSendSpy.mockReturnValue(of(largePageResult));

        // Act
        const result = await service.getCategories(largePaginationArgs);

        // Assert
        expect(result.paginations!.pageSize).toBe(1000);
        expect(result.items).toEqual(mockCategoryGroupData);
      });

      it('should handle categories with special characters in names', async (): Promise<void> => {
        // Arrange
        const specialCharCategories: CategoryGroupGraphQL[] = [
          {
            rootCategory: {
              id: 1,
              name: 'Café & Bistro',
              parent: 'root',
              createdAt: new Date('2024-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-01T00:00:00Z'),
            },
            childCategories: [
              {
                id: 11,
                name: 'Drinks (Hot & Cold)',
                parent: 'Café & Bistro',
                createdAt: new Date('2024-01-02T00:00:00Z'),
                updatedAt: new Date('2024-01-02T00:00:00Z'),
              },
            ],
          },
        ];
        const specialCharResult: PaginationResult<CategoryGroupGraphQL> = {
          items: specialCharCategories,
          paginations: mockPaginationResult.paginations,
        };
        productClientSendSpy.mockReturnValue(of(specialCharResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result.items).toEqual(specialCharCategories);
        expect(result.items![0].rootCategory.name).toBe('Café & Bistro');
        expect(result.items![0].childCategories[0].name).toBe('Drinks (Hot & Cold)');
      });

      it('should handle categories with very long names', async (): Promise<void> => {
        // Arrange
        const mixedCategories: CategoryGroupGraphQL[] = [
          {
            rootCategory: {
              id: 1,
              name: 'A'.repeat(255),
              parent: 'root',
              createdAt: new Date('2024-01-01T00:00:00Z'),
              updatedAt: new Date('2024-01-01T00:00:00Z'),
            },
            childCategories: [
              {
                id: 11,
                name: 'Short name',
                parent: 'A'.repeat(255),
                createdAt: new Date('2024-01-02T00:00:00Z'),
                updatedAt: new Date('2024-01-02T00:00:00Z'),
              },
            ],
          },
        ];
        const longNameResult: PaginationResult<CategoryGroupGraphQL> = {
          items: mixedCategories,
          paginations: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            pageSize: 10,
            itemsOnPage: 1,
          },
        };
        productClientSendSpy.mockReturnValue(of(longNameResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result.items![0].rootCategory.name).toHaveLength(255);
        expect(result.items![0].rootCategory.name).toBe('A'.repeat(255));
      });

      it('should handle zero page size gracefully', async (): Promise<void> => {
        // Arrange
        const zeroPageSizeArgs: PaginationArgs = {
          page: 1,
          pageSize: 0,
        };
        productClientSendSpy.mockReturnValue(of(null));

        // Act
        const result = await service.getCategories(zeroPageSizeArgs);

        // Assert
        expect(result.paginations!.pageSize).toBe(10); // Zero pageSize defaults to 10
        expect(result.items).toEqual([]);
      });
    });

    describe('Method Verification', () => {
      it('should have correct method signature', (): void => {
        // Assert
        expect(typeof service.getCategories).toBe('function');
        expect(service.getCategories.length).toBe(1);
      });

      it('should return Promise<PaginationResult<CategoryType>>', async (): Promise<void> => {
        // Arrange
        productClientSendSpy.mockReturnValue(of(mockPaginationResult));

        // Act
        const result = service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toBeInstanceOf(Promise);
        const resolvedResult = await result;
        expect(resolvedResult).toHaveProperty('items');
        expect(resolvedResult).toHaveProperty('paginations');
        expect(Array.isArray(resolvedResult.items)).toBe(true);
        expect(typeof resolvedResult.paginations!.currentPage).toBe('number');
        expect(typeof resolvedResult.paginations!.totalPages).toBe('number');
        expect(typeof resolvedResult.paginations!.totalItems).toBe('number');
        expect(typeof resolvedResult.paginations!.pageSize).toBe('number');
        expect(typeof resolvedResult.paginations!.itemsOnPage).toBe('number');
      });

      it('should call productClient.send with correct parameters', async (): Promise<void> => {
        // Arrange
        productClientSendSpy.mockReturnValue(of(mockPaginationResult));
        const testArgs: PaginationArgs = { page: 3, pageSize: 20 };

        // Act
        await service.getCategories(testArgs);

        // Assert
        expect(productClientSendSpy).toHaveBeenCalledWith(
          ProductPattern.GET_ALL_CATERORY,
          testArgs,
        );
        expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('Response Structure Validation', () => {
      it('should return response with correct PaginationResult structure', async (): Promise<void> => {
        // Arrange
        productClientSendSpy.mockReturnValue(of(mockPaginationResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('paginations');
        expect(Array.isArray(result.items)).toBe(true);
        expect(typeof result.paginations).toBe('object');
      });

      it('should return categories with correct CategoryType structure', async (): Promise<void> => {
        // Arrange
        productClientSendSpy.mockReturnValue(of(mockPaginationResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        result.items!.forEach((categoryGroup): void => {
          expect(categoryGroup).toHaveProperty('rootCategory');
          expect(categoryGroup).toHaveProperty('childCategories');
          expect(typeof categoryGroup.rootCategory.id).toBe('number');
          expect(typeof categoryGroup.rootCategory.name).toBe('string');
          expect(categoryGroup.rootCategory.createdAt).toBeInstanceOf(Date);
          expect(categoryGroup.rootCategory.updatedAt).toBeInstanceOf(Date);
          expect(Array.isArray(categoryGroup.childCategories)).toBe(true);
        });
      });

      it('should return pagination with correct structure', async (): Promise<void> => {
        // Arrange
        productClientSendSpy.mockReturnValue(of(mockPaginationResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result.paginations!).toHaveProperty('currentPage');
        expect(result.paginations!).toHaveProperty('totalPages');
        expect(result.paginations!).toHaveProperty('totalItems');
        expect(result.paginations!).toHaveProperty('pageSize');
        expect(result.paginations!).toHaveProperty('itemsOnPage');
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
        productClientSendSpy.mockReturnValue(of(mockPaginationResult));
        const args1: PaginationArgs = { page: 1, pageSize: 10 };
        const args2: PaginationArgs = { page: 2, pageSize: 5 };
        const args3: PaginationArgs = { page: 1, pageSize: 20 };

        // Act
        const [result1, result2, result3] = await Promise.all([
          service.getCategories(args1),
          service.getCategories(args2),
          service.getCategories(args3),
        ]);

        // Assert
        expect(result1).toEqual({
          items: mockPaginationResult.items,
          paginations: mockPaginationResult.paginations,
        });
        expect(result2).toEqual({
          items: mockPaginationResult.items,
          paginations: mockPaginationResult.paginations,
        });
        expect(result3).toEqual({
          items: mockPaginationResult.items,
          paginations: mockPaginationResult.paginations,
        });
        expect(productClientSendSpy).toHaveBeenCalledTimes(3);
        expect(productClientSendSpy).toHaveBeenNthCalledWith(
          1,
          ProductPattern.GET_ALL_CATERORY,
          args1,
        );
        expect(productClientSendSpy).toHaveBeenNthCalledWith(
          2,
          ProductPattern.GET_ALL_CATERORY,
          args2,
        );
        expect(productClientSendSpy).toHaveBeenNthCalledWith(
          3,
          ProductPattern.GET_ALL_CATERORY,
          args3,
        );
      });
    });

    describe('firstValueFrom Integration', () => {
      it('should properly handle Observable to Promise conversion', async (): Promise<void> => {
        // Arrange
        productClientSendSpy.mockReturnValue(of(mockPaginationResult));

        // Act
        const result = await service.getCategories(validPaginationArgs);

        // Assert
        expect(result).toEqual({
          items: mockPaginationResult.items,
          paginations: mockPaginationResult.paginations,
        });
        expect(productClientSendSpy).toHaveBeenCalledWith(
          ProductPattern.GET_ALL_CATERORY,
          validPaginationArgs,
        );
      });

      it('should handle Observable error properly', async (): Promise<void> => {
        // Arrange
        const observableError = new Error('Observable error');
        productClientSendSpy.mockReturnValue(throwError(() => observableError));

        // Act & Assert
        await expect(service.getCategories(validPaginationArgs)).rejects.toThrow(
          'Observable error',
        );
      });
    });
  });

  describe('createCategory', () => {
    const mockCategoryType: CategoryType = {
      id: 1,
      name: 'Test Category',
      parentId: '',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    };

    describe('Successful Scenarios', () => {
      it('should create category successfully with valid input', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'New Category',
          parentId: undefined,
        };
        productClientSendSpy.mockReturnValue(of(mockCategoryType));

        // Act
        const result = await service.createCategory(input);

        // Assert
        expect(result).toEqual(mockCategoryType);
        expect(productClientSendSpy).toHaveBeenCalledWith(ProductPattern.CREATE_CATEGORY, input);
        expect(productClientSendSpy).toHaveBeenCalledTimes(1);
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
        productClientSendSpy.mockReturnValue(of(rootCategory));

        // Act
        const result = await service.createCategory(input);

        // Assert
        expect(result).toEqual(rootCategory);
        expect(result.parentId).toBe('');
        expect(productClientSendSpy).toHaveBeenCalledWith(ProductPattern.CREATE_CATEGORY, input);
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
        productClientSendSpy.mockReturnValue(of(childCategory));

        // Act
        const result = await service.createCategory(input);

        // Assert
        expect(result).toEqual(childCategory);
        expect(result.parentId).toBe(1);
        expect(productClientSendSpy).toHaveBeenCalledWith(ProductPattern.CREATE_CATEGORY, input);
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
        productClientSendSpy.mockReturnValue(of(specialCharCategory));

        // Act
        const result = await service.createCategory(input);

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
        productClientSendSpy.mockReturnValue(of(longNameCategory));

        // Act
        const result = await service.createCategory(input);

        // Assert
        expect(result).toEqual(longNameCategory);
        expect(result.name).toHaveLength(255);
      });
    });

    describe('Error Scenarios', () => {
      it('should throw BadRequestException when result is null', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        productClientSendSpy.mockReturnValue(of(null));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow(BadRequestException);
        await expect(service.createCategory(input)).rejects.toThrow('translated message');
        expect(productClientSendSpy).toHaveBeenCalledWith(ProductPattern.CREATE_CATEGORY, input);
      });

      it('should throw BadRequestException when result is undefined', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        productClientSendSpy.mockReturnValue(of(undefined));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow(BadRequestException);
        await expect(service.createCategory(input)).rejects.toThrow('translated message');
      });

      it('should handle microservice communication error', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        const error = new Error('Microservice connection failed');
        productClientSendSpy.mockReturnValue(throwError(() => error));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow(
          'Microservice connection failed',
        );
      });

      it('should handle timeout error', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        const timeoutError = new Error('Request timeout');
        productClientSendSpy.mockReturnValue(throwError(() => timeoutError));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow('Request timeout');
      });

      it('should handle Observable error properly', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        const observableError = new Error('Observable error');
        productClientSendSpy.mockReturnValue(throwError(() => observableError));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow('Observable error');
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
        productClientSendSpy.mockReturnValue(of(zeroParentCategory));

        // Act
        const result = await service.createCategory(input);

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
        productClientSendSpy.mockReturnValue(of(negativeParentCategory));

        // Act
        const result = await service.createCategory(input);

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
        productClientSendSpy.mockReturnValue(of(largeParentCategory));

        // Act
        const result = await service.createCategory(input);

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
        productClientSendSpy.mockReturnValue(throwError(() => validationError));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow(BadRequestException);
        await expect(service.createCategory(input)).rejects.toThrow('Name cannot be empty');
      });

      it('should handle whitespace-only name', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: '   ',
          parentId: undefined,
        };
        const whitespaceError = new BadRequestException('Name cannot be whitespace only');
        productClientSendSpy.mockReturnValue(throwError(() => whitespaceError));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow(BadRequestException);
        await expect(service.createCategory(input)).rejects.toThrow(
          'Name cannot be whitespace only',
        );
      });
    });

    describe('Method Verification', () => {
      it('should have correct method signature', (): void => {
        // Assert
        expect(typeof service.createCategory).toBe('function');
      });

      it('should return Promise<CategoryType>', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        productClientSendSpy.mockReturnValue(of(mockCategoryType));

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
      });

      it('should call ProductClient.send with correct parameters', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: 5,
        };
        productClientSendSpy.mockReturnValue(of(mockCategoryType));

        // Act
        await service.createCategory(input);

        // Assert
        expect(productClientSendSpy).toHaveBeenCalledWith(ProductPattern.CREATE_CATEGORY, input);
        expect(productClientSendSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('Response Structure Validation', () => {
      it('should return response with correct CategoryType structure', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        productClientSendSpy.mockReturnValue(of(mockCategoryType));

        // Act
        const result = await service.createCategory(input);

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
        productClientSendSpy.mockReturnValue(of(mockCategoryType));

        // Act
        const result = await service.createCategory(input);

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

        productClientSendSpy
          .mockReturnValueOnce(of(response1))
          .mockReturnValueOnce(of(response2))
          .mockReturnValueOnce(of(response3));

        // Act
        const [result1, result2, result3] = await Promise.all([
          service.createCategory(input1),
          service.createCategory(input2),
          service.createCategory(input3),
        ]);

        // Assert
        expect(result1).toEqual(response1);
        expect(result2).toEqual(response2);
        expect(result3).toEqual(response3);
        expect(productClientSendSpy).toHaveBeenCalledTimes(3);
        expect(productClientSendSpy).toHaveBeenNthCalledWith(
          1,
          ProductPattern.CREATE_CATEGORY,
          input1,
        );
        expect(productClientSendSpy).toHaveBeenNthCalledWith(
          2,
          ProductPattern.CREATE_CATEGORY,
          input2,
        );
        expect(productClientSendSpy).toHaveBeenNthCalledWith(
          3,
          ProductPattern.CREATE_CATEGORY,
          input3,
        );
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
        productClientSendSpy.mockReturnValue(of(minimalCategory));

        // Act
        const result = await service.createCategory(input);

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
        productClientSendSpy.mockReturnValue(of(completeCategory));

        // Act
        const result = await service.createCategory(input);

        // Assert
        expect(result).toEqual(completeCategory);
        expect(result.name).toBe('Complete Category');
        expect(result.parentId).toBe(5);
      });
    });

    describe('I18n Service Integration', () => {
      it('should use I18nService for error messages', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        const mockI18nService = service['i18nService'] as jest.Mocked<I18nService>;
        const translateSpy = jest.spyOn(mockI18nService, 'translate');
        productClientSendSpy.mockReturnValue(of(null));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow(BadRequestException);
        expect(translateSpy).toHaveBeenCalledWith('common.category.action.createCategory.failed');
      });

      it('should handle I18nService error gracefully', async (): Promise<void> => {
        // Arrange
        const input: GraphQLCateroryInput = {
          name: 'Test Category',
          parentId: undefined,
        };
        const mockI18nService = service['i18nService'] as jest.Mocked<I18nService>;
        const translateSpy = jest.spyOn(mockI18nService, 'translate').mockImplementation(() => {
          throw new Error('I18n service error');
        });
        productClientSendSpy.mockReturnValue(of(null));

        // Act & Assert
        await expect(service.createCategory(input)).rejects.toThrow(Error);
        expect(translateSpy).toHaveBeenCalled();
      });
    });
  });
});
