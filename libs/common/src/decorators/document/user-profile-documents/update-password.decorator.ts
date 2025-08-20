import { UpdatePasswordDto as UpdatePasswordResponseDto } from '@app/common/dto/document/user-profile-documents/update-password.dto';
import { ApiUserEndpoint } from '@app/common/decorators/document/auth-decorators.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';

export function ApiResponseUpdatePassword() {
  return applyDecorators(
    ApiUserEndpoint(
      'Cập nhật mật khẩu',
      'Cập nhật mật khẩu cho người dùng hiện tại. Yêu cầu quyền USER. (Yêu cầu JWT Token)',
    ),

    ApiBody({
      description: 'Thông tin cập nhật mật khẩu',
      schema: {
        type: 'object',
        properties: {
          currentPassword: {
            type: 'string',
            description: 'Mật khẩu hiện tại',
            example: 'currentPassword123',
          },
          newPassword: {
            type: 'string',
            description: 'Mật khẩu mới',
            example: 'newPassword123',
          },
          confirmPassword: {
            type: 'string',
            description: 'Xác nhận mật khẩu mới',
            example: 'newPassword123',
          },
        },
        required: ['currentPassword', 'newPassword', 'confirmPassword'],
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Cập nhật mật khẩu thành công',
      type: UpdatePasswordResponseDto,
    }),
  );
}
