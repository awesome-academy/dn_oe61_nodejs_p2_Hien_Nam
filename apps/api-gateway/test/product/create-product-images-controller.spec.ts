import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Readable } from 'stream';
import { I18nService } from 'nestjs-i18n';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { ProductController } from '../../src/product/admin/product.controller';
import { ProductService } from '../../src/product/admin/product.service';
import { CreateProductImagesDto } from '@app/common/dto/product/create-product-images.dto';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';
import { BaseResponse } from '@app/common/interfaces/data-type';

describe('ProductController - createProductImages', () => {
  let controller: ProductController;
  let productService: ProductService;
  let moduleRef: TestingModule;

  const mockProductService = {
    createProductImages: jest.fn(),
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
    productService = moduleRef.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProductImages', () => {
    const mockProductId: CreateProductImagesDto = {
      productId: 1,
    };

    const mockFiles: Express.Multer.File[] = [
      {
        fieldname: 'images',
        originalname: 'test1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test image 1'),
        destination: '',
        filename: 'test1.jpg',
        path: '',
        stream: new Readable(),
      },
      {
        fieldname: 'images',
        originalname: 'test2.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from('test image 2'),
        destination: '',
        filename: 'test2.png',
        path: '',
        stream: new Readable(),
      },
    ];

    const mockProductImagesResponse: ProductImagesResponse[] = [
      {
        id: 1,
        url: 'https://cloudinary.com/image1.jpg',
        productId: 1,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:01Z'),
        deletedAt: null,
      },
      {
        id: 2,
        url: 'https://cloudinary.com/image2.jpg',
        productId: 1,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:01Z'),
        deletedAt: null,
      },
    ];

    const mockSuccessResponse: BaseResponse<ProductImagesResponse[]> = {
      statusKey: 'success',
      data: mockProductImagesResponse,
    };

    it('should create product images successfully with valid input and files', async () => {
      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createProductImages(mockProductId, mockFiles);

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, mockFiles);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe('success');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!).toHaveLength(2);
      expect(result.data![0].id).toBe(1);
      expect(result.data![0].productId).toBe(1);
    });

    it('should handle single file upload', async () => {
      const singleFile = [mockFiles[0]];

      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createProductImages(mockProductId, singleFile);

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, singleFile);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe('success');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle multiple file uploads', async () => {
      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createProductImages(mockProductId, mockFiles);

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, mockFiles);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe('success');
      expect(result.data![0].productId).toBe(1);
    });

    it('should propagate BadRequestException when product not found', async () => {
      const errorMessage = 'Product not found';
      const badRequestException = new BadRequestException(errorMessage);

      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockRejectedValue(badRequestException);

      await expect(controller.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        errorMessage,
      );

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, mockFiles);
    });

    it('should propagate BadRequestException when max images exceeded', async () => {
      const errorMessage = 'Maximum number of images exceeded';
      const badRequestException = new BadRequestException(errorMessage);

      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockRejectedValue(badRequestException);

      await expect(controller.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        errorMessage,
      );

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, mockFiles);
    });

    it('should propagate BadRequestException when no files provided', async () => {
      const errorMessage = 'Files must be provided';
      const badRequestException = new BadRequestException(errorMessage);

      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockRejectedValue(badRequestException);

      await expect(controller.createProductImages(mockProductId, [])).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductImages(mockProductId, [])).rejects.toThrow(errorMessage);

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, []);
    });

    it('should propagate generic errors from service', async () => {
      const genericError = new Error('Internal server error');

      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockRejectedValue(genericError);

      await expect(controller.createProductImages(mockProductId, mockFiles)).rejects.toThrow(Error);
      await expect(controller.createProductImages(mockProductId, mockFiles)).rejects.toThrow(
        'Internal server error',
      );

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, mockFiles);
    });

    it('should handle empty files array', async () => {
      const emptyFiles: Express.Multer.File[] = [];
      const errorMessage = 'Files must be provided';
      const badRequestException = new BadRequestException(errorMessage);

      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockRejectedValue(badRequestException);

      await expect(controller.createProductImages(mockProductId, emptyFiles)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createProductImages(mockProductId, emptyFiles)).rejects.toThrow(
        errorMessage,
      );

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, emptyFiles);
    });

    it('should handle undefined files', async () => {
      const errorMessage = 'Files must be provided';
      const badRequestException = new BadRequestException(errorMessage);

      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockRejectedValue(badRequestException);

      await expect(
        controller.createProductImages(
          mockProductId,
          undefined as unknown as Express.Multer.File[],
        ),
      ).rejects.toThrow(BadRequestException);

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, undefined);
    });

    it('should handle files with zero size', async () => {
      const zeroSizeFiles: Express.Multer.File[] = [
        {
          ...mockFiles[0],
          size: 0,
          buffer: Buffer.alloc(0),
        },
      ];

      const errorMessage = 'Invalid file size';
      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.createProductImages(mockProductId, zeroSizeFiles)).rejects.toThrow(
        BadRequestException,
      );
      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, zeroSizeFiles);
    });

    it('should handle invalid product ID', async () => {
      const invalidProductId: CreateProductImagesDto = {
        productId: -1,
      };

      const errorMessage = 'Product not found';
      const badRequestException = new BadRequestException(errorMessage);

      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockRejectedValue(badRequestException);

      await expect(controller.createProductImages(invalidProductId, mockFiles)).rejects.toThrow(
        BadRequestException,
      );

      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(invalidProductId, mockFiles);
    });

    it('should verify controller method signature and return type', async () => {
      const productServiceCreateImagesSpy = jest
        .spyOn(productService, 'createProductImages')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.createProductImages(mockProductId, mockFiles);

      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('statusKey');
      expect(result).toHaveProperty('data');
      expect(result.statusKey).toBe('success');
      expect(Array.isArray(result.data)).toBe(true);
      expect(productServiceCreateImagesSpy).toHaveBeenCalledWith(mockProductId, mockFiles);
    });
  });
});
