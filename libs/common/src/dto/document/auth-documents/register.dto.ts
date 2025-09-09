import { ApiProperty } from '@nestjs/swagger';
import { UserResponse } from '../../user/responses/user.response';

export class RegisterDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Đăng ký thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 3,
      name: 'Hoai Admin',
      userName: 'nam123',
      status: 'ACTIVE',
      email: 'nam123@gmail.com',
      deletedAt: null,
      role: 'USER',
    },
  })
  payLoad: UserResponse;
}
