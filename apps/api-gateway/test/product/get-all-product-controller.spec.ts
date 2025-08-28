import { ProductController } from '../../src/product/admin/product.controller';
import { ProductService } from '../../src/product/admin/product.service';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { Decimal } from '@prisma/client/runtime/library';

describe('ProductController - getAll', () => {
  let controller: ProductController;
  let mockProductService: jest.Mocked<Pick<ProductService, 'getAll'>>;

  const mockProductResponse: ProductResponse = {
    id: 1,
    name: 'Test Product',
    skuId: 'TEST-001',
    description: 'Test description',
    status: StatusProduct.IN_STOCK,
    basePrice: new Decimal(100),
    quantity: 10,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockSuccessResponse: BaseResponse<ProductResponse[]> = {
    statusKey: StatusKey.SUCCESS,
    data: [mockProductResponse],
  };

  beforeEach(() => {
    mockProductService = {
      getAll: jest.fn(),
    } as jest.Mocked<Pick<ProductService, 'getAll'>>;
    controller = new ProductController(mockProductService as unknown as ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    const validQuery = { page: 1, limit: 10 };

    it('should return products successfully with valid query', async () => {
      // Arrange
      mockProductService.getAll.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.getAll(validQuery);

      // Assert
      expect(mockProductService.getAll).toHaveBeenCalledWith(validQuery);
      expect(mockProductService.getAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        id: mockProductResponse.id,
        name: mockProductResponse.name,
        skuId: mockProductResponse.skuId,
        status: mockProductResponse.status,
      });
    });

    it('should handle page parameter correctly', async () => {
      // Arrange
      const queryWithDifferentPage = { page: 2, limit: 5 };
      mockProductService.getAll.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.getAll(queryWithDifferentPage);

      // Assert
      expect(mockProductService.getAll).toHaveBeenCalledWith(queryWithDifferentPage);
    });

    it('should handle limit parameter correctly', async () => {
      // Arrange
      const queryWithDifferentLimit = { page: 1, limit: 20 };
      mockProductService.getAll.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.getAll(queryWithDifferentLimit);

      // Assert
      expect(mockProductService.getAll).toHaveBeenCalledWith(queryWithDifferentLimit);
    });

    it('should handle zero page parameter', async () => {
      // Arrange
      const queryWithZeroPage = { page: 0, limit: 10 };
      mockProductService.getAll.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.getAll(queryWithZeroPage);

      // Assert
      expect(mockProductService.getAll).toHaveBeenCalledWith(queryWithZeroPage);
    });

    it('should handle zero limit parameter', async () => {
      // Arrange
      const queryWithZeroLimit = { page: 1, limit: 0 };
      mockProductService.getAll.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.getAll(queryWithZeroLimit);

      // Assert
      expect(mockProductService.getAll).toHaveBeenCalledWith(queryWithZeroLimit);
    });

    it('should return empty array when no products found', async () => {
      // Arrange
      const expectedResponse: BaseResponse<ProductResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: [],
      };
      mockProductService.getAll.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.getAll(validQuery);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should propagate service errors', async () => {
      // Arrange
      const serviceError = new Error('Service error');
      mockProductService.getAll.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getAll(validQuery)).rejects.toThrow('Service error');
      expect(mockProductService.getAll).toHaveBeenCalledWith(validQuery);
    });

    it('should handle multiple products correctly', async () => {
      // Arrange
      const secondProduct: ProductResponse = {
        id: 2,
        name: 'Second Product',
        skuId: 'TEST-002',
        description: 'Second description',
        status: StatusProduct.SOLD_OUT,
        basePrice: new Decimal(200),
        quantity: 5,
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      const multipleProductsResponse: BaseResponse<ProductResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: [mockProductResponse, secondProduct],
      };

      mockProductService.getAll.mockResolvedValue(multipleProductsResponse);

      // Act
      const result = await controller.getAll(validQuery);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data![0].id).toBe(1);
      expect(result.data![1].id).toBe(2);
    });

    it('should handle negative page numbers', async () => {
      // Arrange
      const queryWithNegativePage = { page: -1, limit: 10 };
      mockProductService.getAll.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.getAll(queryWithNegativePage);

      // Assert
      expect(mockProductService.getAll).toHaveBeenCalledWith(queryWithNegativePage);
    });

    it('should handle negative limit numbers', async () => {
      // Arrange
      const queryWithNegativeLimit = { page: 1, limit: -5 };
      mockProductService.getAll.mockResolvedValue(mockSuccessResponse);

      // Act
      await controller.getAll(queryWithNegativeLimit);

      // Assert
      expect(mockProductService.getAll).toHaveBeenCalledWith(queryWithNegativeLimit);
    });
  });
});
