import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from '../src/shared/pagination.shared';
import { PaginationParmas, PaginationResult } from '../src/interfaces/pagination';
import { PrismaModel } from '../src/types/prisma.type';

// Mock entity for testing
interface TestEntity {
  id: number;
  name: string;
  createdAt: Date;
}

describe('PaginationService', () => {
  let service: PaginationService;
  let mockPrismaModel: jest.Mocked<PrismaModel<TestEntity>>;
  let findManyMock: jest.MockedFunction<PrismaModel<TestEntity>['findMany']>;
  let countMock: jest.MockedFunction<PrismaModel<TestEntity>['count']>;

  const mockEntities: TestEntity[] = [
    { id: 1, name: 'Entity 1', createdAt: new Date('2024-01-01') },
    { id: 2, name: 'Entity 2', createdAt: new Date('2024-01-02') },
    { id: 3, name: 'Entity 3', createdAt: new Date('2024-01-03') },
    { id: 4, name: 'Entity 4', createdAt: new Date('2024-01-04') },
    { id: 5, name: 'Entity 5', createdAt: new Date('2024-01-05') },
  ];

  beforeEach(async () => {
    // Create mock Prisma model with proper Jest mock functions
    findManyMock = jest.fn();
    countMock = jest.fn();

    mockPrismaModel = {
      findMany: findManyMock,
      count: countMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationService],
    }).compile();

    service = module.get<PaginationService>(PaginationService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('queryWithPagination', () => {
    describe('Default Parameters', () => {
      it('should use default page (1) when page is not provided', async () => {
        // Arrange
        const options: PaginationParmas = {};
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 0,
          take: 50,
        });
        expect(result.paginations.currentPage).toBe(1);
      });

      it('should use default pageSize (50) when pageSize is not provided', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1 };
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 0,
          take: 50,
        });
        expect(result.paginations.pageSize).toBe(50);
      });

      it('should use default values when both page and pageSize are not provided', async () => {
        // Arrange
        const options: PaginationParmas = {};
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.currentPage).toBe(1);
        expect(result.paginations.pageSize).toBe(50);
      });
    });

    describe('Edge Cases - Invalid Values', () => {
      it('should use default page when page is zero', async () => {
        // Arrange
        const options: PaginationParmas = { page: 0, pageSize: 10 };
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.currentPage).toBe(1);
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 0,
          take: 10,
        });
      });

      it('should use default page when page is negative', async () => {
        // Arrange
        const options: PaginationParmas = { page: -5, pageSize: 10 };
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.currentPage).toBe(1);
      });

      it('should use default pageSize when pageSize is zero', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 0 };
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.pageSize).toBe(50);
      });

      it('should use default pageSize when pageSize is negative', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: -10 };
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.pageSize).toBe(50);
      });

      it('should limit pageSize to maxPageSize (50) when pageSize exceeds limit', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 100 };
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.pageSize).toBe(50);
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 0,
          take: 50,
        });
      });
    });

    describe('Pagination Calculations', () => {
      it('should calculate correct skip and take for page 2', async () => {
        // Arrange
        const options: PaginationParmas = { page: 2, pageSize: 10 };
        const findOptions = {};
        countMock.mockResolvedValue(100);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 10,
          take: 10,
        });
      });

      it('should calculate correct skip and take for page 5 with pageSize 20', async () => {
        // Arrange
        const options: PaginationParmas = { page: 5, pageSize: 20 };
        const findOptions = {};
        countMock.mockResolvedValue(200);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 80,
          take: 20,
        });
      });

      it('should calculate totalPages correctly', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const findOptions = {};
        countMock.mockResolvedValue(95);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.totalPages).toBe(10); // Math.ceil(95/10) = 10
        expect(result.paginations.totalItems).toBe(95);
      });

      it('should ensure totalPages is at least 1 when totalItems is 0', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const findOptions = {};
        countMock.mockResolvedValue(0);
        findManyMock.mockResolvedValue([]);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.totalPages).toBe(1);
        expect(result.paginations.totalItems).toBe(0);
        expect(result.items).toEqual([]);
      });

      it('should clamp page to totalPages when page exceeds totalPages', async () => {
        // Arrange
        const options: PaginationParmas = { page: 20, pageSize: 10 };
        const findOptions = {};
        countMock.mockResolvedValue(25); // totalPages = 3
        findManyMock.mockResolvedValue(mockEntities.slice(0, 5));

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.currentPage).toBe(3); // Clamped to totalPages
        expect(result.paginations.totalPages).toBe(3);
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 20, // (3-1) * 10
          take: 10,
        });
      });
    });

    describe('Prisma Model Interactions', () => {
      it('should call count without where clause when findOptions has no where', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const findOptions = { orderBy: { id: 'asc' } };
        countMock.mockResolvedValue(50);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(countMock).toHaveBeenCalledWith({
          where: undefined,
        });
      });

      it('should call count with where clause when findOptions has where', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const whereClause = { name: { contains: 'test' } };
        const findOptions = { where: whereClause, orderBy: { id: 'asc' } };
        countMock.mockResolvedValue(25);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(countMock).toHaveBeenCalledWith({
          where: whereClause,
        });
      });

      it('should call findMany with correct parameters including findOptions', async () => {
        // Arrange
        const options: PaginationParmas = { page: 2, pageSize: 5 };
        const findOptions = {
          where: { name: { contains: 'test' } },
          orderBy: { createdAt: 'desc' },
          include: { relations: true },
        };
        countMock.mockResolvedValue(20);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 5,
          take: 5,
          where: { name: { contains: 'test' } },
          orderBy: { createdAt: 'desc' },
          include: { relations: true },
        });
      });

      it('should preserve all findOptions properties in findMany call', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const findOptions = {
          select: { id: true, name: true },
          orderBy: [{ name: 'asc' }, { id: 'desc' }],
          distinct: ['name'],
        };
        countMock.mockResolvedValue(30);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 0,
          take: 10,
          select: { id: true, name: true },
          orderBy: [{ name: 'asc' }, { id: 'desc' }],
          distinct: ['name'],
        });
      });
    });

    describe('Return Value Structure', () => {
      it('should return correct PaginationResult structure', async () => {
        // Arrange
        const options: PaginationParmas = { page: 2, pageSize: 3 };
        const findOptions = {};
        const returnedItems = mockEntities.slice(0, 3);
        countMock.mockResolvedValue(10);
        findManyMock.mockResolvedValue(returnedItems);

        // Act
        const result: PaginationResult<TestEntity> = await service.queryWithPagination(
          mockPrismaModel,
          options,
          findOptions,
        );

        // Assert
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('paginations');
        expect(result.items).toEqual(returnedItems);
        expect(result.paginations).toEqual({
          currentPage: 2,
          totalPages: 4, // Math.ceil(10/3)
          pageSize: 3,
          totalItems: 10,
          itemsOnPage: 3,
        });
      });

      it('should return correct itemsOnPage when fewer items than pageSize', async () => {
        // Arrange
        const options: PaginationParmas = { page: 3, pageSize: 10 };
        const findOptions = {};
        const returnedItems = mockEntities.slice(0, 2); // Only 2 items returned
        countMock.mockResolvedValue(22);
        findManyMock.mockResolvedValue(returnedItems);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.itemsOnPage).toBe(2);
        expect(result.paginations.pageSize).toBe(10);
        expect(result.items).toHaveLength(2);
      });

      it('should return empty items array when no results found', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const findOptions = {};
        countMock.mockResolvedValue(0);
        findManyMock.mockResolvedValue([]);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.items).toEqual([]);
        expect(result.paginations.itemsOnPage).toBe(0);
        expect(result.paginations.totalItems).toBe(0);
        expect(result.paginations.totalPages).toBe(1);
      });
    });

    describe('Type Safety', () => {
      it('should maintain type safety for generic entity type', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 5 };
        const findOptions = {};
        countMock.mockResolvedValue(5);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.items).toEqual(mockEntities);
        // Type check - these should not cause TypeScript errors
        const firstItem = result.items[0];
        if (firstItem) {
          expect(typeof firstItem.id).toBe('number');
          expect(typeof firstItem.name).toBe('string');
          expect(firstItem.createdAt).toBeInstanceOf(Date);
        }
      });

      it('should work with different entity types', async () => {
        // Arrange
        interface DifferentEntity {
          uuid: string;
          title: string;
          active: boolean;
        }

        const mockDifferentModel = {
          findMany: jest.fn(),
          count: jest.fn(),
        } as jest.Mocked<PrismaModel<DifferentEntity>>;

        const differentEntities: DifferentEntity[] = [
          { uuid: 'uuid-1', title: 'Title 1', active: true },
          { uuid: 'uuid-2', title: 'Title 2', active: false },
        ];

        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const findOptions = {};
        mockDifferentModel.count.mockResolvedValue(2);
        mockDifferentModel.findMany.mockResolvedValue(differentEntities);

        // Act
        const result = await service.queryWithPagination(mockDifferentModel, options, findOptions);

        // Assert
        expect(result.items).toEqual(differentEntities);
        const firstItem = result.items[0];
        if (firstItem) {
          expect(typeof firstItem.uuid).toBe('string');
          expect(typeof firstItem.title).toBe('string');
          expect(typeof firstItem.active).toBe('boolean');
        }
      });
    });

    describe('Error Handling', () => {
      it('should propagate count method errors', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const findOptions = {};
        const countError = new Error('Database connection failed');
        countMock.mockRejectedValue(countError);

        // Act & Assert
        await expect(
          service.queryWithPagination(mockPrismaModel, options, findOptions),
        ).rejects.toThrow('Database connection failed');
      });

      it('should propagate findMany method errors', async () => {
        // Arrange
        const options: PaginationParmas = { page: 1, pageSize: 10 };
        const findOptions = {};
        const findManyError = new Error('Query timeout');
        countMock.mockResolvedValue(50);
        findManyMock.mockRejectedValue(findManyError);

        // Act & Assert
        await expect(
          service.queryWithPagination(mockPrismaModel, options, findOptions),
        ).rejects.toThrow('Query timeout');
      });
    });

    describe('Complex Scenarios', () => {
      it('should handle large datasets correctly', async () => {
        // Arrange
        const options: PaginationParmas = { page: 100, pageSize: 50 };
        const findOptions = {};
        countMock.mockResolvedValue(10000);
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.totalPages).toBe(200); // 10000/50
        expect(result.paginations.currentPage).toBe(100);
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 4950, // (100-1) * 50
          take: 50,
        });
      });

      it('should handle single item per page', async () => {
        // Arrange
        const options: PaginationParmas = { page: 3, pageSize: 1 };
        const findOptions = {};
        countMock.mockResolvedValue(5);
        findManyMock.mockResolvedValue([mockEntities[2]]);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.totalPages).toBe(5);
        expect(result.paginations.currentPage).toBe(3);
        expect(result.paginations.itemsOnPage).toBe(1);
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 2, // (3-1) * 1
          take: 1,
        });
      });

      it('should handle exact page boundary', async () => {
        // Arrange
        const options: PaginationParmas = { page: 5, pageSize: 20 };
        const findOptions = {};
        countMock.mockResolvedValue(100); // Exactly 5 pages
        findManyMock.mockResolvedValue(mockEntities);

        // Act
        const result = await service.queryWithPagination(mockPrismaModel, options, findOptions);

        // Assert
        expect(result.paginations.totalPages).toBe(5);
        expect(result.paginations.currentPage).toBe(5);
        expect(findManyMock).toHaveBeenCalledWith({
          skip: 80, // (5-1) * 20
          take: 20,
        });
      });
    });
  });
});
