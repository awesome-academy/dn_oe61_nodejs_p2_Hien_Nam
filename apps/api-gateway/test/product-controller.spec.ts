import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { ProductDto } from '@app/common/dto/product/product.dto';
import { CategoryResponse } from '@app/common/dto/product/response/category-response';
import { ImageRes } from '@app/common/dto/product/response/images-response';
import { ProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { ProductVariantResponse } from '@app/common/dto/product/response/product-variant-response';
import { VariantInput } from '@app/common/dto/product/variants.dto';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { I18nService } from 'nestjs-i18n';
import { Readable } from 'stream';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { ProductController } from '../src/product/admin/product.controller';
import { ProductService } from '../src/product/admin/product.service';

describe('ProductController', () => {
  let controller: ProductController;
  let productService: ProductService;
  let moduleRef: TestingModule;

  const mockProductService = {
    create: jest.fn(),
    getById: jest.fn(),
    addProductCart: jest.fn(),
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

  describe('create', () => {
    const mockVariant: VariantInput = {
      price: 29.99,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      sizeId: 1,
    };

    const mockProductDto: ProductDto = {
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test product description',
      status: StatusProduct.IN_STOCK,
      basePrice: 25.99,
      quantity: 100,
      variants: [mockVariant],
      categoryIds: [1, 2, 3],
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
        originalname: 'test2.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('test image 2'),
        destination: '',
        filename: 'test2.jpg',
        path: '',
        stream: new Readable(),
      },
    ];

    const mockProductResponse: ProductResponse = {
      id: 1,
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test product description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(25.99),
      quantity: 100,
      images: [
        {
          id: 1,
          url: 'https://cloudinary.com/image1.jpg',
        },
        {
          id: 2,
          url: 'https://cloudinary.com/image2.jpg',
        },
      ],
      variants: [
        {
          id: 1,
          price: 29.99,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          sizeId: 1,
        },
      ],
      categoryIds: [1, 2, 3],
    };

    const mockSuccessResponse: BaseResponse<ProductResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductResponse,
    };

    it('should create a product successfully with valid input and files', async () => {
      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.create(mockProductDto, mockFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(mockProductDto, mockFiles);
      expect(productServiceCreateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockProductResponse);
      expect(result.data!.id).toBe(1);
      expect(result.data!.name).toBe(mockProductDto.name);
      expect(result.data!.skuId).toBe(mockProductDto.skuId);
      expect(result.data!.images).toHaveLength(2);
      expect(result.data!.variants).toHaveLength(1);
    });

    it('should create a product successfully with empty files array', async () => {
      const emptyFiles: Express.Multer.File[] = [];
      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.create(mockProductDto, emptyFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(mockProductDto, emptyFiles);
      expect(productServiceCreateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should create a product successfully with undefined files', async () => {
      const undefinedFiles = undefined as unknown as Express.Multer.File[];
      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.create(mockProductDto, undefinedFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(mockProductDto, undefinedFiles);
      expect(productServiceCreateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle product creation with minimal required fields', async () => {
      const minimalProductDto: ProductDto = {
        name: 'Minimal Product',
        skuId: 'MIN-SKU-001',
        status: StatusProduct.IN_STOCK,
        basePrice: 10.0,
        quantity: 1,
        variants: [mockVariant],
        categoryIds: [1],
      };

      const minimalResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockProductResponse,
          name: 'Minimal Product',
          skuId: 'MIN-SKU-001',
          description: undefined,
          basePrice: new Decimal(10.0),
          quantity: 1,
          categoryIds: [1],
        },
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(minimalResponse);

      const result = await controller.create(minimalProductDto, mockFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(minimalProductDto, mockFiles);
      expect(result).toEqual(minimalResponse);
      expect(result.data!.name).toBe('Minimal Product');
      expect(result.data!.description).toBeUndefined();
    });

    it('should handle product creation with multiple variants', async () => {
      const multipleVariants: VariantInput[] = [
        {
          price: 29.99,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          sizeId: 1,
        },
        {
          price: 34.99,
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-12-31'),
          sizeId: 2,
        },
        {
          price: 39.99,
          startDate: new Date('2024-01-01'),
          sizeId: 3,
        },
      ];

      const productDtoWithMultipleVariants: ProductDto = {
        ...mockProductDto,
        variants: multipleVariants,
      };

      const responseWithMultipleVariants: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockProductResponse,
          variants: multipleVariants.map((variant, index) => ({
            id: index + 1,
            ...variant,
          })),
        },
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(responseWithMultipleVariants);

      const result = await controller.create(productDtoWithMultipleVariants, mockFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(
        productDtoWithMultipleVariants,
        mockFiles,
      );
      expect(result.data!.variants).toHaveLength(3);
      expect(result.data!.variants![0].sizeId).toBe(1);
      expect(result.data!.variants![1].sizeId).toBe(2);
      expect(result.data!.variants![2].sizeId).toBe(3);
    });

    it('should handle product creation with multiple category IDs', async () => {
      const multipleCategoryIds = [1, 2, 3, 4, 5];
      const productDtoWithMultipleCategories: ProductDto = {
        ...mockProductDto,
        categoryIds: multipleCategoryIds,
      };

      const responseWithMultipleCategories: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockProductResponse,
          categoryIds: multipleCategoryIds,
        },
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(responseWithMultipleCategories);

      const result = await controller.create(productDtoWithMultipleCategories, mockFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(
        productDtoWithMultipleCategories,
        mockFiles,
      );
      expect(result.data!.categoryIds).toEqual(multipleCategoryIds);
      expect(result.data!.categoryIds).toHaveLength(5);
    });

    it('should propagate BadRequestException from service', async () => {
      const errorMessage = 'Product with this SKU already exists';
      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.create(mockProductDto, mockFiles)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.create(mockProductDto, mockFiles)).rejects.toThrow(errorMessage);
      expect(productServiceCreateSpy).toHaveBeenCalledWith(mockProductDto, mockFiles);
    });

    it('should propagate generic Error from service', async () => {
      const errorMessage = 'Internal server error';
      const genericError = new Error(errorMessage);
      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockRejectedValue(genericError);

      await expect(controller.create(mockProductDto, mockFiles)).rejects.toThrow(Error);
      await expect(controller.create(mockProductDto, mockFiles)).rejects.toThrow(errorMessage);
      expect(productServiceCreateSpy).toHaveBeenCalledWith(mockProductDto, mockFiles);
    });

    it('should handle null input gracefully', async () => {
      const nullDto = null as unknown as ProductDto;
      const nullFiles = null as unknown as Express.Multer.File[];
      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.create(nullDto, nullFiles)).rejects.toThrow(BadRequestException);
      expect(productServiceCreateSpy).toHaveBeenCalledWith(nullDto, nullFiles);
    });

    it('should handle service returning null response', async () => {
      const nullResponse = null as unknown as BaseResponse<ProductResponse>;
      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(nullResponse);

      const result = await controller.create(mockProductDto, mockFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(mockProductDto, mockFiles);
      expect(result).toBeNull();
    });

    it('should handle different product statuses', async () => {
      const inactiveProductDto: ProductDto = {
        ...mockProductDto,
        status: StatusProduct.SOLD_OUT,
      };

      const inactiveProductResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockProductResponse,
          status: StatusProduct.SOLD_OUT,
        },
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(inactiveProductResponse);

      const result = await controller.create(inactiveProductDto, mockFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(inactiveProductDto, mockFiles);
      expect(result.data!.status).toBe(StatusProduct.SOLD_OUT);
    });

    it('should handle large file uploads', async () => {
      const largeFiles: Express.Multer.File[] = Array.from({ length: 10 }, (_, index) => ({
        fieldname: 'images',
        originalname: `large-image-${index + 1}.jpg`,
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5MB
        buffer: Buffer.alloc(5 * 1024 * 1024),
        destination: '',
        filename: `large-image-${index + 1}.jpg`,
        path: '',
        stream: new Readable(),
      }));

      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.create(mockProductDto, largeFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(mockProductDto, largeFiles);
      expect(productServiceCreateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('should handle decimal prices correctly', async () => {
      const decimalPriceDto: ProductDto = {
        ...mockProductDto,
        basePrice: 99.999,
        variants: [
          {
            ...mockVariant,
            price: 149.995,
          },
        ],
      };

      const decimalPriceResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockProductResponse,
          basePrice: new Decimal(99.999),
          variants: [
            {
              id: 1,
              price: 149.995,
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31'),
              sizeId: 1,
            },
          ],
        },
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(decimalPriceResponse);

      const result = await controller.create(decimalPriceDto, mockFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(decimalPriceDto, mockFiles);
      expect(result.data!.basePrice.toString()).toBe('99.999');
      expect(result.data!.variants![0].price).toBe(149.995);
    });

    it('should handle zero quantity products', async () => {
      const zeroQuantityDto: ProductDto = {
        ...mockProductDto,
        quantity: 0,
      };

      const zeroQuantityResponse: BaseResponse<ProductResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          ...mockProductResponse,
          quantity: 0,
        },
      };

      const productServiceCreateSpy = jest
        .spyOn(productService, 'create')
        .mockResolvedValue(zeroQuantityResponse);

      const result = await controller.create(zeroQuantityDto, mockFiles);

      expect(productServiceCreateSpy).toHaveBeenCalledWith(zeroQuantityDto, mockFiles);
      expect(result.data!.quantity).toBe(0);
    });
  });

  describe('getById', () => {
    const mockGetByIdDto: GetByIdProductDto = {
      skuId: 'TEST-SKU-001',
    };

    const mockCategoryResponse: CategoryResponse = {
      rootCategory: {
        id: 1,
        name: 'Electronics',
        parent: '',
      },
      childCategories: [
        {
          id: 2,
          name: 'Smartphones',
          parent: 1,
        },
        {
          id: 3,
          name: 'Accessories',
          parent: 1,
        },
      ],
    };

    const mockProductVariantResponse: ProductVariantResponse = {
      id: 1,
      price: new Decimal(29.99),
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      size: {
        id: '1',
        nameSize: 'Medium',
        description: 'Medium size',
      },
    };

    const mockImageResponse: ImageRes = {
      id: 1,
      url: 'https://cloudinary.com/image1.jpg',
    };

    const mockProductDetailResponse: ProductDetailResponse = {
      id: 1,
      name: 'Test Product',
      skuId: 'TEST-SKU-001',
      description: 'Test product description',
      status: StatusProduct.IN_STOCK,
      basePrice: new Decimal(25.99),
      quantity: 100,
      images: [mockImageResponse],
      variants: [mockProductVariantResponse],
      categories: [mockCategoryResponse],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-15T00:00:00Z'),
    };

    const mockSuccessResponse: BaseResponse<ProductDetailResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: mockProductDetailResponse,
    };

    it('should get product by ID successfully with valid skuId', async () => {
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(mockSuccessResponse);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(productServiceGetByIdSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSuccessResponse);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(mockProductDetailResponse);
      expect(result.data!.id).toBe(1);
      expect(result.data!.skuId).toBe('TEST-SKU-001');
      expect(result.data!.name).toBe('Test Product');
      expect(result.data!.basePrice.toString()).toBe('25.99');
      expect(result.data!.images).toHaveLength(1);
      expect(result.data!.variants).toHaveLength(1);
      expect(result.data!.categories).toHaveLength(1);
    });

    it('should get product with minimal data structure', async () => {
      const minimalProductDetail: ProductDetailResponse = {
        id: 2,
        name: 'Minimal Product',
        skuId: 'MIN-SKU-002',
        status: StatusProduct.IN_STOCK,
        basePrice: new Decimal(10.0),
        quantity: 1,
        images: [],
        variants: [],
        categories: [],
      };

      const minimalResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: minimalProductDetail,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(minimalResponse);

      const result = await controller.getById({ skuId: 'MIN-SKU-002' });

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith({ skuId: 'MIN-SKU-002' });
      expect(result).toEqual(minimalResponse);
      expect(result.data!.description).toBeUndefined();
      expect(result.data!.createdAt).toBeUndefined();
      expect(result.data!.updatedAt).toBeUndefined();
      expect(result.data!.images).toHaveLength(0);
      expect(result.data!.variants).toHaveLength(0);
      expect(result.data!.categories).toHaveLength(0);
    });

    it('should get product with multiple images, variants, and categories', async () => {
      const multipleImages: ImageRes[] = [
        { id: 1, url: 'https://cloudinary.com/image1.jpg' },
        { id: 2, url: 'https://cloudinary.com/image2.jpg' },
        { id: 3, url: 'https://cloudinary.com/image3.jpg' },
      ];

      const multipleVariants: ProductVariantResponse[] = [
        {
          id: 1,
          price: new Decimal(29.99),
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          size: { id: '1', nameSize: 'Small', description: 'Small size' },
        },
        {
          id: 2,
          price: new Decimal(34.99),
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-12-31'),
          size: { id: '2', nameSize: 'Medium', description: 'Medium size' },
        },
        {
          id: 3,
          price: new Decimal(39.99),
          startDate: new Date('2024-01-01'),
          size: { id: '3', nameSize: 'Large', description: 'Large size' },
        },
      ];

      const multipleCategories: CategoryResponse[] = [
        {
          rootCategory: { id: 1, name: 'Electronics', parent: '' },
          childCategories: [
            { id: 2, name: 'Smartphones', parent: 1 },
            { id: 3, name: 'Tablets', parent: 1 },
          ],
        },
        {
          rootCategory: { id: 4, name: 'Accessories', parent: '' },
          childCategories: [
            { id: 5, name: 'Cases', parent: 4 },
            { id: 6, name: 'Chargers', parent: 4 },
          ],
        },
      ];

      const complexProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        images: multipleImages,
        variants: multipleVariants,
        categories: multipleCategories,
      };

      const complexResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: complexProductDetail,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(complexResponse);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.images).toHaveLength(3);
      expect(result.data!.variants).toHaveLength(3);
      expect(result.data!.categories).toHaveLength(2);
      expect(result.data!.variants[0].endDate).toEqual(new Date('2024-06-30'));
      expect(result.data!.variants[2].endDate).toBeUndefined();
    });

    it('should handle different product statuses', async () => {
      const soldOutProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        status: StatusProduct.SOLD_OUT,
        quantity: 0,
      };

      const soldOutResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: soldOutProductDetail,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(soldOutResponse);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.status).toBe(StatusProduct.SOLD_OUT);
      expect(result.data!.quantity).toBe(0);
    });

    it('should handle product with zero price', async () => {
      const zeroPriceProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        basePrice: new Decimal(0),
        variants: [
          {
            ...mockProductVariantResponse,
            price: new Decimal(0),
          },
        ],
      };

      const zeroPriceResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: zeroPriceProductDetail,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(zeroPriceResponse);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.basePrice.toString()).toBe('0');
      expect(result.data!.variants[0].price.toString()).toBe('0');
    });

    it('should handle product with high precision decimal prices', async () => {
      const precisionPriceProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        basePrice: new Decimal('99.999999'),
        variants: [
          {
            ...mockProductVariantResponse,
            price: new Decimal('149.123456'),
          },
        ],
      };

      const precisionPriceResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: precisionPriceProductDetail,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(precisionPriceResponse);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.basePrice.toString()).toBe('99.999999');
      expect(result.data!.variants[0].price.toString()).toBe('149.123456');
    });

    it('should handle empty dates in response', async () => {
      const emptyDatesProductDetail: ProductDetailResponse = {
        ...mockProductDetailResponse,
        createdAt: null,
        updatedAt: null,
        variants: [
          {
            ...mockProductVariantResponse,
            startDate: null,
            endDate: null,
          },
        ],
      };

      const emptyDatesResponse: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: emptyDatesProductDetail,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(emptyDatesResponse);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.createdAt).toBeNull();
      expect(result.data!.updatedAt).toBeNull();
      expect(result.data!.variants[0].startDate).toBeNull();
      expect(result.data!.variants[0].endDate).toBeNull();
    });

    it('should propagate BadRequestException from service', async () => {
      const errorMessage = 'Product not found';
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockRejectedValue(new BadRequestException(errorMessage));

      await expect(controller.getById(mockGetByIdDto)).rejects.toThrow(BadRequestException);
      await expect(controller.getById(mockGetByIdDto)).rejects.toThrow(errorMessage);
      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(productServiceGetByIdSpy).toHaveBeenCalledTimes(2);
    });

    it('should propagate generic Error from service', async () => {
      const errorMessage = 'Internal server error';
      const genericError = new Error(errorMessage);
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockRejectedValue(genericError);

      await expect(controller.getById(mockGetByIdDto)).rejects.toThrow(Error);
      await expect(controller.getById(mockGetByIdDto)).rejects.toThrow(errorMessage);
      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(productServiceGetByIdSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle service returning null response', async () => {
      const nullResponse = null as unknown as BaseResponse<ProductDetailResponse>;
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(nullResponse);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result).toBeNull();
    });

    it('should handle service returning undefined response', async () => {
      const undefinedResponse = undefined as unknown as BaseResponse<ProductDetailResponse>;
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(undefinedResponse);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result).toBeUndefined();
    });

    it('should handle different skuId formats', async () => {
      const specialSkuFormats = [
        'SKU-123-ABC',
        'sku_with_underscores',
        'SKU.WITH.DOTS',
        'SKU WITH SPACES',
        '123456789',
        'VERY-LONG-SKU-ID-WITH-MANY-CHARACTERS-AND-NUMBERS-12345',
      ];

      for (const skuId of specialSkuFormats) {
        const dto: GetByIdProductDto = { skuId };
        const response: BaseResponse<ProductDetailResponse> = {
          statusKey: StatusKey.SUCCESS,
          data: { ...mockProductDetailResponse, skuId },
        };

        const productServiceGetByIdSpy = jest
          .spyOn(productService, 'getById')
          .mockResolvedValue(response);

        const result = await controller.getById(dto);

        expect(productServiceGetByIdSpy).toHaveBeenCalledWith(dto);
        expect(result.data!.skuId).toBe(skuId);
      }
    });

    it('should handle product with empty parent category', async () => {
      const categoryWithEmptyParent: CategoryResponse = {
        rootCategory: {
          id: 1,
          name: 'Root Category',
          parent: '',
        },
        childCategories: [],
      };

      const productWithEmptyParentCategory: ProductDetailResponse = {
        ...mockProductDetailResponse,
        categories: [categoryWithEmptyParent],
      };

      const responseWithEmptyParent: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: productWithEmptyParentCategory,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(responseWithEmptyParent);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.categories[0].rootCategory.parent).toBe('');
      expect(result.data!.categories[0].childCategories).toHaveLength(0);
    });

    it('should handle product with numeric parent category', async () => {
      const categoryWithNumericParent: CategoryResponse = {
        rootCategory: {
          id: 2,
          name: 'Child Category',
          parent: 1,
        },
        childCategories: [
          {
            id: 3,
            name: 'Grandchild Category',
            parent: 2,
          },
        ],
      };

      const productWithNumericParent: ProductDetailResponse = {
        ...mockProductDetailResponse,
        categories: [categoryWithNumericParent],
      };

      const responseWithNumericParent: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: productWithNumericParent,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(responseWithNumericParent);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.categories[0].rootCategory.parent).toBe(1);
      expect(result.data!.categories[0].childCategories[0].parent).toBe(2);
    });

    it('should handle variant without endDate', async () => {
      const variantWithoutEndDate: ProductVariantResponse = {
        id: 1,
        price: new Decimal(29.99),
        startDate: new Date('2024-01-01'),
        size: {
          id: '1',
          nameSize: 'Medium',
          description: 'Medium size',
        },
      };

      const productWithVariantNoEndDate: ProductDetailResponse = {
        ...mockProductDetailResponse,
        variants: [variantWithoutEndDate],
      };

      const responseWithVariantNoEndDate: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: productWithVariantNoEndDate,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(responseWithVariantNoEndDate);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.variants[0].endDate).toBeUndefined();
      expect(result.data!.variants[0].startDate).toEqual(new Date('2024-01-01'));
    });

    it('should handle variant with empty string dates', async () => {
      const variantWithEmptyDates: ProductVariantResponse = {
        id: 1,
        price: new Decimal(29.99),
        startDate: null,
        endDate: null,
        size: {
          id: '1',
          nameSize: 'Medium',
          description: 'Medium size',
        },
      };

      const productWithEmptyDates: ProductDetailResponse = {
        ...mockProductDetailResponse,
        variants: [variantWithEmptyDates],
      };

      const responseWithEmptyDates: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: productWithEmptyDates,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(responseWithEmptyDates);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.data!.variants[0].startDate).toBeNull();
      expect(result.data!.variants[0].endDate).toBeNull();
    });

    it('should handle null input gracefully', async () => {
      const nullDto = null as unknown as GetByIdProductDto;
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.getById(nullDto)).rejects.toThrow(BadRequestException);
      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(nullDto);
    });

    it('should handle undefined input gracefully', async () => {
      const undefinedDto = undefined as unknown as GetByIdProductDto;
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockRejectedValue(new BadRequestException('Invalid input data'));

      await expect(controller.getById(undefinedDto)).rejects.toThrow(BadRequestException);
      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(undefinedDto);
    });

    it('should verify method signature and parameter passing', async () => {
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(mockSuccessResponse);

      await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(productServiceGetByIdSpy).toHaveBeenCalledTimes(1);

      // Verify the exact parameter structure
      const calledWith = productServiceGetByIdSpy.mock.calls[0][0];
      expect(calledWith).toHaveProperty('skuId');
      expect(calledWith.skuId).toBe('TEST-SKU-001');
      expect(typeof calledWith.skuId).toBe('string');
    });

    it('should handle concurrent requests', async () => {
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(mockSuccessResponse);

      const requests = [
        controller.getById({ skuId: 'SKU-001' }),
        controller.getById({ skuId: 'SKU-002' }),
        controller.getById({ skuId: 'SKU-003' }),
      ];

      const results = await Promise.all(requests);

      expect(productServiceGetByIdSpy).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual(mockSuccessResponse);
      });
    });

    it('should handle service timeout or network errors', async () => {
      const timeoutError = new Error('Request timeout');
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockRejectedValue(timeoutError);

      await expect(controller.getById(mockGetByIdDto)).rejects.toThrow('Request timeout');
      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
    });

    it('should handle response with data property as null', async () => {
      const responseWithNullData: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: null as unknown as ProductDetailResponse,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(responseWithNullData);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toBeNull();
    });

    it('should handle response with data property as undefined', async () => {
      const responseWithUndefinedData: BaseResponse<ProductDetailResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: undefined as unknown as ProductDetailResponse,
      };

      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(responseWithUndefinedData);

      const result = await controller.getById(mockGetByIdDto);

      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toBeUndefined();
    });

    it('should verify return type is Promise<BaseResponse<ProductDetailResponse>>', async () => {
      const productServiceGetByIdSpy = jest
        .spyOn(productService, 'getById')
        .mockResolvedValue(mockSuccessResponse);

      const result = controller.getById(mockGetByIdDto);

      expect(result).toBeInstanceOf(Promise);

      const resolvedResult = await result;
      expect(resolvedResult).toHaveProperty('statusKey');
      expect(resolvedResult).toHaveProperty('data');
      expect(resolvedResult.statusKey).toBe(StatusKey.SUCCESS);
      expect(productServiceGetByIdSpy).toHaveBeenCalledWith(mockGetByIdDto);
    });
  });
});
