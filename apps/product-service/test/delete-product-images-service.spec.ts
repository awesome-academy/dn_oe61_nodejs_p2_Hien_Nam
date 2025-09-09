import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { PrismaService } from '@app/prisma';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../src/product-service.service';

interface MockProductImage {
  id: number;
  url: string;
  productId: number;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface MockPrismaTransactionForDeleteImages {
  productImage: {
    findMany: jest.MockedFunction<
      (args: { where: { id: { in: number[] }; deletedAt: null } }) => Promise<MockProductImage[]>
    >;
    updateMany: jest.MockedFunction<
      (args: {
        data: { deletedAt: Date };
        where: { id: { in: number[] } };
      }) => Promise<{ count: number }>
    >;
  };
}

type DeleteImagesTransactionCallback = (
  prisma: MockPrismaTransactionForDeleteImages,
) => Promise<ProductImagesResponse[]>;

describe('ProductService - deleteProductImages', () => {
  let service: ProductService;

  const mockPrismaService = {
    client: {
      $transaction: jest.fn() as jest.MockedFunction<
        (callback: DeleteImagesTransactionCallback) => Promise<ProductImagesResponse[]>
      >,
    },
  };

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  const mockPaginationService = {
    queryWithPagination: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteProductImages', () => {
    const mockDeleteProductImagesDto: DeleteProductImagesDto = {
      productImageIds: [1, 2, 3],
    };

    const mockExistingImages: MockProductImage[] = [
      {
        id: 1,
        url: 'https://example.com/image1.jpg',
        productId: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: null,
      },
      {
        id: 2,
        url: 'https://example.com/image2.jpg',
        productId: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: null,
        deletedAt: null,
      },
      {
        id: 3,
        url: 'https://example.com/image3.jpg',
        productId: 11,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-03T00:00:00Z'),
        deletedAt: null,
      },
    ];

    const mockUpdatedImages: MockProductImage[] = [
      {
        id: 1,
        url: 'https://example.com/image1.jpg',
        productId: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: 2,
        url: 'https://example.com/image2.jpg',
        productId: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        deletedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: 3,
        url: 'https://example.com/image3.jpg',
        productId: 11,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-03T00:00:00Z'),
        deletedAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];

    const expectedResponse: ProductImagesResponse[] = [
      {
        id: 1,
        url: 'https://example.com/image1.jpg',
        productId: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: 2,
        url: 'https://example.com/image2.jpg',
        productId: 10,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        deletedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: 3,
        url: 'https://example.com/image3.jpg',
        productId: 11,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-03T00:00:00Z'),
        deletedAt: new Date('2024-01-15T10:30:00Z'),
      },
    ];

    it('should successfully delete multiple product images', async () => {
      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockResolvedValueOnce(mockExistingImages) // First call for existence check
                .mockResolvedValueOnce(mockUpdatedImages), // Second call for updated images
              updateMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const result = await service.deleteProductImages(mockDeleteProductImagesDto);

      expect(result).toEqual(expectedResponse);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should successfully delete a single product image', async () => {
      const singleImageDto: DeleteProductImagesDto = {
        productImageIds: [1],
      };

      const singleExistingImage = [mockExistingImages[0]];
      const singleUpdatedImage = [mockUpdatedImages[0]];
      const singleExpectedResponse = [expectedResponse[0]];

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockResolvedValueOnce(singleExistingImage)
                .mockResolvedValueOnce(singleUpdatedImage),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const result = await service.deleteProductImages(singleImageDto);

      expect(result).toEqual(singleExpectedResponse);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should throw TypedRpcException when some product images are not found', async () => {
      const partialExistingImages = [mockExistingImages[0], mockExistingImages[1]]; // Missing image with id 3

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest.fn().mockResolvedValueOnce(partialExistingImages),
              updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        TypedRpcException,
      );

      try {
        await service.deleteProductImages(mockDeleteProductImagesDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorData = typedError.getError();
        expect(errorData.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorData.message).toBe('common.product.productImages.error.productImagesNotFound');
      }

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should throw TypedRpcException when no product images are found', async () => {
      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest.fn().mockResolvedValueOnce([]), // No images found
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        TypedRpcException,
      );

      try {
        await service.deleteProductImages(mockDeleteProductImagesDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorData = typedError.getError();
        expect(errorData.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorData.message).toBe('common.product.productImages.error.productImagesNotFound');
      }

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle empty productImageIds array', async () => {
      const emptyDto: DeleteProductImagesDto = {
        productImageIds: [],
      };

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest.fn().mockResolvedValueOnce([]), // First call for existence check
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.deleteProductImages(emptyDto)).rejects.toThrow(TypeError);

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle database transaction failure during findMany operation', async () => {
      const databaseError = new Error('Database connection failed');

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest.fn().mockRejectedValue(databaseError),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        databaseError,
      );

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle database transaction failure during updateMany operation', async () => {
      const updateError = new Error('Update operation failed');

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest.fn().mockResolvedValueOnce(mockExistingImages),
              updateMany: jest.fn().mockRejectedValue(updateError),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        updateError,
      );

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle database transaction failure during final findMany operation', async () => {
      const finalFindError = new Error('Final find operation failed');

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockResolvedValueOnce(mockExistingImages) // First call succeeds
                .mockRejectedValue(finalFindError), // Second call fails
              updateMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        finalFindError,
      );

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle transaction callback failure', async () => {
      const transactionError = new Error('Transaction callback failed');

      mockPrismaService.client.$transaction.mockRejectedValue(transactionError);

      await expect(service.deleteProductImages(mockDeleteProductImagesDto)).rejects.toThrow(
        transactionError,
      );

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle large number of product image IDs', async () => {
      const largeIdArray = Array.from({ length: 100 }, (_, i) => i + 1);
      const largeDto: DeleteProductImagesDto = {
        productImageIds: largeIdArray,
      };

      const largeMockExistingImages = largeIdArray.map((id) => ({
        id,
        url: `https://example.com/image${id}.jpg`,
        productId: Math.floor(id / 10) + 1,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        deletedAt: null,
      }));

      const largeMockUpdatedImages = largeMockExistingImages.map((img) => ({
        ...img,
        deletedAt: new Date('2024-01-15T10:30:00Z'),
      }));

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockResolvedValueOnce(largeMockExistingImages)
                .mockResolvedValueOnce(largeMockUpdatedImages),
              updateMany: jest.fn().mockResolvedValue({ count: 100 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const result = await service.deleteProductImages(largeDto);

      expect(result).toHaveLength(100);
      expect(result[0].id).toBe(1);
      expect(result[0].url).toBe('https://example.com/image1.jpg');
      expect(result[0].productId).toBe(1);
      expect(typeof result[0].deletedAt === 'string' || result[0].deletedAt instanceof Date).toBe(
        true,
      );
      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle duplicate product image IDs', async () => {
      const duplicateDto: DeleteProductImagesDto = {
        productImageIds: [1, 1, 2, 2, 3],
      };

      // Prisma's `in` operator automatically handles duplicates, so we expect normal behavior
      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockResolvedValueOnce(mockExistingImages)
                .mockResolvedValueOnce(mockUpdatedImages),
              updateMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const result = await service.deleteProductImages(duplicateDto);

      expect(result).toEqual(expectedResponse);
      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle negative product image IDs', async () => {
      const negativeDto: DeleteProductImagesDto = {
        productImageIds: [-1, -2, 0],
      };

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest.fn().mockResolvedValueOnce([]), // No images found with negative IDs
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.deleteProductImages(negativeDto)).rejects.toThrow(TypedRpcException);

      try {
        await service.deleteProductImages(negativeDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorData = typedError.getError();
        expect(errorData.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorData.message).toBe('common.product.productImages.error.productImagesNotFound');
      }

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle very large product image IDs', async () => {
      const largeIdDto: DeleteProductImagesDto = {
        productImageIds: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1],
      };

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest.fn().mockResolvedValueOnce([]), // No images found with very large IDs
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      await expect(service.deleteProductImages(largeIdDto)).rejects.toThrow(TypedRpcException);

      try {
        await service.deleteProductImages(largeIdDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const typedError = error as TypedRpcException;
        const errorData = typedError.getError();
        expect(errorData.code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
        expect(errorData.message).toBe('common.product.productImages.error.productImagesNotFound');
      }

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should correctly map product image properties including null values', async () => {
      const imagesWithNullValues: MockProductImage[] = [
        {
          id: 1,
          url: 'https://example.com/image1.jpg',
          productId: 10,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: null, // null updatedAt
          deletedAt: null,
        },
      ];

      const updatedImagesWithNullValues: MockProductImage[] = [
        {
          id: 1,
          url: 'https://example.com/image1.jpg',
          productId: 10,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: null, // Still null
          deletedAt: new Date('2024-01-15T10:30:00Z'),
        },
      ];

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockResolvedValueOnce(imagesWithNullValues)
                .mockResolvedValueOnce(updatedImagesWithNullValues),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const singleImageDto: DeleteProductImagesDto = {
        productImageIds: [1],
      };

      const result = await service.deleteProductImages(singleImageDto);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].url).toBe('https://example.com/image1.jpg');
      expect(result[0].createdAt instanceof Date).toBe(true);
      expect(result[0].updatedAt === null || result[0].updatedAt instanceof Date).toBe(true);
      expect(result[0].deletedAt === null || result[0].deletedAt instanceof Date).toBe(true);

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should verify correct parameters are passed to Prisma operations', async () => {
      const capturedFindManyArgs: { where: { id: { in: number[] }; deletedAt?: null } }[] = [];
      let capturedUpdateManyArgs:
        | { data: { deletedAt: Date }; where: { id: { in: number[] } } }
        | undefined;

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockImplementation(
                  (args: { where: { id: { in: number[] }; deletedAt?: null } }) => {
                    capturedFindManyArgs.push(args);
                    if (capturedFindManyArgs.length === 1) {
                      return Promise.resolve(mockExistingImages);
                    }
                    return Promise.resolve(mockUpdatedImages);
                  },
                ),
              updateMany: jest
                .fn()
                .mockImplementation(
                  (args: { data: { deletedAt: Date }; where: { id: { in: number[] } } }) => {
                    capturedUpdateManyArgs = args;
                    return Promise.resolve({ count: 3 });
                  },
                ),
            },
          };
          return await callback(prismaMock);
        },
      );

      await service.deleteProductImages(mockDeleteProductImagesDto);

      // Verify first findMany call (existence check)
      expect(capturedFindManyArgs[0]).toEqual({
        where: { id: { in: [1, 2, 3] }, deletedAt: null },
      });

      // Verify updateMany call
      expect(capturedUpdateManyArgs?.data.deletedAt instanceof Date).toBe(true);
      expect(capturedUpdateManyArgs?.where.id.in).toEqual([1, 2, 3]);

      // Verify second findMany call (get updated images)
      expect(capturedFindManyArgs[1]).toEqual({
        where: { id: { in: [1, 2, 3] } },
      });

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should return correct response structure and types', async () => {
      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockResolvedValueOnce(mockExistingImages)
                .mockResolvedValueOnce(mockUpdatedImages),
              updateMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const result: ProductImagesResponse[] = await service.deleteProductImages(
        mockDeleteProductImagesDto,
      );

      // Verify return type
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);

      // Verify each item structure and types
      result.forEach((item, index) => {
        expect(typeof item.id).toBe('number');
        expect(typeof item.url).toBe('string');
        expect(typeof item.productId).toBe('number');
        expect(item.createdAt).toBeInstanceOf(Date);
        expect(item.updatedAt instanceof Date || typeof item.updatedAt === 'string').toBe(true);
        expect(item.deletedAt instanceof Date || typeof item.deletedAt === 'string').toBe(true);

        // Verify specific values
        expect(item.id).toBe(expectedResponse[index].id);
        expect(item.url).toBe(expectedResponse[index].url);
        expect(item.productId).toBe(expectedResponse[index].productId);
        expect(item.createdAt).toEqual(expectedResponse[index].createdAt);
      });

      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });

    it('should handle null deletedAt field in response mapping', async () => {
      const mockImagesWithNullDeletedAt: MockProductImage[] = [
        {
          id: 1,
          url: 'https://example.com/image1.jpg',
          productId: 100,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
          deletedAt: null, // This will trigger the || null fallback
        },
      ];

      mockPrismaService.client.$transaction.mockImplementation(
        async (callback: DeleteImagesTransactionCallback) => {
          const prismaMock: MockPrismaTransactionForDeleteImages = {
            productImage: {
              findMany: jest
                .fn()
                .mockResolvedValueOnce([mockImagesWithNullDeletedAt[0]])
                .mockResolvedValueOnce(mockImagesWithNullDeletedAt),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return await callback(prismaMock);
        },
      );

      const result = await service.deleteProductImages({ productImageIds: [1] });

      expect(result).toHaveLength(1);
      expect(result[0].deletedAt).toBeNull();
      expect(mockPrismaService.client.$transaction).toHaveBeenCalled();
    });
  });
});
