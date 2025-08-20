import { MAX_IMAGES } from '@app/common/constant/cloudinary';
import { PaginationDto } from '@app/common/dto/pagination.dto';
import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';
import { CreateProductImagesServiceDto } from '@app/common/dto/product/create-product-images.dto';
import { CreateProductDto } from '@app/common/dto/product/create-product.dto';
import { DeleteProductCategoryDto } from '@app/common/dto/product/delete-product-category.dto';
import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';
import { DeleteProductDto } from '@app/common/dto/product/delete-product.dto';
import { AddProductCartRequest } from '@app/common/dto/product/requests/add-product-cart.request';
import { DeleteProductCartRequest } from '@app/common/dto/product/requests/delete-product-cart.request';
import { DeleteSoftCartRequest } from '@app/common/dto/product/requests/delete-soft-cart.request';
import { CartSummaryResponse } from '@app/common/dto/product/response/cart-summary.response';
import {
  CategoryResponse,
  ChildCategories,
  RootCategory,
} from '@app/common/dto/product/response/category-response';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { ProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { ProductWithCategories } from '@app/common/dto/product/response/product-with-categories.interface';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { UpdateProductCategoryDto } from '@app/common/dto/product/update-product-category.dto';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { handleServiceError } from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Cart, CartItem, PrismaClient, Product } from '../generated/prisma';

@Injectable()
export class ProductService {
  constructor(
    private readonly prismaService: PrismaService<PrismaClient>,
    private readonly loggerService: CustomLogger,
    private readonly paginationService: PaginationService,
  ) {}

