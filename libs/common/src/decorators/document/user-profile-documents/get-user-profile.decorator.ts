import { GetUserProfileDto as GetUserProfileResponseDto } from '@app/common/dto/document/user-profile-documents/get-user-profile.dto';
import { ApiUserEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiResponseGetUserProfile() {
  return applyDecorators(
    ApiUserEndpoint(
      'Lấy thông tin hồ sơ người dùng',
      'Lấy thông tin chi tiết hồ sơ của người dùng hiện tại. Yêu cầu quyền USER. (Yêu cầu JWT Token)',
    ),

    ApiResponse({
      status: 200,
      description: 'Lấy thông tin hồ sơ người dùng thành công',
      type: GetUserProfileResponseDto,
    }),
  );
}
