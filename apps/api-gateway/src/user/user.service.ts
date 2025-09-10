import { BaseCacheService } from '@app/common/cache/base-cache.service';
import { CacheService } from '@app/common/cache/cache.service';
import { USER_CACHE_PREFIX } from '@app/common/constant/cache-prefix.constant copy';
import { TTL_CACHE_GET_USERS_2m } from '@app/common/constant/cache.constant';
import { GET_ALL_CACHE } from '@app/common/constant/end-prefix-cache.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { USER_SERVICE } from '@app/common/constant/service.constant';
import { FilterGetUsersRequest } from '@app/common/dto/user/requests/filter-get-orders.request';
import { SoftDeleteUserRequest } from '@app/common/dto/user/requests/soft-delete-user.request';
import { UserCreationRequest } from '@app/common/dto/user/requests/user-creation.request';
import { UserUpdateRoleRequest } from '@app/common/dto/user/requests/user-update-role.request';
import { UserUpdateStatusRequest } from '@app/common/dto/user/requests/user-update-status.request';
import { SoftDeleteUserResponse } from '@app/common/dto/user/responses/soft-delete-user.response';
import { UserCreationResponse } from '@app/common/dto/user/responses/user-creation.response';
import { UserSummaryResponse } from '@app/common/dto/user/responses/user-summary.response';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { buildKeyCache } from '@app/common/helpers/cache.helper';
import { callMicroservice } from '@app/common/helpers/microservices';
import { toQueryParam } from '@app/common/helpers/query.helper';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    private readonly cacheService: CacheService,
  ) {}
  async create(dto: UserCreationRequest): Promise<BaseResponse<UserCreationResponse>> {
    await validateOrReject(dto);
    return await callMicroservice(
      this.userClient.send<BaseResponse<UserCreationResponse>>(
        UserMsgPattern.ADMIN_CREATE_USER,
        dto,
      ),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
  async updateRoles(dto: UserUpdateRoleRequest): Promise<BaseResponse<UserSummaryResponse[]>> {
    const dtoInstance = plainToInstance(UserUpdateRoleRequest, dto);
    await validateOrReject(dtoInstance);
    return await callMicroservice(
      this.userClient.send<BaseResponse<UserSummaryResponse[]>>(
        UserMsgPattern.ADMIN_UPDATE_ROLE,
        dto,
      ),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
  async updateStatuses(dto: UserUpdateStatusRequest): Promise<BaseResponse<UserSummaryResponse[]>> {
    const dtoInstance = plainToInstance(UserUpdateStatusRequest, dto);
    await validateOrReject(dtoInstance);
    return await callMicroservice(
      this.userClient.send<BaseResponse<UserSummaryResponse[] | []>>(
        UserMsgPattern.ADMIN_UPDATE_STATUS,
        dto,
      ),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
  async delete(dto: SoftDeleteUserRequest): Promise<BaseResponse<SoftDeleteUserResponse>> {
    return await callMicroservice(
      this.userClient.send<BaseResponse<SoftDeleteUserResponse>>(
        UserMsgPattern.ADMIN_DELETE_USER,
        dto,
      ),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
  async getUsers(
    filter: FilterGetUsersRequest,
  ): Promise<BaseResponse<PaginationResult<UserSummaryResponse>>> {
    const options = this.buildOptionsCache(filter);
    const cacheKey = this.genCacheKey(
      buildKeyCache(USER_CACHE_PREFIX, undefined, GET_ALL_CACHE),
      this.cacheService,
      options,
    );
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const microserviceResult = await callMicroservice<
          BaseResponse<PaginationResult<UserSummaryResponse>>
        >(
          this.userClient.send(UserMsgPattern.GET_ALL_USER, filter),
          USER_SERVICE,
          this.loggerService,
          {
            timeoutMs: TIMEOUT_MS_DEFAULT,
            retries: RETRIES_DEFAULT,
          },
        );
        return microserviceResult;
      },
      {
        ttl: TTL_CACHE_GET_USERS_2m,
      },
    );
  }

  private genCacheKey(
    key: string,
    typeCacheService: BaseCacheService,
    options?: Record<string, undefined | string | number | boolean>,
  ): string {
    const cacheKey = typeCacheService.generateKey(key, options);
    return cacheKey;
  }
  private buildOptionsCache(filter: FilterGetUsersRequest) {
    return {
      page: filter.page,
      pageSize: filter.pageSize,
      ...(filter.name && { name: filter.name }),
      ...(filter.email && { email: filter.email }),
      ...toQueryParam(filter.statuses, 'statuses'),
      ...(filter.sortBy && { sortBy: filter.sortBy }),
      direction: filter.direction,
    };
  }
}
