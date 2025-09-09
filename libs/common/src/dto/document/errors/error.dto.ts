import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    example: HTTP_ERROR_CODE.BAD_REQUEST,
    description: 'Mã lỗi HTTP, có thể là ' + Object.values(HTTP_ERROR_CODE).join(', '),
    enum: HTTP_ERROR_CODE,
  })
  code: number;

  @ApiProperty({ example: 'Thông báo lỗi cụ thể' })
  message: string;

  @ApiProperty({
    example: '2025-08-06T02:30:46.913Z',
    format: 'date-time',
  })
  timestamp: string;
}
