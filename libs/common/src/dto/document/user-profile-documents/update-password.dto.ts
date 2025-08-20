import { ApiProperty } from '@nestjs/swagger';
import { UpdatePasswordResponse } from '../../user/responses/update-password.response';

export class UpdatePasswordDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Cập nhật mật khẩu thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      userName: 'nguyenvana',
      email: 'nguyenvana@example.com',
      updatedAt: '2024-01-01T00:00:00.000Z',
      message: 'Cập nhật mật khẩu thành công',
    },
  })
  payLoad: UpdatePasswordResponse;
}
