import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponse } from '../../user/responses/user-profile.response';

export class GetUserProfileDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Lấy thông tin hồ sơ người dùng thành công' })
  message: string;

  @ApiProperty({
    example: {
      id: 1,
      name: 'Nguyễn Văn A',
      userName: 'nguyenvana',
      email: 'nguyenvana@example.com',
      imageUrl: 'https://res.cloudinary.com/example/image/upload/v1234567890/avatar1.jpg',
      isActive: true,
      status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      role: {
        id: 2,
        name: 'USER',
      },
      profile: {
        id: 1,
        address: '123 Đường ABC, Quận 1, TP.HCM',
        phoneNumber: '0901234567',
        dateOfBirth: '1990-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      authProviders: [
        {
          id: 1,
          provider: 'local',
          providerId: null,
          hasPassword: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    },
  })
  payLoad: UserProfileResponse;
}
