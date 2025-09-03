import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import { PrismaClient, Product } from '../generated/prisma';
import { CreateProductDto } from '@app/common/dto/product/create-product.dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { Decimal } from '@prisma/client/runtime/library';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';

@Injectable()
export class ProductService {
  constructor(private readonly prismaService: PrismaService<PrismaClient>) {}

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
}
