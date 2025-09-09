import { UpdateUserProfileDto as UpdateUserProfileResponseDto } from '@app/common/dto/document/user-profile-documents/update-user-profile.dto';
import { ApiUserEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';

export function ApiResponseUpdateUserProfile() {
  return applyDecorators(
    ApiUserEndpoint(
      'Cập nhật hồ sơ người dùng',
      'Cập nhật thông tin hồ sơ người dùng bao gồm cả ảnh đại diện. Yêu cầu quyền USER. (Yêu cầu JWT Token)',
    ),

    ApiConsumes('multipart/form-data'),

    ApiBody({
      description: 'Thông tin cập nhật hồ sơ người dùng',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Tên người dùng',
            example: 'Nguyễn Văn A',
          },
          address: {
            type: 'string',
            description: 'Địa chỉ',
            example: '123 Đường ABC, Quận 1, TP.HCM',
          },
          phoneNumber: {
            type: 'string',
            description: 'Số điện thoại',
            example: '0901234567',
          },
          userName: {
            type: 'string',
            description: 'Tên đăng nhập',
            example: 'nguyenvana',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email',
            example: 'nguyenvana@example.com',
          },
          dateOfBirth: {
            type: 'string',
            format: 'date',
            description: 'Ngày sinh',
            example: '1990-01-01',
          },
          imageUrl: {
            type: 'string',
            format: 'binary',
            description: 'Ảnh đại diện (tùy chọn)',
            example: 'https://example.com/avatar.jpg',
          },
        },
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Cập nhật hồ sơ người dùng thành công',
      type: UpdateUserProfileResponseDto,
    }),
  );
}
