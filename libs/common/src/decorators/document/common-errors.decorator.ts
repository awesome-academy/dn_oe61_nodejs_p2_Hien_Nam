import { ErrorResponseDto } from '@app/common/dto/document/errors/error.dto';
import { ServerErrorResponseDto } from '@app/common/dto/document/errors/server-error';
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiValidationErrorResponse() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description:
        'Lỗi xác thực. Các lỗi khác cũng trả về định dạng giống, chỉ thay đổi `status`, `message`, `code`, `path`',
      type: ErrorResponseDto,
    }),
  );
}

export function ApiServerErrorResponse() {
  return applyDecorators(
    ApiResponse({
      status: 500,
      description: 'Lỗi hệ thống, có thể do server hoặc cơ sở dữ liệu',
      type: ServerErrorResponseDto,
    }),
  );
}

export function ApiCommonErrorResponses() {
  return applyDecorators(ApiValidationErrorResponse(), ApiServerErrorResponse());
}
