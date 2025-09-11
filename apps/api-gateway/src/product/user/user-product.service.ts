import { NOTIFICATION_SERVICE, PRODUCT_SERVICE } from '@app/common';
import { BaseCacheService } from '@app/common/cache/base-cache.service';
import { CacheService } from '@app/common/cache/cache.service';
import { UpstashCacheService } from '@app/common/cache/upstash-cache/upstash-cache.service';
import { DEFAULT_CACHE_TTL_1H } from '@app/common/constant/cache.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { UserProductResponse } from '@app/common/dto/product/response/product-response';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { ShareUrlProductResponse } from '@app/common/dto/product/response/share-url-product-response';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';
import { DeleteReviewDto } from '@app/common/dto/product/requests/delete-review.dto';
import { GetProductReviewsDto } from '@app/common/dto/product/requests/get-product-reviews.dto';
import {
  CreateReviewResponse,
  ReviewResponse,
} from '@app/common/dto/product/response/review-response.dto';
import { DeleteReviewResponse } from '@app/common/dto/product/response/delete-review.response';
import { Notifications } from '@app/common/enums/message-patterns/notification.pattern';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UserProductService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    private readonly i18nService: I18nService,
    private readonly cacheService: CacheService,
    private readonly upstashCacheService: UpstashCacheService,
  ) {}

  async listProductsForUser(
    query: GetAllProductUserDto,
  ): Promise<BaseResponse<PaginationResult<UserProductResponse>>> {
    const options = {
      page: query.page,
      pageSize: query.pageSize,
      name: query.name,
      categoryId: query.categoryId,
      rootCategoryId: query.rootCategoryId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      rating: query.rating,
    };
    const cacheKey = this.genCacheKey('user_products', this.cacheService, options);

    const result = await this.cacheService.getOrSet<PaginationResult<UserProductResponse>>(
      cacheKey,
      async () => {
        const microserviceResult = await callMicroservice<PaginationResult<UserProductResponse>>(
          this.productClient.send(ProductPattern.GET_ALL_USER, query),
          PRODUCT_SERVICE,
          this.loggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );

        if (!microserviceResult) {
          throw new Error(this.i18nService.translate('common.product.action.getAll.failed'));
        }

        return microserviceResult;
      },
      {
        ttl: DEFAULT_CACHE_TTL_1H,
      },
    );

    return buildBaseResponse<PaginationResult<UserProductResponse>>(StatusKey.SUCCESS, result);
  }

  private genCacheKey(
    key: string,
    typeCacheService: BaseCacheService,
    options?: Record<string, undefined | string | number | boolean>,
  ): string {
    const cacheKey = typeCacheService.generateKey(key, options);
    return cacheKey;
  }

  async getProductDetailForUser(
    dto: GetByIdProductDto,
  ): Promise<BaseResponse<UserProductDetailResponse>> {
    const product = await callMicroservice<BaseResponse<UserProductDetailResponse>>(
      this.productClient.send(ProductPattern.CHECK_PRODUCT_EXISTS, dto.skuId),
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

    const cacheKey = this.genCacheKey('user_product_details', this.upstashCacheService, {
      skuId: dto.skuId,
    });

    const result = await this.upstashCacheService.getOrSet<UserProductDetailResponse>(
      cacheKey,
      async () => {
        const microserviceResult = await callMicroservice<UserProductDetailResponse>(
          this.productClient.send(ProductPattern.GET_BY_ID_FOR_USER, { skuId: dto.skuId }),
          PRODUCT_SERVICE,
          this.loggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );

        if (!microserviceResult) {
          throw new BadRequestException(
            this.i18nService.translate('common.product.action.getById.failed'),
          );
        }

        return microserviceResult;
      },
      {
        ttl: DEFAULT_CACHE_TTL_1H,
      },
    );

    return buildBaseResponse<UserProductDetailResponse>(StatusKey.SUCCESS, result);
  }

  async shareProduct(skuId: GetByIdProductDto): Promise<BaseResponse<ShareUrlProductResponse>> {
    const product = await this.getProductDetailForUser(skuId);
    if (!product) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.action.getById.failed'),
      );
    }

    const shareUrls = await callMicroservice<ShareUrlProductResponse>(
      this.notificationClient.send(Notifications.GET_SHARE_INFO, product.data),
      NOTIFICATION_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!shareUrls) {
      throw new BadRequestException(
        this.i18nService.translate('common.product.action.shareProduct.failed'),
      );
    }

    return buildBaseResponse<ShareUrlProductResponse>(StatusKey.SUCCESS, shareUrls);
  }

  async createReview(
    skuId: string,
    createReviewDto: CreateReviewDto,
    userId: number,
  ): Promise<BaseResponse<CreateReviewResponse>> {
    const reviewData = {
      ...createReviewDto,
      userId,
      skuId,
    };

    const result = await callMicroservice<CreateReviewResponse>(
      this.productClient.send(ProductPattern.CREATE_REVIEW, reviewData),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(this.i18nService.translate('review.errors.createFailed'));
    }

    if (result) {
      await this.clearProductCache();
    }

    return buildBaseResponse<CreateReviewResponse>(StatusKey.SUCCESS, result);
  }

  async getProductReviews(
    skuId: GetByIdProductDto,
    query: GetProductReviewsDto,
  ): Promise<BaseResponse<PaginationResult<ReviewResponse>>> {
    const reviewsData = {
      ...query,
      skuId: skuId.skuId,
    };

    const result = await callMicroservice<PaginationResult<ReviewResponse>>(
      this.productClient.send(ProductPattern.GET_PRODUCT_REVIEWS, reviewsData),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(this.i18nService.translate('review.errors.fetchFailed'));
    }

    return buildBaseResponse<PaginationResult<ReviewResponse>>(StatusKey.SUCCESS, result);
  }

  async deleteReview(
    reviewId: number,
    userId: number,
  ): Promise<BaseResponse<DeleteReviewResponse>> {
    const deleteReviewData: DeleteReviewDto = {
      reviewId,
      userId,
    };

    const result = await callMicroservice<DeleteReviewResponse>(
      this.productClient.send(ProductPattern.DELETE_REVIEW, deleteReviewData),
      PRODUCT_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(this.i18nService.translate('review.errors.deleteFailed'));
    }

    if (result) {
      await this.clearProductCache();
    }

    return buildBaseResponse<DeleteReviewResponse>(StatusKey.SUCCESS, result);
  }

  private async clearProductCache(): Promise<void> {
    try {
      await this.cacheService.deleteByPattern('user_products:*');
      await this.upstashCacheService.deleteByPattern('user_product_details:*');
      this.loggerService.log('Product cache cleared after successful operation');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.loggerService.error('Failed to clear product cache:', errorMessage);
    }
  }
}
