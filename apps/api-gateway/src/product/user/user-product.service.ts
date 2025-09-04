import { PRODUCT_SERVICE } from '@app/common';
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
    private readonly loggerService: CustomLogger,
    private readonly i18nService: I18nService,
    private readonly cacheService: CacheService,
    private readonly upstashCacheService: UpstashCacheService,
  ) {}

  async listProductsForUser(
    query: GetAllProductUserDto,
  ): Promise<BaseResponse<UserProductResponse[]>> {
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

    const result = await this.cacheService.getOrSet<UserProductResponse[]>(
      cacheKey,
      async () => {
        const microserviceResult = await callMicroservice<UserProductResponse[]>(
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

    return buildBaseResponse<UserProductResponse[]>(StatusKey.SUCCESS, result);
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
}
