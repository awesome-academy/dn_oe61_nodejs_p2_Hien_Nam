import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ProductController } from '../../src/product/admin/product.controller';
import { ProductService } from '../../src/product/admin/product.service';
import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { StatusKey } from '@app/common/enums/status-key.enum';

describe('ProductController - deleteProductImages', () => {
  let controller: ProductController;
  let moduleRef: TestingModule;

  const mockProductService = {
    deleteProductImages: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn().mockReturnValue('Mock translation'),
  };

  const mockReflector = {
    get: jest.fn(),
    getAll: jest.fn(),
    getAllAndMerge: jest.fn(),
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = moduleRef.get<ProductController>(ProductController);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('deleteProductImages', () => {
    const mockDeleteProductImagesDto: DeleteProductImagesDto = {
      productImageIds: [1, 2, 3],
    };

    const mockProductImagesResponse: ProductImagesResponse[] = [
      {
        id: 1,
        url: 'https://example.com/image1.jpg',
        productId: 100,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        deletedAt: new Date('2023-01-03'),
      },
      {
        id: 2,
        url: 'https://example.com/image2.jpg',
        productId: 100,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        deletedAt: new Date('2023-01-03'),
      },
      {
        id: 3,
        url: 'https://example.com/image3.jpg',
        productId: 100,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        deletedAt: new Date('2023-01-03'),
      },
    ];

    const mockSuccessResponse: BaseResponse<ProductImagesResponse[]> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductImagesResponse,
    };

    it('should successfully delete multiple product images', async () => {
      // Arrange
      mockProductService.deleteProductImages.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(
        mockDeleteProductImagesDto,
      );
      expect(mockProductService.deleteProductImages).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.data).toHaveLength(3);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should successfully delete single product image', async () => {
      // Arrange
      const singleImageDto: DeleteProductImagesDto = {
        productImageIds: [1],
      };
      const singleImageResponse: BaseResponse<ProductImagesResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: [mockProductImagesResponse[0]],
      };
      mockProductService.deleteProductImages.mockResolvedValue(singleImageResponse);

      // Act
      const result = await controller.deleteProductImages(singleImageDto);

      // Assert
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(singleImageDto);
      expect(mockProductService.deleteProductImages).toHaveBeenCalledTimes(1);
      expect(result).toEqual(singleImageResponse);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.id).toBe(1);
    });

    it('should return empty array when no images to delete', async () => {
      // Arrange
      const emptyResponse: BaseResponse<ProductImagesResponse[] | []> = {
        statusKey: StatusKey.SUCCESS,
        data: [],
      };
      mockProductService.deleteProductImages.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(
        mockDeleteProductImagesDto,
      );
      expect(result).toEqual(emptyResponse);
      expect(result.data).toEqual([]);
    });

    it('should handle empty productImageIds array', async () => {
      // Arrange
      const emptyDto: DeleteProductImagesDto = {
        productImageIds: [],
      };
      const emptyResponse: BaseResponse<ProductImagesResponse[] | []> = {
        statusKey: StatusKey.SUCCESS,
        data: [],
      };
      mockProductService.deleteProductImages.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.deleteProductImages(emptyDto);

      // Assert
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(emptyDto);
      expect(result.data).toEqual([]);
    });

    it('should propagate BadRequestException when product images not found', async () => {
      // Arrange
      const error = new BadRequestException('Product images not found');
      mockProductService.deleteProductImages.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        'Product images not found',
      );
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(
        mockDeleteProductImagesDto,
      );
    });

    it('should propagate BadRequestException when product not found', async () => {
      // Arrange
      const error = new BadRequestException('Product not found');
      mockProductService.deleteProductImages.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should handle service throwing generic error', async () => {
      // Arrange
      const error = new Error('Internal server error');
      mockProductService.deleteProductImages.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        'Internal server error',
      );
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(
        mockDeleteProductImagesDto,
      );
    });

    it('should handle large number of product image IDs', async () => {
      // Arrange
      const largeDto: DeleteProductImagesDto = {
        productImageIds: Array.from({ length: 50 }, (_, i) => i + 1),
      };
      const largeResponse: BaseResponse<ProductImagesResponse[]> = {
        statusKey: StatusKey.SUCCESS,
        data: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          url: `https://example.com/image${i + 1}.jpg`,
          productId: 100,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02'),
          deletedAt: new Date('2023-01-03'),
        })),
      };
      mockProductService.deleteProductImages.mockResolvedValue(largeResponse);

      // Act
      const result = await controller.deleteProductImages(largeDto);

      // Assert
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(largeDto);
      expect(result.data).toHaveLength(50);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });

    it('should handle duplicate product image IDs', async () => {
      // Arrange
      const duplicateDto: DeleteProductImagesDto = {
        productImageIds: [1, 1, 2, 2, 3],
      };
      mockProductService.deleteProductImages.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.deleteProductImages(duplicateDto);

      // Assert
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(duplicateDto);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should verify method signature and return type', async () => {
      // Arrange
      mockProductService.deleteProductImages.mockResolvedValue(mockSuccessResponse);

      // Act
      const result = await controller.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(typeof controller.deleteProductImages).toBe('function');
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);

      // Verify return type structure matches Promise<BaseResponse<ProductImagesResponse[] | []>>
      expect(result.statusKey).toBeDefined();
      expect(typeof result.statusKey).toBe('string');
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);

      // Verify ProductImagesResponse structure when data is not empty
      if (result.data && result.data.length > 0) {
        const firstImage = result.data[0];
        expect(firstImage).toHaveProperty('id');
        expect(firstImage).toHaveProperty('url');
        expect(firstImage).toHaveProperty('productId');
        expect(firstImage).toHaveProperty('createdAt');
        expect(firstImage).toHaveProperty('updatedAt');
        expect(firstImage).toHaveProperty('deletedAt');
        expect(typeof firstImage.id).toBe('number');
        expect(typeof firstImage.url).toBe('string');
        expect(typeof firstImage.productId).toBe('number');
        expect(firstImage.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should verify return type for empty array scenario', async () => {
      // Arrange
      const emptyResponse: BaseResponse<ProductImagesResponse[] | []> = {
        statusKey: StatusKey.SUCCESS,
        data: [],
      };
      mockProductService.deleteProductImages.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.deleteProductImages(mockDeleteProductImagesDto);

      // Assert
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);

      // Verify the return type matches Promise<BaseResponse<ProductImagesResponse[] | []>>
      expect(typeof result.statusKey).toBe('string');
      expect(result.data).toHaveLength(0);
    });

    it('should handle negative product image IDs', async () => {
      // Arrange
      const negativeDto: DeleteProductImagesDto = {
        productImageIds: [-1, -2, 0],
      };
      const error = new BadRequestException('Invalid product image IDs');
      mockProductService.deleteProductImages.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteProductImages(negativeDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(negativeDto);
    });

    it('should handle very large product image IDs', async () => {
      // Arrange
      const largeIdDto: DeleteProductImagesDto = {
        productImageIds: [999999999, 888888888],
      };
      const error = new BadRequestException('Product images not found');
      mockProductService.deleteProductImages.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteProductImages(largeIdDto)).rejects.toThrow(BadRequestException);
      expect(mockProductService.deleteProductImages).toHaveBeenCalledWith(largeIdDto);
    });
  });
});