  async checkProductExists(skuId: string): Promise<ProductResponse | null> {
    const product = await this.prismaService.client.product.findUnique({
      where: { skuId },
    });

    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      skuId: product.skuId,
      description: product.description,
      status: product.status,
      basePrice: product.basePrice,
      quantity: product.quantity,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    } as ProductResponse;
  }

  async checkProductById(productId: number): Promise<ProductResponse | null> {
    const product = await this.prismaService.client.product.findFirst({
      where: { id: productId },
    });

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      skuId: product.skuId,
      description: product.description,
      status: product.status,
      basePrice: product.basePrice,
      quantity: product.quantity,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    } as ProductResponse;
  }
  async createProduct(data: CreateProductDto): Promise<ProductResponse | null> {
    const dto = plainToInstance(CreateProductDto, data);
    await validateOrReject(dto);

    const { productData, secureUrl } = data;
    const query = await this.prismaService.client.$transaction(async (prisma) => {
      const product = await prisma.product.create({
        data: {
          skuId: productData.skuId,
          name: productData.name,
          description: productData.description,
          status: productData.status,
          basePrice: productData.basePrice,
          quantity: productData.quantity,
        },
      });

      const imagePromises = secureUrl.map((url) =>
        prisma.productImage.create({
          data: {
            url,
            productId: product.id,
          },
        }),
      );
      await Promise.all(imagePromises);

      const variantPromises = productData.variants.map((variant) =>
        prisma.productVariant.create({
          data: {
            price: variant.price,
            startDate: new Date(variant.startDate),
            endDate: variant.endDate ? new Date(variant.endDate) : null,
            productId: product.id,
            sizeId: variant.sizeId,
          },
        }),
      );
      await Promise.all(variantPromises);

      const categoryPromises = productData.categoryIds.map((categoryId) =>
        prisma.categoryProduct.create({
          data: {
            categoryId,
            productId: product.id,
          },
        }),
      );
      await Promise.all(categoryPromises);
      return product;
    });

    const result = {
      id: query.id,
      skuId: query.skuId,
      name: query.name,
      description: query.description,
      status: query.status,
      basePrice: new Decimal(query.basePrice),
      quantity: query.quantity,
      createdAt: query.createdAt,
      updatedAt: query.updatedAt,
    } as ProductResponse;

    return result;
  }

  async updateProduct(input: UpdateProductDto, skuIdParam: string): Promise<Product | null> {
    const dto = plainToInstance(UpdateProductDto, input);
    await validateOrReject(dto);

    const product = await this.validationDataProduct(input, skuIdParam);

    return await this.prismaService.client.$transaction(async (prisma) => {
      const productUpdate = await prisma.product.update({
        data: {
          ...(product.name !== undefined && { name: product.name }),
          ...(product.skuId !== undefined && { skuId: product.skuId }),
          ...(product.description !== undefined && { description: product.description }),
          ...(product.status !== undefined && { status: product.status }),
          ...(product.basePrice !== undefined && { basePrice: product.basePrice }),
          ...(product.quantity !== undefined && { quantity: product.quantity }),
        },
        where: {
          skuId: skuIdParam,
        },
      });
      return productUpdate;
    });
  }

  private async validationDataProduct(input: UpdateProductDto, skuIdParam: string) {
    const product = await this.checkProductExists(skuIdParam);
    if (!product) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.error.productNotFound',
      });
    }

    if (input.skuId !== undefined && input.skuId !== product.skuId) {
      const uniqueSkuId = await this.checkProductExists(input.skuId);
      if (uniqueSkuId) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.skuIdExists',
        });
      }
      product.skuId = input.skuId;
    }

    const { name, description, status, basePrice, quantity } = input;

    if (name != undefined) product.name = name;
    if (description != undefined) product.description = description;
    if (status != undefined) product.status = status;
    if (basePrice != undefined) product.basePrice = new Decimal(basePrice);
    if (quantity != undefined) product.quantity = quantity;

    return product;
  }

  async deleteProduct(skuId: DeleteProductDto): Promise<Product | null> {
    try {
      const dto = plainToInstance(DeleteProductDto, skuId);
      await validateOrReject(dto);
      const product = await this.prismaService.client.product.findUnique({
        where: { skuId: skuId.skuId },
        include: {
          variants: true,
        },
      });

      if (!product) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productNotFound',
        });
      }

      const variantIds = product.variants.map((variant) => variant.id);

      const orderItemCount = await this.prismaService.client.orderItem.count({
        where: {
          productVariantId: {
            in: variantIds,
          },
        },
      });

      if (orderItemCount > 0) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productInOrder',
        });
      }

      return await this.prismaService.client.$transaction(async (tx) => {
        if (variantIds.length > 0) {
          await tx.cartItem.deleteMany({
            where: {
              productVariantId: {
                in: variantIds,
              },
            },
          });
        }

        await tx.review.deleteMany({
          where: { productId: product.id },
        });

        await tx.productImage.deleteMany({
          where: { productId: product.id },
        });

        await tx.categoryProduct.deleteMany({
          where: { productId: product.id },
        });

        if (variantIds.length > 0) {
          await tx.productVariant.deleteMany({
            where: {
              productId: product.id,
            },
          });
        }

        const deletedProduct = await tx.product.update({
          where: {
            skuId: skuId.skuId,
          },
          data: {
            deletedAt: new Date(),
          },
        });
        return deletedProduct;
      });
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }
      this.loggerService.error(
        'DeleteProduct',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async getById(skuId: DeleteProductDto): Promise<ProductDetailResponse | null> {
    try {
      const dto = plainToInstance(DeleteProductDto, skuId);
      await validateOrReject(dto);

      const product = await this.prismaService.client.product.findUnique({
        where: { skuId: skuId.skuId },
        include: {
          images: true,
          categories: {
            include: {
              category: true,
            },
          },
          variants: {
            include: {
              size: true,
            },
          },
        },
      });

      if (!product) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productNotFound',
        });
      }
      const groupedCategories = await this.groupedCategories(product);
      const result: ProductDetailResponse = {
        id: product.id,
        name: product.name,
        skuId: product.skuId,
        description: product.description ?? '',
        basePrice: product.basePrice,
        status: product.status as StatusProduct,
        quantity: product.quantity,
        images: product.images.map((image) => ({
          id: image.id,
          url: image.url ?? '',
        })),
        categories: groupedCategories ?? [],
        variants: product.variants.map((variant) => ({
          id: variant.id,
          price: variant.price,
          startDate: variant.startDate ?? '',
          endDate: variant.endDate ?? '',
          size: {
            id: String(variant.size.id),
            nameSize: variant.size.nameSize ?? '',
            description: variant.size.description ?? '',
          },
        })),
      };

      return result;
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }
      this.loggerService.error(
        'DeleteProduct',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  private async groupedCategories(
    product: ProductWithCategories,
  ): Promise<CategoryResponse[] | []> {
    const productRootCategories = product.categories
      .map((pc) => pc.category)
      .filter((c) => c.parentId === null);

    if (productRootCategories.length === 0) {
      return [];
    }

    const rootCategoryIds = productRootCategories.map((c) => c.id);

    const childCategories = await this.prismaService.client.category.findMany({
      where: {
        parentId: {
          in: rootCategoryIds,
        },
      },
    });

    const groupedCategories: CategoryResponse[] = productRootCategories.map((root) => {
      const rootCat: RootCategory = {
        id: root.id,
        name: root.name,
        parent: root.parentId ?? '',
      };

      const childCats: ChildCategories[] = childCategories
        .filter((child) => child.parentId === root.id)
        .map((child) => ({
          id: child.id,
          name: child.name,
          parent: child.parentId ?? '',
        }));

      return {
        rootCategory: rootCat,
        childCategories: childCats,
      };
    });

    return groupedCategories;
  }

  async getAll(payLoad: PaginationDto): Promise<PaginationResult<ProductResponse>> {
    const dto = plainToInstance(PaginationDto, payLoad);
    await validateOrReject(dto);

    const page = payLoad.page;
    const pageSize = payLoad.pageSize;

    const products = await this.paginationService.queryWithPagination(
      this.prismaService.client.product,
      {
        page,
        pageSize,
      },
      {
        orderBy: { createdAt: 'asc' },
        where: {
          deletedAt: null,
        },
      },
    );

    if (products.items.length === 0) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.error.productNotFound',
      });
    }
    const items = products.items;
    const result: ProductResponse[] = items.map(
      (product: Product) =>
        ({
          id: product.id,
          name: product.name,
          skuId: product.skuId,
          description: product.description,
          status: product.status,
          basePrice: product.basePrice,
          quantity: product.quantity,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        }) as ProductResponse,
    );

    return { ...products, items: result };
  }

  async createProductCategory(
    createProductCategoryDto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    try {
      const validationData = plainToInstance(CreateProductCategoryDto, createProductCategoryDto);
      await validateOrReject(validationData);

      const product = await this.prismaService.client.product.findUnique({
        where: { id: validationData.productId, deletedAt: null },
      });

      if (!product) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.product.productCategory.error.productNotFound',
        });
      }

      const category = await this.prismaService.client.category.findUnique({
        where: { id: validationData.categoryId },
      });

      if (!category) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.product.productCategory.error.categoryNotFound',
        });
      }

      const existingRelationship = await this.prismaService.client.categoryProduct.findFirst({
        where: {
          categoryId: validationData.categoryId,
          productId: validationData.productId,
        },
      });

      if (existingRelationship) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.CONFLICT,
          message: 'common.product.productCategory.error.relationshipExists',
        });
      }

      const productCategory = await this.prismaService.client.categoryProduct.create({
        data: {
          categoryId: validationData.categoryId,
          productId: validationData.productId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              skuId: true,
            },
          },
        },
      });

      return {
        id: productCategory.id,
        categoryId: productCategory.categoryId,
        productId: productCategory.productId,
        createdAt: productCategory.createdAt,
        updatedAt: productCategory.updatedAt || undefined,
        category: {
          id: productCategory.category.id,
          name: productCategory.category.name,
          parentId: productCategory.category.parentId || undefined,
        },
        product: {
          id: productCategory.product.id,
          name: productCategory.product.name,
          sku: productCategory.product.skuId,
        },
      };
    } catch (error) {
      this.loggerService.error('Error creating product category:', (error as Error).stack);
      if (error instanceof TypedRpcException) {
        throw error;
      }
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async updateProductCategory(
    updateProductCategoryDto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    try {
      const validationData = plainToInstance(UpdateProductCategoryDto, updateProductCategoryDto);
      await validateOrReject(validationData);

      const existingRelationship = await this.prismaService.client.categoryProduct.findUnique({
        where: { id: validationData.id },
      });

      if (!existingRelationship) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.product.productCategory.error.relationshipNotFound',
        });
      }

      const updateData: { categoryId?: number; productId?: number } = {};

      if (validationData.categoryId !== undefined) {
        const category = await this.prismaService.client.category.findUnique({
          where: { id: validationData.categoryId },
        });

        if (!category) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.NOT_FOUND,
            message: 'common.product.productCategory.error.categoryNotFound',
          });
        }

        updateData.categoryId = validationData.categoryId;
      }

      if (validationData.productId !== undefined) {
        const product = await this.prismaService.client.product.findUnique({
          where: { id: validationData.productId, deletedAt: null },
        });

        if (!product) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.NOT_FOUND,
            message: 'common.product.productCategory.error.productNotFound',
          });
        }

        updateData.productId = validationData.productId;
      }

      if (updateData.categoryId || updateData.productId) {
        const checkCategoryId = updateData.categoryId || existingRelationship.categoryId;
        const checkProductId = updateData.productId || existingRelationship.productId;

        const duplicateRelationship = await this.prismaService.client.categoryProduct.findFirst({
          where: {
            categoryId: checkCategoryId,
            productId: checkProductId,
            id: { not: validationData.id },
          },
        });

        if (duplicateRelationship) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.CONFLICT,
            message: 'common.product.productCategory.error.relationshipExists',
          });
        }
      }

      const productCategory = await this.prismaService.client.categoryProduct.update({
        where: { id: validationData.id },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              skuId: true,
            },
          },
        },
      });

      return {
        id: productCategory.id,
        categoryId: productCategory.categoryId,
        productId: productCategory.productId,
        createdAt: productCategory.createdAt,
        updatedAt: productCategory.updatedAt || undefined,
        category: {
          id: productCategory.category.id,
          name: productCategory.category.name,
          parentId: productCategory.category.parentId || undefined,
        },
        product: {
          id: productCategory.product.id,
          name: productCategory.product.name,
          sku: productCategory.product.skuId,
        },
      };
    } catch (error) {
      this.loggerService.error('Error updating product category:', (error as Error).stack);
      if (error instanceof TypedRpcException) {
        throw error;
      }
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.product.action.updateProductCategory.failed',
      });
    }
  }

  async deleteProductCategory(
    deleteProductCategoryDto: DeleteProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    try {
      const validationData = plainToInstance(DeleteProductCategoryDto, deleteProductCategoryDto);
      await validateOrReject(validationData);

      const existingRelationship = await this.prismaService.client.categoryProduct.findUnique({
        where: { id: validationData.id },
      });

      if (!existingRelationship) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.product.productCategory.error.relationshipNotFound',
        });
      }

      const productCategory = await this.prismaService.client.categoryProduct.delete({
        where: { id: validationData.id },
        include: {
          product: true,
          category: true,
        },
      });

      return {
        id: productCategory.id,
        categoryId: productCategory.categoryId,
        productId: productCategory.productId,
        createdAt: productCategory.createdAt,
        updatedAt: productCategory.updatedAt || undefined,
        category: {
          id: productCategory.category.id,
          name: productCategory.category.name,
          parentId: productCategory.category.parentId || undefined,
        },
        product: {
          id: productCategory.product.id,
          name: productCategory.product.name,
          sku: productCategory.product.skuId,
        },
      };
    } catch (error) {
      this.loggerService.error('Error deleting product category:', (error as Error).stack);
      if (error instanceof TypedRpcException) {
        throw error;
      }
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.product.action.deleteProductCategory.failed',
      });
    }
  }

  async countProductImages(productId: number): Promise<number> {
    return await this.prismaService.client.productImage.count({
      where: { productId: productId },
    });
  }

  async createProductImages(
    payLoad: CreateProductImagesServiceDto,
  ): Promise<ProductImagesResponse[] | null> {
    const validationData = plainToInstance(CreateProductImagesServiceDto, payLoad);
    await validateOrReject(validationData);
    try {
      const productExists = await this.checkProductById(validationData.productId);

      if (!productExists) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productNotFound',
        });
      }

      const countProductImages = await this.countProductImages(validationData.productId);

      const totalImages = countProductImages + validationData.secureUrls.length;
      if (totalImages > MAX_IMAGES) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.productImages.error.maxImagesExceeded',
        });
      }

      const query = await this.prismaService.client.$transaction(
        validationData.secureUrls.map((secureUrl) =>
          this.prismaService.client.productImage.create({
            data: {
              productId: validationData.productId,
              url: secureUrl,
            },
          }),
        ),
      );

      const result: ProductImagesResponse[] = query.map(
        (item) =>
          ({
            id: item.id,
            url: item.url,
            productId: item.productId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt || null,
            deletedAt: item.deletedAt || null,
          }) as ProductImagesResponse,
      );

      return result;
    } catch (error) {
      this.loggerService.error('Error create Product Images:', (error as Error).stack);
      if (error instanceof TypedRpcException) {
        throw error;
      }
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async deleteProductImages(
    productImageIds: DeleteProductImagesDto,
  ): Promise<ProductImagesResponse[] | []> {
    const result = await this.prismaService.client.$transaction(async (prisma) => {
      const productImageExists = await prisma.productImage.findMany({
        where: { id: { in: productImageIds.productImageIds }, deletedAt: null },
      });

      const existingImageIds = productImageExists.map((img) => img.id);
      const notFoundIds = productImageIds.productImageIds.filter(
        (id) => !existingImageIds.includes(id),
      );

      if (notFoundIds.length > 0) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.productImages.error.productImagesNotFound',
        });
      }

      await prisma.productImage.updateMany({
        data: {
          deletedAt: new Date(),
        },
        where: {
          id: { in: productImageIds.productImageIds },
        },
      });

      const updatedImages = await prisma.productImage.findMany({
        where: { id: { in: existingImageIds } },
      });

      const productImages = updatedImages.map((productImage) => {
        return {
          id: productImage.id,
          url: productImage.url,
          productId: productImage.productId,
          createdAt: productImage.createdAt,
          updatedAt: productImage.updatedAt || null,
          deletedAt: productImage.deletedAt || null,
        };
      }) as ProductImagesResponse[];
      return productImages;
    });

    return result;
  }
  async deleteSoftCart(dto: DeleteSoftCartRequest): Promise<void> {
    try {
      const cartByUser = await this.prismaService.client.cart.findUnique({
        where: {
          userId: dto.userId,
        },
      });
      if (cartByUser) {
        await this.prismaService.client.cart.update({
          where: {
            userId: dto.userId,
          },
          data: {
            deletedAt: new Date(),
          },
        });
      }
    } catch (error) {
      return handleServiceError(error, ProductService.name, 'deleteSoftCart', this.loggerService);
    }
  }
  async addProductCart(dto: AddProductCartRequest): Promise<BaseResponse<CartSummaryResponse>> {
    try {
      const payload = plainToInstance(AddProductCartRequest, dto);
      await validateOrReject(payload);
      const cart = await this.prismaService.client.cart.upsert({
        where: { userId: dto.userId },
        create: { userId: dto.userId },
        update: {},
      });
      const productVariant = await this.prismaService.client.productVariant.findUnique({
        where: { id: dto.productVariantId },
        select: {
          id: true,
          price: true,
          product: { select: { quantity: true } },
        },
      });
      if (!productVariant) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.product.notFound',
        });
      }
      const existingItem = await this.prismaService.client.cartItem.findUnique({
        where: {
          cartId_productVariantId: {
            cartId: cart.id,
            productVariantId: dto.productVariantId,
          },
        },
      });
      const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
      if (dto.quantity + currentQuantityInCart > productVariant.product.quantity) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.quantityNotEnough',
        });
      }
      if (existingItem) {
        await this.prismaService.client.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + dto.quantity },
        });
      } else {
        await this.prismaService.client.cartItem.create({
          data: {
            quantity: dto.quantity,
            cartId: cart.id,
            productVariantId: dto.productVariantId,
          },
        });
      }
      const cartSummary = await this.prismaService.client.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              productVariant: { select: { id: true, price: true } },
            },
          },
        },
      });
      return buildBaseResponse(StatusKey.SUCCESS, this.toCartSummaryResponse(cartSummary));
    } catch (error) {
      handleServiceError(error, ProductService.name, 'addProductCart', this.loggerService);
    }
  }
  async deleteProductCart(
    dto: DeleteProductCartRequest,
  ): Promise<BaseResponse<CartSummaryResponse>> {
    try {
      const payload = plainToInstance(DeleteProductCartRequest, dto);
      await validateOrReject(payload);
      const cartDetail = await this.prismaService.client.cart.findUnique({
        where: {
          userId: dto.userId,
        },
      });
      if (!cartDetail) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.cart.notFound',
        });
      }
      const productVariants = await this.prismaService.client.productVariant.findMany({
        where: { id: { in: dto.productVariantIds } },
        select: { id: true },
      });
      const existingIds = productVariants.map((v) => v.id);
      if (existingIds.length !== dto.productVariantIds.length) {
        const notFoundProductVariantIds = dto.productVariantIds.filter(
          (id) => !existingIds.includes(id),
        );
        if (notFoundProductVariantIds.length > 0) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.NOT_FOUND,
            message: 'common.product.someProductNotExist',
            args: {
              missingIds: notFoundProductVariantIds.join(', '),
            },
          });
        }
      }
      await this.prismaService.client.cartItem.deleteMany({
        where: {
          cartId: cartDetail.id,
          productVariantId: { in: dto.productVariantIds },
        },
      });
      const cartSummary = await this.prismaService.client.cart.findUniqueOrThrow({
        where: { id: cartDetail.id },
        include: {
          items: {
            include: {
              productVariant: { select: { id: true, price: true } },
            },
          },
        },
      });
      return buildBaseResponse(StatusKey.SUCCESS, this.toCartSummaryResponse(cartSummary));
    } catch (error) {
      handleServiceError(error, ProductService.name, 'deleteProductCart', this.loggerService);
    }
  }
  private toCartSummaryResponse(
    cartSummary: Cart & {
      items: (CartItem & { productVariant: { id: number; price: Decimal } })[];
    },
  ): CartSummaryResponse {
    return {
      cartId: cartSummary.id,
      userId: cartSummary.userId,
      cartItems: cartSummary.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        productVariant: {
          id: item.productVariant.id,
          price: Number(item.productVariant.price),
        },
      })),
      totalQuantity: cartSummary.items.reduce((total, item) => total + item.quantity, 0),
      totalAmount: cartSummary.items.reduce(
        (total, item) => total + item.quantity * Number(item.productVariant.price),
        0,
      ),
    };
  }
}
