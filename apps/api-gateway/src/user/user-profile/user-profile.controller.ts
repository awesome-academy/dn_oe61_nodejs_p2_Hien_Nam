import { Body, Controller, Get, UploadedFile, UseInterceptors, Patch } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserProfileService } from './user-profile.service';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { Role } from '@app/common/enums/roles/users.enum';
import { GetUserProfileRequest } from '@app/common/dto/user/requests/get-user-profile.request';
import { UpdatePasswordRequest } from '@app/common/dto/user/requests/update-password.request';
import { UpdateUserProfileRequest } from '@app/common/dto/user/requests/update-user-profile.request';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { UserProfileResponse } from '@app/common/dto/user/responses/user-profile.response';
import { UpdateUserProfileResponse } from '@app/common/dto/user/responses/update-user-profile.response';
import { UpdatePasswordResponse } from '@app/common/dto/user/responses/update-password.response';
import { UserDecorator } from '@app/common/decorators/current-user.decorator';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { ApiResponseGetUserProfile } from '@app/common/decorators/document/user-profile-documents/get-user-profile.decorator';
import { ApiResponseUpdateUserProfile } from '@app/common/decorators/document/user-profile-documents/update-user-profile.decorator';
import { ApiResponseUpdatePassword } from '@app/common/decorators/document/user-profile-documents/update-password.decorator';

@Controller('user/profile')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @ApiResponseGetUserProfile()
  @Get()
  @AuthRoles(Role.USER)
  async getUserProfile(
    @UserDecorator() user: TUserPayload,
  ): Promise<BaseResponse<UserProfileResponse>> {
    const dto: GetUserProfileRequest = {
      userId: user.id!,
    };
    return this.userProfileService.getUserProfile(dto);
  }

  @ApiResponseUpdateUserProfile()
  @Patch()
  @AuthRoles(Role.USER)
  @UseInterceptors(FileInterceptor('image'))
  async updateUserProfile(
    @UserDecorator() user: TUserPayload,
    @Body() body: UpdateUserProfileRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BaseResponse<UpdateUserProfileResponse>> {
    return this.userProfileService.updateUserProfile(user.id!, body, file);
  }

  @ApiResponseUpdatePassword()
  @Patch('password')
  @AuthRoles(Role.USER)
  async updatePassword(
    @UserDecorator() user: TUserPayload,
    @Body() body: Omit<UpdatePasswordRequest, 'userId'>,
  ): Promise<BaseResponse<UpdatePasswordResponse>> {
    const dto: UpdatePasswordRequest = {
      userId: user.id!,
      ...body,
    };
    return this.userProfileService.updatePassword(dto);
  }
}
