import { ApiProperty } from '@nestjs/swagger';

export class ServerErrorResponseDto {
  @ApiProperty({ example: 'Lỗi máy chủ nội bộ' })
  message: string;

  @ApiProperty({ example: 500 })
  code: number;
}
