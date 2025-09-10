import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '@app/prisma';
import {
  Cart,
  CartItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  Product,
  ProductStatus,
} from '../generated/prisma';
import { MAX_IMAGES } from '@app/common/constant/cloudinary';
import { NOTIFICATION_SERVICE } from '@app/common';
import { SupportedLocalesType } from '@app/common/constant/locales.constant';
import {
  EXPIRE_TIME_PAYMENT_DEFAULT,
  TIMEOUT_TRANSACTION_WITH_3RD,
} from '@app/common/constant/time.constant';
import { PaginationDto } from '@app/common/dto/pagination.dto';
import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';
import { CreateProductImagesServiceDto } from '@app/common/dto/product/create-product-images.dto';
import { CreateProductDto } from '@app/common/dto/product/create-product.dto';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { DeleteProductCategoryDto } from '@app/common/dto/product/delete-product-category.dto';
import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';
import { skuIdProductDto } from '@app/common/dto/product/delete-product.dto';
import { UpdateProductCategoryDto } from '@app/common/dto/product/update-product-category.dto';
import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { PaymentPaidPayloadDto } from '@app/common/dto/product/payload/payment-paid.payload';
import { PayOSPayloadPayoutDto } from '@app/common/dto/product/payload/payos-payload-payout';
import { AddProductCartRequest } from '@app/common/dto/product/requests/add-product-cart.request';
import { DeleteProductCartRequest } from '@app/common/dto/product/requests/delete-product-cart.request';
import { DeleteSoftCartRequest } from '@app/common/dto/product/requests/delete-soft-cart.request';
import { GetCartRequest } from '@app/common/dto/product/requests/get-cart.request';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';
import { DeleteReviewDto } from '@app/common/dto/product/requests/delete-review.dto';
import { GetProductReviewsDto } from '@app/common/dto/product/requests/get-product-reviews.dto';
import { DeleteReviewResponse } from '@app/common/dto/product/response/delete-review.response';
import {
  ProductResponse,
  UserProductResponse,
} from '@app/common/dto/product/response/product-response';
import {
  ProductDetailResponse,
  UserProductDetailResponse,
} from '@app/common/dto/product/response/product-detail-reponse';
import { OrderCreatedPayload } from '@app/common/dto/product/payload/order-created.payload';
import { PayOSPayloadDto } from '@app/common/dto/product/payload/payos-payload';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { OrderUpdatePaymentInfo } from '@app/common/dto/product/requests/order-update-payment-info.request';
import { PaymentCreationRequestDto } from '@app/common/dto/product/requests/payment-creation.request';
import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';
import { CartSummaryResponse } from '@app/common/dto/product/response/cart-summary.response';
import {
  CategoryResponse,
  ChildCategories,
  RootCategory,
} from '@app/common/dto/product/response/category-response';
import {
  OrderResponse,
  PaymentInfoResponse,
} from '@app/common/dto/product/response/order-response';
import { PayOSCreatePaymentResponseDto } from '@app/common/dto/product/response/payos-creation.response';
import { PaymentPaidResponse } from '@app/common/dto/product/response/payment-paid.response';
import { PayBalanceResponseDto } from '@app/common/dto/product/response/payos-balance.response';
import { PayOSPayoutPaymentResponseDto } from '@app/common/dto/product/response/payos-payout-creation.response';
import { PayOSWebhookDTO } from '@app/common/dto/product/response/payos-webhook.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';
import { ProductWithCategories } from '@app/common/dto/product/response/product-with-categories.interface';
import { RejectOrderResponse } from '@app/common/dto/product/response/reject-order.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { REJECT_ORDER_STATUS } from '@app/common/enums/order.enum';
import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { NotificationEvent } from '@app/common/enums/queue/order-event.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import {
  CreateReviewResponse,
  ReviewResponse,
} from '@app/common/dto/product/response/review-response.dto';
import { PaymentCreationException } from '@app/common/exceptions/payment-creation-exception';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { ProductWithIncludes } from '@app/common/types/product.type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PaginationService } from '@app/common/shared/pagination.shared';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { handleServiceError } from '@app/common/utils/prisma-client-error';
import { getRemainingTime, parseExpireTime } from '@app/common/utils/date.util';
import { handlePrismaError } from '@app/common/utils/prisma-client-error';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { OrderItemInputForNested, OrderWithItems } from 'apps/product-service/src/type/order.type';
import axios, { AxiosResponse } from 'axios';
import { instanceToPlain } from 'class-transformer';
import { Order, OrderItem, Payment, PaymentType, Prisma } from '../generated/prisma';
import { INCLUDE_ORDER_RESPONSE } from './constants/include-order.response';
import { ProductProducer } from './product.producer';
import { ConfirmOrderRequest } from '@app/common/dto/product/requests/confirm-order.request';
import { RetryPaymentRequest } from '@app/common/dto/product/requests/retry-payment.requqest';
import { I18nService } from 'nestjs-i18n';
import * as crypto from 'crypto';
@Injectable()
export class ProductService {
  constructor(
    private readonly prismaService: PrismaService<PrismaClient>,
    private readonly loggerService: CustomLogger,
    private readonly paginationService: PaginationService,
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
    private readonly productProducer: ProductProducer,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationClient: ClientProxy,
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

  async deleteProduct(skuId: skuIdProductDto): Promise<Product | null> {
    try {
      const dto = plainToInstance(skuIdProductDto, skuId);
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

  async getById(skuId: skuIdProductDto): Promise<ProductDetailResponse | null> {
    try {
      const dto = plainToInstance(skuIdProductDto, skuId);
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
          startDate: variant.startDate ?? null,
          endDate: variant.endDate ?? null,
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
      handleServiceError(error, ProductService.name, 'deleteSoftCart', this.loggerService);
    }
  }
  async listProductsForUser(
    query: GetAllProductUserDto,
  ): Promise<PaginationResult<UserProductResponse>> {
    const dto = plainToInstance(GetAllProductUserDto, query);
    await validateOrReject(dto);
    const { page, pageSize } = query;
    const where = this.buildUserProductWhereClause(query);

    const products = await this.paginationService.queryWithPagination(
      this.prismaService.client.product,
      { page, pageSize },
      {
        orderBy: { createdAt: 'asc' },
        where,
        include: {
          images: true,
          categories: { include: { category: true } },
          variants: { include: { size: true } },
          reviews: true,
        },
      },
    );

    if (products.items.length === 0) {
      return {
        items: [],
        paginations: products.paginations,
      };
    }
    const result = (products.items as ProductWithIncludes[]).map((product) => {
      return {
        id: product.id,
        skuId: product.skuId,
        name: product.name,
        description: product.description ?? '',
        status: product.status,
        basePrice: product.basePrice ?? 0,
        quantity: product.quantity ?? 0,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt ?? null,
        deletedAt: product.deletedAt ?? null,
        images: product.images?.length ? product.images : [],
        categories: product.categories?.length ? product.categories : [],
        variants: product.variants?.length ? product.variants : [],
        reviews: product.reviews?.length ? product.reviews : [],
      };
    });
    return {
      items: result as UserProductResponse[],
      paginations: products.paginations,
    };
  }

  private buildUserProductWhereClause(query: GetAllProductUserDto) {
    const { name, rootCategoryId, categoryId, minPrice, maxPrice, rating } = query;
    const where = {
      deletedAt: null,
      status: ProductStatus.IN_STOCK,
      ...(name && { name: { contains: name } }),
      ...(rootCategoryId || categoryId
        ? {
            categories: {
              some: {
                OR: [
                  ...(rootCategoryId ? [{ category: { id: rootCategoryId, parentId: null } }] : []),
                  ...(categoryId
                    ? [{ category: { id: categoryId, parentId: rootCategoryId } }]
                    : []),
                ],
              },
            },
          }
        : {}),
      ...(minPrice || maxPrice
        ? {
            variants: {
              some: {
                price: {
                  ...(minPrice && { gte: Number(minPrice) }),
                  ...(maxPrice && { lte: Number(maxPrice) }),
                },
              },
            },
          }
        : {}),
      ...(rating
        ? {
            reviews: {
              some: { rating: { gte: rating } },
            },
          }
        : {}),
    };
    return where;
  }

  async getProductDetailForUser(skuId: skuIdProductDto): Promise<UserProductDetailResponse | null> {
    try {
      const dto = plainToInstance(skuIdProductDto, skuId);
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
          reviews: true,
        },
      });

      if (!product) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productNotFound',
        });
      }

      const groupedCategories = await this.groupedCategories(product);

      const result: UserProductDetailResponse = {
        id: product.id,
        name: product.name,
        skuId: product.skuId,
        description: product.description ?? '',
        basePrice: product.basePrice ?? 0,
        status: product.status as StatusProduct,
        quantity: product.quantity ?? 0,
        images: product.images.map((image) => ({
          id: image.id,
          url: image.url ?? '',
        })),
        categories: groupedCategories ?? [],
        variants: product.variants.map((variant) => ({
          id: variant.id,
          price: variant.price ?? 0,
          startDate: variant.startDate ?? null,
          endDate: variant.endDate ?? null,
          size: {
            id: String(variant.size.id),
            nameSize: variant.size.nameSize ?? '',
            description: variant.size.description ?? '',
          },
        })),
        reviews: product.reviews.map((review) => ({
          id: review.id,
          rating: review.rating ?? 0,
          comment: review.comment ?? '',
          createdAt: review.createdAt,
          updatedAt: review.updatedAt ?? null,
          userId: review.userId,
          productId: review.productId,
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
  async createReview(
    skuId: string,
    createReviewData: CreateReviewDto,
    userId: number,
  ): Promise<CreateReviewResponse> {
    try {
      const validationData = plainToInstance(CreateReviewDto, createReviewData);
      await validateOrReject(validationData);

      const product = await this.prismaService.client.product.findFirst({
        where: {
          skuId: skuId,
          deletedAt: null,
        },
      });

      if (!product) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productNotFound',
        });
      }

      const existingReview = await this.prismaService.client.review.findFirst({
        where: {
          userId: userId,
          productId: product.id,
        },
      });

      if (existingReview) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.review.error.alreadyReviewed',
        });
      }

      const newReview = await this.prismaService.client.review.create({
        data: {
          rating: new Decimal(validationData.rating),
          comment: validationData.comment,
          userId: userId,
          productId: product.id,
        },
      });

      return {
        id: newReview.id,
        rating: parseFloat(newReview.rating.toString()),
        comment: newReview.comment || undefined,
        createdAt: newReview.createdAt,
        userId: newReview.userId,
        productId: newReview.productId,
      };
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }

      this.loggerService.error(
        'CreateReview',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );

      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async getProductReviews(
    skuId: string,
    getReviewsData: GetProductReviewsDto,
  ): Promise<PaginationResult<ReviewResponse>> {
    try {
      const validationData = plainToInstance(GetProductReviewsDto, getReviewsData);
      await validateOrReject(validationData);

      const product = await this.prismaService.client.product.findFirst({
        where: {
          skuId: skuId,
          deletedAt: null,
        },
      });

      if (!product) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.product.error.productNotFound',
        });
      }

      const { page, pageSize } = validationData;

      const reviews = await this.paginationService.queryWithPagination(
        this.prismaService.client.review,
        { page, pageSize },
        {
          where: {
            productId: product.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      );

      // Transform reviews to response format
      const reviewResponses: ReviewResponse[] = reviews.items.map((review) => ({
        id: review.id,
        rating: review.rating.toNumber(),
        comment: review.comment || '',
        userId: review.userId,
        productId: review.productId,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt || undefined,
      }));

      const paginationResult: PaginationResult<ReviewResponse> = {
        items: reviewResponses,
        paginations: reviews.paginations,
      };

      return paginationResult;
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }

      this.loggerService.error(
        'GetProductReviews',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );

      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async deleteReview(deleteReviewData: DeleteReviewDto): Promise<DeleteReviewResponse> {
    try {
      const validationData = plainToInstance(DeleteReviewDto, deleteReviewData);
      await validateOrReject(validationData);

      const existingReview = await this.prismaService.client.review.findFirst({
        where: {
          id: validationData.reviewId,
          userId: validationData.userId,
          deletedAt: null,
        },
      });

      if (!existingReview) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.review.errors.reviewNotFound',
        });
      }

      const deletedReview = await this.prismaService.client.review.update({
        where: {
          id: existingReview.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        id: deletedReview.id,
        rating: parseFloat(deletedReview.rating.toString()),
        comment: deletedReview.comment ?? '',
        createdAt: deletedReview.createdAt,
        updatedAt: deletedReview.updatedAt ?? null,
        deletedAt: deletedReview.deletedAt as Date,
        userId: deletedReview.userId,
        productId: deletedReview.productId,
      };
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }
      this.loggerService.error(
        'DeleteReview',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      handleServiceError(error, ProductService.name, 'deleteReview', this.loggerService);
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
  async getCart(dto: GetCartRequest): Promise<BaseResponse<CartSummaryResponse>> {
    try {
      const cartSummary = await this.prismaService.client.cart.findUnique({
        where: { userId: dto.userId },
        include: {
          items: {
            include: {
              productVariant: { select: { id: true, price: true } },
            },
          },
        },
      });
      if (cartSummary)
        return buildBaseResponse(StatusKey.SUCCESS, this.toCartSummaryResponse(cartSummary));
      const cartEmpty: CartSummaryResponse = {
        userId: dto.userId,
        cartItems: [],
        totalAmount: 0,
        totalQuantity: 0,
      };
      return buildBaseResponse(StatusKey.SUCCESS, cartEmpty);
    } catch (error) {
      handleServiceError(error, ProductService.name, 'getCart', this.loggerService);
    }
  }
  async createOrder(dto: OrderRequest): Promise<BaseResponse<OrderResponse>> {
    if (!dto.userId)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.guard.unauthorized',
      });
    if (!dto.items.length) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.order.itemsMustAtLeast1',
      });
    }
    const productVariantIds = dto.items.map((item) => item.productVariantId);
    const productVariantExist = await this.prismaService.client.productVariant.findMany({
      where: {
        id: {
          in: dto.items.map((item) => item.productVariantId),
        },
      },
      include: {
        product: {
          select: {
            quantity: true,
          },
        },
      },
    });
    if (productVariantExist.length !== productVariantIds.length) {
      const productVariantExistIds = productVariantExist.map((item) => item.id);
      const notFoundProductVariantIds = productVariantIds.filter(
        (id) => !productVariantExistIds.includes(id),
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.product.someProductNotExist',
        args: {
          missingIds: notFoundProductVariantIds.join(', '),
        },
      });
    }
    const productMap = new Map(productVariantExist.map((p) => [p.id, p]));
    const outOfStock = dto.items.filter((item) => {
      const product = productMap.get(item.productVariantId)!;
      return product.product.quantity < item.quantity;
    });
    if (outOfStock.length > 0) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.product.multipleOutOfStock',
        args: { productIds: outOfStock.map((p) => p.productVariantId) },
      });
    }
    const orderCreated = await this.prismaService.client.$transaction(async (tx) => {
      let totalPrice = 0;
      const orderItemsData: OrderItemInputForNested[] = [];
      for (const item of dto.items) {
        const product = productMap.get(item.productVariantId)!;
        const updated = await tx.product.updateMany({
          where: { id: product.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.BAD_REQUEST,
            message: 'common.product.productOutStock',
            args: {
              productId: product.productId,
            },
          });
        }
        const itemPrice = Number(product.price) * item.quantity;
        totalPrice += itemPrice;
        orderItemsData.push({
          amount: itemPrice,
          productVariant: {
            connect: {
              id: product.id,
            },
          },
          quantity: item.quantity,
          note: item.note,
        });
      }
      const order = await tx.order.create({
        data: {
          amount: totalPrice,
          deliveryAddress: dto.deliveryAddress,
          note: dto.note,
          paymentMethod: dto.paymentMethod,
          paymentStatus: (dto.paymentMethod === PaymentMethodEnum.CASH
            ? PaymentStatus.UNPAID
            : PaymentStatus.PENDING) as PaymentStatus,
          status: OrderStatus.PENDING,
          userId: dto.userId,
          items: { create: orderItemsData },
        },
        include: INCLUDE_ORDER_RESPONSE,
      });
      return order;
    });
    const orderResponse = this.toOrderResponse(orderCreated);
    if (orderCreated.paymentMethod === PaymentMethod.CASH) {
      const customerName = `CustomerId:${orderCreated.userId}`;
      const payload: OrderCreatedPayload = {
        orderId: orderCreated.id,
        userId: orderCreated.userId,
        userName: customerName,
        totalAmount: Number(orderCreated.amount),
        paymentMethod: orderCreated.paymentMethod,
        paymentStatus: orderCreated.paymentStatus,
        createdAt: orderCreated.createdAt,
        lang: dto.lang,
      };
      this.notificationClient.emit(NotificationEvent.ORDER_CREATED, payload);
    } else if (orderCreated.paymentMethod === PaymentMethod.BANK_TRANSFER) {
      const expireTime = this.configService.get<string>(
        'payOS.expireTime',
        EXPIRE_TIME_PAYMENT_DEFAULT,
      );
      const expireSeconds = parseExpireTime(expireTime);
      const expiredAt = Math.floor(Date.now() / 1000) + expireSeconds;
      const paymentPayload: PaymentCreationRequestDto = {
        amount: Number(orderCreated.amount),
        orderId: orderCreated.id,
        userId: orderCreated.userId,
        description: `PAY FOR ORDER-${orderCreated.id}`,
        expiredAt: expiredAt,
      };
      try {
        const paymentData = await this.createPaymentInfo(paymentPayload);
        const paymentInfoData: PaymentInfoResponse = {
          qrCodeUrl: paymentData.data.checkoutUrl,
          expiredAt: getRemainingTime(expiredAt, dto.lang, this.i18nService),
        };
        orderResponse.paymentInfo = paymentInfoData;
        await this.productProducer.addJobHandleExpiredPaymentOrder(orderCreated.id, expiredAt);
      } catch (error) {
        this.loggerService.error(
          `[Failed to create payment info]`,
          `Error details:: ${(error as Error).message}]`,
        );
        if (error instanceof TypedRpcException) {
          if (error.getError().code === HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK) {
            this.loggerService.error(`[Push noti user waiting retry payment - retry payment]`);
            await this.productProducer.addJobRetryPayment(dto.lang, paymentPayload);
          }
        }
      }
    }
    return buildBaseResponse(StatusKey.SUCCESS, orderResponse);
  }
  async updateOrderPaymentInfo(dto: OrderUpdatePaymentInfo): Promise<OrderResponse> {
    try {
      const orderDetail = await this.prismaService.client.order.update({
        where: { id: dto.orderId },
        data: { paymentStatus: PaymentStatus.PENDING },
        include: INCLUDE_ORDER_RESPONSE,
      });
      return this.toOrderResponse(orderDetail);
    } catch (error) {
      handlePrismaError(error, ProductService.name, 'updateOrderPaymentInfo', this.loggerService);
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
  async createPaymentInfo(dto: PaymentCreationRequestDto): Promise<PayOSCreatePaymentResponseDto> {
    const orderDetail = await this.prismaService.client.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!orderDetail)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      });
    try {
      const payload = {
        orderCode: dto.orderId,
        amount: dto.amount,
        description: dto.description ?? '',
        expiredAt: dto.expiredAt,
        returnUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/success',
      };
      const signature = this.signPayload(payload);
      const endpoint = `${this.configService.get<string>('payOS.endpoint', '')}/v2/payment-requests`;
      const clientId = this.configService.get<string>('payOS.clientId', '');
      const apiKey = this.configService.get<string>('payOS.apiKey', '');
      const data = {
        ...payload,
        signature,
      };
      const options = {
        headers: {
          'x-client-id': clientId,
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      };
      const response: AxiosResponse<PayOSCreatePaymentResponseDto> = await axios.post(
        endpoint,
        data,
        options,
      );
      if (!response.data.data) {
        throw new PaymentCreationException(response.data.desc || 'Payment creation failed');
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.loggerService.error(
          `[Create payment error]`,
          `Error detail:: ${(error as Error).stack}`,
        );
        if (
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNREFUSED' ||
          !error.response
        ) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK,
            message: 'common.errors.timeOutOrNetwork',
          });
        }
      }
      this.loggerService.error(
        `[Create payment error]`,
        `Error detail:: ${(error as Error).message}`,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }
  async retryPayment(dto: RetryPaymentRequest): Promise<BaseResponse<PaymentInfoResponse>> {
    const orderDetail = await this.prismaService.client.order.findUnique({
      where: { id: dto.orderId, userId: dto.userId, paymentMethod: PaymentMethod.BANK_TRANSFER },
    });
    // Chung 1 throw lỗi là not found -> không throw lỗi chi tiết có order với id mã này dù truy cập trái phép, không phải là order thanh toán bởi bank transfer
    if (!orderDetail)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      });
    const expireTime = this.configService.get<string>(
      'payOS.expireTime',
      EXPIRE_TIME_PAYMENT_DEFAULT,
    );
    const expireSeconds = parseExpireTime(expireTime);
    const expiredAt = Math.floor(Date.now() / 1000) + expireSeconds;
    const paymentPayload: PaymentCreationRequestDto = {
      amount: Number(orderDetail.amount),
      orderId: orderDetail.id,
      userId: orderDetail.userId,
      description: `PAY FOR ORDER-${orderDetail.id}`,
      expiredAt: expiredAt,
    };
    try {
      const paymentData = await this.createPaymentInfo(paymentPayload);
      const paymentInfoData: PaymentInfoResponse = {
        qrCodeUrl: paymentData.data.checkoutUrl,
        expiredAt: getRemainingTime(expiredAt, dto.lang, this.i18nService),
      };
      return buildBaseResponse(StatusKey.SUCCESS, paymentInfoData);
    } catch (error) {
      this.loggerService.error(
        `[Failed to create payment info]`,
        `Add job retry payment [Error:: ${(error as Error).message}] - push noti, waiting create payment for user`,
      );
      if (error instanceof TypedRpcException) {
        if (error.getError().code === HTTP_ERROR_CODE.TIME_OUT_OR_NETWORK) {
          await this.productProducer.addJobRetryPayment(dto.lang, paymentPayload);
        }
      }
      throw error;
    }
  }
  toOrderResponse(data: OrderWithItems, paymentInfo?: PaymentInfoResponse): OrderResponse {
    return {
      id: data.id,
      userId: data.userId,
      deliveryAddress: data.deliveryAddress,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus,
      status: data.status,
      totalPrice: Number(data.amount),
      note: data.note ?? null,
      items: data.items.map((item) => ({
        id: item.id,
        productVariantId: item.productVariantId,
        productName: item.productVariant.product.name,
        productSize: item.productVariant.size.nameSize,
        quantity: item.quantity,
        price: Number(item.productVariant.price),
        note: item.note ?? null,
      })),
      paymentInfo,
      createdAt: data.createdAt,
    };
  }
  async handleWebhookCallbackPayment(
    payload: PayOSWebhookDTO,
  ): Promise<BaseResponse<PaymentPaidResponse>> {
    // Fallback để trả set url fallback webhook mỗi khi ngrok 1 url mới
    // if (payload.code == '00') {
    //   return { code: '00', desc: 'success' };
    // }
    const plaintData = instanceToPlain(payload.data) as Record<string, unknown>;
    const verified = this.isValidData(plaintData, payload.signature);
    if (!verified)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'Invalid signatrue',
      });
    if (payload.success && payload.code === '00') {
      console.log('Raw data response:: ', payload.data);
      const paymentPaidPayload: PaymentPaidPayloadDto = {
        orderId: payload.data.orderCode,
        amount: payload.data.amount,
        method: PaymentMethod.BANK_TRANSFER,
        accountNumber: payload.data.accountNumber,
        reference: payload.data.reference,
        counterAccountBankId: payload.data.counterAccountBankId,
        counterAccounName: payload.data.counterAccountName,
        counterAccountNumber: payload.data.counterAccountNumber,
      };
      console.log('Payment paid payload:: ', paymentPaidPayload);
      this.loggerService.debug(`Booking ${payload.data.orderCode} thanh toán thành công`);
      const { orderDetail, paymentDetail } = await this.handlePaymentPaid(paymentPaidPayload);
      const paymentResponse: PaymentPaidResponse = {
        status: PaymentStatus.PAID,
        info: {
          amount: Number(paymentDetail.amount),
          referenceCode: paymentDetail.transactionCode,
          paidAt: paymentDetail.createdAt,
        },
      };
      const payloadNotifi = this.buildOrderCreatedPayload(
        orderDetail,
        PaymentMethod.BANK_TRANSFER,
        paymentDetail.status,
        'en',
      );
      await this.productProducer.clearScheduleHandleExpiredPayment(orderDetail.id);
      this.notificationClient.emit(NotificationEvent.ORDER_CREATED, payloadNotifi);
      return buildBaseResponse(StatusKey.SUCCESS, paymentResponse);
    } else {
      this.loggerService.debug(`Booking ${payload.data.orderCode} thanh toán thất bại`);
      const paymentResponse: PaymentPaidResponse = {
        status: PaymentStatus.FAILED,
      };
      return buildBaseResponse(StatusKey.FAILED, paymentResponse);
    }
  }
  async handlePaymentPaid(payload: PaymentPaidPayloadDto): Promise<{
    orderDetail: Order;
    paymentDetail: Payment;
  }> {
    try {
      const orderDetail = await this.prismaService.client.order.findUnique({
        where: { id: payload.orderId },
      });
      if (!orderDetail)
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.order.notFound',
        });
      const paymentData: Prisma.PaymentCreateInput = {
        order: {
          connect: {
            id: orderDetail.id,
          },
        },
        amount: payload.amount,
        transactionCode: payload.reference,
        accountNumber: payload.counterAccountNumber,
        bankCode: payload.counterAccountBankId,
        paymentType: PaymentType.PAYIN,
        status: PaymentStatus.PAID,
      };
      const paymentCreated = await this.prismaService.client.$transaction(async (tx) => {
        await tx.order.update({
          where: {
            id: orderDetail.id,
          },
          data: {
            paymentStatus: PaymentStatus.PAID,
          },
        });
        return tx.payment.create({
          data: paymentData,
        });
      });
      return {
        orderDetail: orderDetail,
        paymentDetail: paymentCreated,
      };
    } catch (error) {
      handleServiceError(
        error,
        ProductService.name,
        'handleWebhookCallbackPayment',
        this.loggerService,
      );
    }
  }
  async handleExpirePaymentOrder(orderId: number) {
    const orderDetail = await this.prismaService.client.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
      },
    });
    if (!orderDetail) {
      this.loggerService.error(
        `[Handle expired payment order (${orderId})] Failed`,
        `Cause:: Order not found`,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      });
    }
    if (orderDetail.status === OrderStatus.CANCELLED) {
      this.loggerService.error(
        `[Handle expired payment order (${orderId})] Failed`,
        `Cause:: Order is cancelled`,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.order.cancelled',
      });
    }
    try {
      await this.prismaService.client.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: {
            orderId: orderDetail.id,
            paymentType: PaymentType.PAYIN,
          },
          data: {
            status: PaymentStatus.CANCELLED,
          },
        });
        await tx.order.update({
          where: {
            id: orderDetail.id,
          },
          data: {
            paymentStatus: PaymentStatus.CANCELLED,
            status: OrderStatus.CANCELLED,
          },
        });
        for (const item of orderDetail.items) {
          await tx.product.updateMany({
            where: {
              variants: {
                some: {
                  id: item.productVariantId,
                },
              },
            },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
      });
    } catch (error) {
      handleServiceError(
        error,
        ProductService.name,
        'handleExpirePaymentOrder',
        this.loggerService,
      );
    }
  }
  async rejectOrder(dto: RejectOrderRequest): Promise<BaseResponse<RejectOrderResponse>> {
    const orderDetail = await this.prismaService.client.order.findUnique({
      where: {
        id: dto.orderId,
      },
      include: {
        ...INCLUDE_ORDER_RESPONSE,
        items: true,
      },
    });
    if (!orderDetail)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.order.notFound',
      });
    if (orderDetail.status === OrderStatus.CANCELLED) {
      const response: RejectOrderResponse = {
        status: REJECT_ORDER_STATUS.UNCHANGED,
        description: 'Order has been rejected',
        orderId: orderDetail.id,
      };
      return buildBaseResponse(StatusKey.UNCHANGED, response);
    }
    if (orderDetail.paymentMethod === PaymentMethodEnum.CASH) {
      try {
        await this.prismaService.client.$transaction(async (tx) => {
          for (const item of orderDetail.items) {
            await tx.product.updateMany({
              where: {
                variants: {
                  some: {
                    id: item.productVariantId,
                  },
                },
              },
              data: {
                quantity: {
                  increment: item.quantity,
                },
              },
            });
          }
          await tx.payment.updateMany({
            where: {
              orderId: orderDetail.id,
              paymentType: PaymentType.PAYIN,
            },
            data: {
              status: PaymentStatus.CANCELLED,
            },
          });
          await tx.order.update({
            where: {
              id: orderDetail.id,
            },
            data: {
              paymentStatus: PaymentStatus.CANCELLED,
              status: OrderStatus.CANCELLED,
            },
          });
        });
        this.loggerService.log(
          `[Reject order(${orderDetail.id}) successfully]`,
          `Order rejected by Admin:${dto.userId}`,
        );
        const response: RejectOrderResponse = {
          status: REJECT_ORDER_STATUS.SUCCESS,
          orderId: orderDetail.id,
          paymentMethod: PaymentMethodEnum.CASH,
          rejectedAt: new Date(),
        };
        return buildBaseResponse(StatusKey.SUCCESS, response);
      } catch (error) {
        handleServiceError(error, ProductService.name, 'rejectOrder', this.loggerService);
      }
    } else if (orderDetail.paymentMethod === PaymentMethodEnum.BANK_TRANSFER) {
      if (orderDetail.paymentStatus === PaymentStatus.PENDING) {
        try {
          await this.prismaService.client.$transaction(async (tx) => {
            for (const item of orderDetail.items) {
              await tx.product.updateMany({
                where: {
                  variants: {
                    some: {
                      id: item.productVariantId,
                    },
                  },
                },
                data: {
                  quantity: {
                    increment: item.quantity,
                  },
                },
              });
            }
            await tx.payment.updateMany({
              where: {
                orderId: orderDetail.id,
                paymentType: PaymentType.PAYIN,
              },
              data: {
                status: PaymentStatus.CANCELLED,
              },
            });
            await tx.order.update({
              where: {
                id: orderDetail.id,
              },
              data: {
                paymentStatus: PaymentStatus.CANCELLED,
                status: OrderStatus.CANCELLED,
              },
            });
          });
          this.loggerService.log(
            `[Reject order(${orderDetail.id}) successfully]`,
            `Order rejected by Admin:${dto.userId}`,
          );
          const response: RejectOrderResponse = {
            status: REJECT_ORDER_STATUS.SUCCESS,
            orderId: orderDetail.id,
            paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
            rejectedAt: new Date(),
          };
          return buildBaseResponse(StatusKey.SUCCESS, response);
        } catch (error) {
          handleServiceError(error, ProductService.name, 'rejectOrder', this.loggerService);
        }
      }
      try {
        const paymentRefuned: PayOSPayoutPaymentResponseDto = await this.createPayoutOrder(
          orderDetail.id,
          orderDetail.items,
        );
        const payoutInfo = paymentRefuned.data.transactions[0];
        const response: RejectOrderResponse = {
          status: REJECT_ORDER_STATUS.SUCCESS,
          orderId: orderDetail.id,
          paymentMethod: PaymentMethodEnum.BANK_TRANSFER,
          rejectedAt: new Date(),
          payoutInfo: {
            bankCode: payoutInfo.toBin,
            toAccountNumber: payoutInfo.toAccountNumber,
            transactionCode: paymentRefuned.data.referenceId,
            amountRefunded: payoutInfo.amount,
            userId: dto.userId,
            userRejectId: dto.userId,
          },
        };
        return buildBaseResponse(StatusKey.SUCCESS, response);
      } catch (error) {
        handleServiceError(error, ProductService.name, 'rejectOrder', this.loggerService);
      }
    } else {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.order.unSupportedPaymentMethod',
      });
    }
  }
  async confirmOrder(dto: ConfirmOrderRequest): Promise<BaseResponse<OrderResponse>> {
    try {
      const orderDetail = await this.prismaService.client.order.findUnique({
        where: {
          id: dto.orderId,
        },
        include: {
          ...INCLUDE_ORDER_RESPONSE,
        },
      });
      if (!orderDetail)
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.order.notFound',
        });
      if (
        orderDetail.paymentMethod === PaymentMethodEnum.BANK_TRANSFER &&
        orderDetail.paymentStatus === PaymentStatus.PENDING
      ) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.order.orderPendingPayment',
        });
      }
      if (orderDetail.status === OrderStatus.CONFIRMED)
        return buildBaseResponse(StatusKey.UNCHANGED, this.toOrderResponse(orderDetail));
      await this.prismaService.client.order.update({
        where: {
          id: dto.orderId,
        },
        data: {
          status: OrderStatus.CONFIRMED,
        },
      });
      orderDetail.status = OrderStatus.CONFIRMED;
      this.loggerService.log(`[Order(${orderDetail.id}) has confirmed by AdminId: ${dto.userId}]`);
      return buildBaseResponse(StatusKey.SUCCESS, this.toOrderResponse(orderDetail));
    } catch (error) {
      handleServiceError(error, ProductService.name, 'confirmOrder', this.loggerService);
    }
  }
  async createPayoutOrder(
    orderId: number,
    itemsProduct: OrderItem[],
  ): Promise<PayOSPayoutPaymentResponseDto> {
    const paymentDetail = await this.prismaService.client.payment.findFirst({
      where: {
        orderId: orderId,
        status: PaymentStatus.PAID,
      },
    });
    if (!paymentDetail)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.payment.notFound',
      });
    const paymentRefuned = await this.prismaService.client.payment.findFirst({
      where: {
        orderId: orderId,
        transactionCode: paymentDetail.transactionCode,
        paymentType: PaymentType.PAYOUT,
      },
    });
    if (paymentRefuned)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.payment.refunded',
      });
    const idempotencyKey = `payout_${Date.now()}`;
    const payload = {
      referenceId: paymentDetail.transactionCode,
      amount: parseInt(String(paymentDetail.amount), 10),
      description: `REFUNED ORDER${paymentDetail.orderId}`,
      toBin: paymentDetail.bankCode,
      toAccountNumber: paymentDetail.accountNumber,
    };
    const signature = this.signPayloadPayout(payload);
    const endpoint = this.configService.get<string>('payOS.endpoint', '');
    const clientId = this.configService.get<string>('payOS.payout.clientId', '');
    const apiKey = this.configService.get<string>('payOS.payout.apiKey', '');
    const endpointPayout = `${endpoint}/v1/payouts`;
    const endpointBalance = `${endpoint}/v1/payouts-account/balance`;
    const balanceBank: AxiosResponse<PayBalanceResponseDto> = await axios.get(endpointBalance, {
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
      },
    });
    if (!balanceBank.data.data) {
      throw new PaymentCreationException(balanceBank.data.desc || 'Payment payout creation failed');
    }
    if (balanceBank.data.data.balance < Number(paymentDetail.amount)) {
      this.loggerService.error(
        'CreatePayoutOrder',
        `Balance not enough: ${Number(paymentDetail.amount)}`,
        `Order ID: ${orderId}`,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.payment.balanceNotEnough',
      });
    }
    const paymentDataPayout: Prisma.PaymentCreateInput = {
      order: {
        connect: {
          id: orderId,
        },
      },
      amount: Number(paymentDetail.amount),
      transactionCode: paymentDetail.transactionCode,
      accountNumber: paymentDetail.accountNumber,
      bankCode: paymentDetail.bankCode,
      paymentType: PaymentType.PAYOUT,
      status: PaymentStatus.PENDING,
    };
    const options = {
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'x-idempotency-key': idempotencyKey,
        'x-signature': signature,
      },
    };
    return await this.prismaService.client.$transaction(
      async (tx) => {
        await tx.payment.create({
          data: paymentDataPayout,
        });
        await tx.order.update({
          where: {
            id: orderId,
          },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
            status: OrderStatus.CANCELLED,
          },
        });
        for (const item of itemsProduct) {
          await tx.product.updateMany({
            where: {
              variants: {
                some: {
                  id: item.productVariantId,
                },
              },
            },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
        const response: AxiosResponse<PayOSPayoutPaymentResponseDto> = await axios.post(
          endpointPayout,
          {
            ...payload,
          },
          options,
        );
        if (!response.data.data) {
          this.loggerService.error(
            `[Create payout order failed]`,
            `Detail:: ${response.data.desc}`,
          );
          throw new PaymentCreationException(
            response.data.desc || 'Payment payout creation failed',
          );
        }
        return response.data;
      },
      {
        timeout: TIMEOUT_TRANSACTION_WITH_3RD,
      },
    );
  }
  private signPayload(payload: PayOSPayloadDto): string {
    const rawData =
      `amount=${payload.amount}` +
      `&cancelUrl=${payload.cancelUrl}` +
      `&description=${payload.description}` +
      `&orderCode=${payload.orderCode}` +
      `&returnUrl=${payload.returnUrl}`;
    this.loggerService.debug(`RawData:: ${rawData}`);
    return crypto
      .createHmac('sha256', this.configService.get<string>('payOS.checkSumKey', ''))
      .update(rawData)
      .digest('hex');
  }
  private signPayloadPayout(payload: PayOSPayloadPayoutDto): string {
    const rawData =
      `amount=${payload.amount}` +
      `&description=${encodeURIComponent(payload.description)}` +
      `&referenceId=${payload.referenceId}` +
      `&toAccountNumber=${payload.toAccountNumber}` +
      `&toBin=${payload.toBin}`;
    this.loggerService.debug(`RawData:: ${rawData}`);
    return crypto
      .createHmac('sha256', this.configService.get<string>('payOS.payout.checkSumKey', ''))
      .update(rawData)
      .digest('hex');
  }
  public isValidData(data: Record<string, unknown>, currentSignature: string): boolean {
    const sortedDataByKey = this.sortObjDataByKey(data);
    const dataQueryStr = this.convertObjToQueryStr(sortedDataByKey);
    const checkSumKey = this.configService.get<string>('payOS.checkSumKey', '');
    const generatedSignature = crypto
      .createHmac('sha256', checkSumKey)
      .update(dataQueryStr)
      .digest('hex');
    return generatedSignature === currentSignature;
  }
  private sortObjDataByKey<T extends Record<string, unknown>>(object: T): Record<string, unknown> {
    return Object.keys(object)
      .sort()
      .reduce<Record<string, unknown>>((obj, key) => {
        obj[key] = object[key];
        return obj;
      }, {});
  }
  private convertObjToQueryStr(object: Record<string, unknown>): string {
    return Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .map((key) => {
        let value = object[key];
        if (Array.isArray(value)) {
          value = JSON.stringify(
            value.map((val) => this.sortObjDataByKey(val as Record<string, unknown>)),
          );
        }
        if (value === null || value === undefined || value === 'undefined' || value === 'null') {
          value = '';
        }
        const stringValue = String(value);
        return `${key}=${stringValue}`;
      })
      .join('&');
  }
  private buildOrderCreatedPayload(
    order: Order,
    paymentMethod: PaymentMethod,
    paymentStatus: PaymentStatus,
    lang: SupportedLocalesType,
  ): OrderCreatedPayload {
    const customerName = `CustomerId:${order.userId}`;
    const payload: OrderCreatedPayload = {
      orderId: order.id,
      userId: order.userId,
      userName: customerName,
      totalAmount: Number(order.amount),
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      createdAt: order.createdAt,
      lang: lang,
    };
    return payload;
  }
}
