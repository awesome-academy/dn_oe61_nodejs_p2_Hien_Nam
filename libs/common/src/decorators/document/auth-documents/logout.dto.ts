import { LogoutDto } from '@app/common/dto/document/auth-documents/logout.dto';
import { ApiCommonErrorResponses } from '@app/common/decorators/document/common-errors.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiPublicEndpoint } from '../auth-decorators.decorator';

export function ApiResponseLogout() {
  return applyDecorators(
    ApiPublicEndpoint(
      'Đăng xuất người dùng',
      'Xóa cookie token và đăng xuất người dùng khỏi hệ thống',
    ),

    ApiResponse({
      status: 200,
      description: 'Đăng xuất thành công',
      type: LogoutDto,
    }),

    ApiCommonErrorResponses(),
  );
}
