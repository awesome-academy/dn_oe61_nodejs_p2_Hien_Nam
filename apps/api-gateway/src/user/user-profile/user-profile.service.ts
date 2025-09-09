import { USER_SERVICE } from '@app/common/constant/service.constant';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { GetUserProfileRequest } from '@app/common/dto/user/requests/get-user-profile.request';
import { UpdatePasswordRequest } from '@app/common/dto/user/requests/update-password.request';
import { UpdateUserProfileRequest } from '@app/common/dto/user/requests/update-user-profile.request';
import { UpdatePasswordResponse } from '@app/common/dto/user/responses/update-password.response';
import { UpdateUserProfileResponse } from '@app/common/dto/user/responses/update-user-profile.response';
import { UserProfileResponse } from '@app/common/dto/user/responses/user-profile.response';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { CloudinaryService } from '@app/common/cloudinary/cloudinary.service';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UserProfileService {
  constructor(
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    private readonly cloudinaryService: CloudinaryService,
    private readonly i18nService: I18nService,
  ) {}

  async getUserProfile(dto: GetUserProfileRequest): Promise<BaseResponse<UserProfileResponse>> {
    const dtoInstance = plainToInstance(GetUserProfileRequest, dto);
    await validateOrReject(dtoInstance);
    const result = await callMicroservice(
      this.userClient.send<UserProfileResponse>(UserMsgPattern.GET_USER_PROFILE, dto),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(
        this.i18nService.translate('common.user.action.getUserProfile.failed'),
      );
    }
    return buildBaseResponse<UserProfileResponse>(StatusKey.SUCCESS, result);
  }

  async updateUserProfile(
    userId: number,
    dto: UpdateUserProfileRequest,
    file?: Express.Multer.File,
  ): Promise<BaseResponse<UpdateUserProfileResponse>> {
    const dtoInstance = plainToInstance(UpdateUserProfileRequest, dto);
    await validateOrReject(dtoInstance);

    if (file) {
      const uploadImage = await this.cloudinaryService.uploadImagesToCloudinary([file]);
      dto.imageUrl = uploadImage[0];
    }

    if (userId) {
      dto.userId = userId;
    }

    const result = await callMicroservice(
      this.userClient.send<UpdateUserProfileResponse>(UserMsgPattern.UPDATE_USER_PROFILE, dto),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      await this.cloudinaryService.deleteByUrls(dto.imageUrl ?? '');
      throw new BadRequestException(
        this.i18nService.translate('common.user.action.updateUserProfile.failed'),
      );
    }

    return buildBaseResponse<UpdateUserProfileResponse>(StatusKey.SUCCESS, result);
  }

  async updatePassword(dto: UpdatePasswordRequest): Promise<BaseResponse<UpdatePasswordResponse>> {
    const dtoInstance = plainToInstance(UpdatePasswordRequest, dto);
    await validateOrReject(dtoInstance);
    const result = await callMicroservice(
      this.userClient.send<UpdatePasswordResponse>(UserMsgPattern.UPDATE_PASSWORD, dto),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(
        this.i18nService.translate('common.user.action.updatePassword.failed'),
      );
    }

    return buildBaseResponse<UpdatePasswordResponse>(StatusKey.SUCCESS, result);
  }
}
