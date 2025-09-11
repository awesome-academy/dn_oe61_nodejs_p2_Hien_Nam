import { PRODUCT_SERVICE } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { ProductDto } from '@app/common/dto/product/product.dto';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { I18nService } from 'nestjs-i18n';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { skuIdProductDto } from '@app/common/dto/product/delete-product.dto';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { ProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';
import { UpdateProductCategoryDto } from '@app/common/dto/product/update-product-category.dto';
import { DeleteProductCategoryDto } from '@app/common/dto/product/delete-product-category.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { CreateProductImagesDto } from '@app/common/dto/product/create-product-images.dto';
import { MAX_IMAGES } from '@app/common/constant/cloudinary';
import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';

@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    private readonly i18nService: I18nService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    input: ProductDto,
    files: Array<Express.Multer.File>,
  ): Promise<BaseResponse<ProductResponse>> {
    const productExists = await callMicroservice<BaseResponse<ProductResponse>>(
      this.productClient.send(ProductPattern.CHECK_PRODUCT_EXISTS, input.skuId),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (productExists) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.error.productExists'),
      );
    }

    if (!files || files.length === 0) {
      throw new BadRequestException(this.i18nService.translate('common.product.error.filesExists'));
    }

    const imagesUrl = await this.cloudinaryService.uploadImagesToCloudinary(files);

    const create = await callMicroservice<ProductResponse>(
      this.productClient.send(ProductPattern.CREATE_PRODUCT, {
        productData: input,
        secureUrl: imagesUrl,
      }),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!create) {
      throw new BadRequestException(this.i18nService.translate('common.product.error.failed'));
    }

    return buildBaseResponse<ProductResponse>(StatusKey.SUCCESS, create);
  }

  async update(skuId: string, input: UpdateProductDto) {
    const product = await callMicroservice<BaseResponse<ProductResponse>>(
      this.productClient.send(ProductPattern.CHECK_PRODUCT_EXISTS, skuId),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!product) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.error.productNotFound'),
      );
    }

    const result = await callMicroservice<ProductResponse>(
      this.productClient.send(ProductPattern.UPDATE_PRODUCT, {
        payLoad: input,
        skuIdParam: skuId,
      }),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      this.i18nService.translate('common.product.action.update.failed');
    }

    return buildBaseResponse<ProductResponse>(StatusKey.SUCCESS, result);
  }

  async delete(skuId: skuIdProductDto): Promise<BaseResponse<ProductResponse>> {
    const product = await callMicroservice<BaseResponse<ProductResponse>>(
      this.productClient.send(ProductPattern.CHECK_PRODUCT_EXISTS, skuId.skuId),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!product) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.error.productNotFound'),
      );
    }

    const result = await callMicroservice<ProductResponse>(
      this.productClient.send(ProductPattern.DELETE_PRODUCT, { skuId: skuId.skuId }),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      this.i18nService.translate('common.product.action.delete.failed');
    }

    return buildBaseResponse<ProductResponse>(StatusKey.SUCCESS, result);
  }

  async getById(skuId: GetByIdProductDto): Promise<BaseResponse<ProductDetailResponse>> {
    const product = await callMicroservice<BaseResponse<ProductResponse>>(
      this.productClient.send(ProductPattern.CHECK_PRODUCT_EXISTS, skuId.skuId),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!product) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.error.productNotFound'),
      );
    }

    const result = await callMicroservice<ProductDetailResponse>(
      this.productClient.send(ProductPattern.GET_BY_ID, { skuId: skuId.skuId }),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      this.i18nService.translate('common.product.action.getById.failed');
    }

    return buildBaseResponse<ProductDetailResponse>(StatusKey.SUCCESS, result);
  }

  async getAll(query: {
    page: number;
    pageSize: number;
  }): Promise<BaseResponse<ProductResponse[]>> {
    const result = await callMicroservice<ProductResponse[]>(
      this.productClient.send(ProductPattern.GET_ALL, query),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      this.i18nService.translate('common.product.action.getAll.failed');
    }

    return buildBaseResponse<ProductResponse[]>(StatusKey.SUCCESS, result);
  }

  async createProductCategory(
    input: CreateProductCategoryDto,
  ): Promise<BaseResponse<ProductCategoryResponse>> {
    const result = await callMicroservice<ProductCategoryResponse>(
      this.productClient.send(ProductPattern.CREATE_PRODUCT_CATEGORY, input),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(
        this.i18nService.translate('common.productCategory.action.create.failed'),
      );
    }

    return buildBaseResponse<ProductCategoryResponse>(StatusKey.SUCCESS, result);
  }

  async updateProductCategory(
    input: UpdateProductCategoryDto,
  ): Promise<BaseResponse<ProductCategoryResponse>> {
    const result = await callMicroservice<ProductCategoryResponse>(
      this.productClient.send(ProductPattern.UPDATE_PRODUCT_CATEGORY, input),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(
        this.i18nService.translate('common.productCategory.action.update.failed'),
      );
    }

    return buildBaseResponse<ProductCategoryResponse>(StatusKey.SUCCESS, result);
  }

  async deleteProductCategory(
    input: DeleteProductCategoryDto,
  ): Promise<BaseResponse<ProductCategoryResponse>> {
    const result = await callMicroservice<ProductCategoryResponse>(
      this.productClient.send(ProductPattern.DELETE_PRODUCT_CATEGORY, input),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(
        this.i18nService.translate('common.productCategory.action.delete.failed'),
      );
    }

    return buildBaseResponse<ProductCategoryResponse>(StatusKey.SUCCESS, result);
  }

  async createProductImages(
    dto: CreateProductImagesDto,
    files: Array<Express.Multer.File>,
  ): Promise<BaseResponse<ProductImagesResponse[]>> {
    const productExists = await callMicroservice<ProductResponse>(
      this.productClient.send(ProductPattern.CHECK_PRODUCT_BY_ID, dto.productId),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!productExists) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.error.productNotFound'),
      );
    }

    if (!files || files.length === 0) {
      throw new BadRequestException(this.i18nService.translate('common.product.error.filesExists'));
    }

    await this.isExceedMaxImages(dto, files);

    const imagesUrl = await this.cloudinaryService.uploadImagesToCloudinary(files);

    const result = await callMicroservice<ProductImagesResponse[]>(
      this.productClient.send(ProductPattern.CREATE_PRODUCT_IMAGES, {
        productId: dto.productId,
        secureUrls: imagesUrl,
      }),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      try {
        await this.cloudinaryService.deleteByUrls(imagesUrl);
      } catch (err) {
        if (err instanceof Error) {
          this.loggerService.error('Rollback Cloudinary images failed', err.message);
        }
      }
      throw new BadRequestException(
        this.i18nService.translate('common.product.action.createProductImages.error.failed'),
      );
    }

    return buildBaseResponse<ProductImagesResponse[]>(StatusKey.SUCCESS, result);
  }

  async isExceedMaxImages(
    dto: CreateProductImagesDto,
    files: Array<Express.Multer.File>,
  ): Promise<void> {
    const countProductImages = await callMicroservice<number>(
      this.productClient.send(ProductPattern.COUNT_PRODUCT_IMAGES, dto.productId),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    const totalImages = countProductImages + files.length;
    if (totalImages > MAX_IMAGES) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.productImages.error.maxImagesExceeded'),
      );
    }
  }

  async deleteProductImages(
    productImageIds: DeleteProductImagesDto,
  ): Promise<BaseResponse<ProductImagesResponse[]>> {
    const result = await callMicroservice<ProductImagesResponse[]>(
      this.productClient.send(ProductPattern.DELETE_PRODUCT_IMAGES, productImageIds),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.error.productNotFound'),
      );
    }

    return buildBaseResponse<ProductImagesResponse[]>(StatusKey.SUCCESS, result);
  }
}
