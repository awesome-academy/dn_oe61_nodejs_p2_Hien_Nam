import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Đăng xuất thành công' })
  message: string;

  @ApiProperty({
    example: '',
    description: 'Empty string returned after successful logout',
  })
  payLoad: string;
}
