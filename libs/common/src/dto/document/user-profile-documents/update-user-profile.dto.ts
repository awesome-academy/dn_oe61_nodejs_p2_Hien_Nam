import { ApiProperty } from '@nestjs/swagger';
import { UpdateUserProfileResponse } from '../../user/responses/update-user-profile.response';

export class UpdateUserProfileDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Cập nhật hồ sơ người dùng thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      name: 'Nguyễn Văn A',
      userName: 'nguyenvana',
      email: 'nguyenvana@example.com',
      imageUrl: 'https://res.cloudinary.com/example/image/upload/v1234567890/avatar1.jpg',
      updatedAt: '2024-01-01T00:00:00.000Z',
      profile: {
        id: 1,
        address: '123 Đường ABC, Quận 1, TP.HCM',
        phoneNumber: '0901234567',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  payLoad: UpdateUserProfileResponse;
}
