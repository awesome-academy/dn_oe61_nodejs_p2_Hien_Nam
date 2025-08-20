import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryResponse {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: 1,
    type: Number,
  })
  id: number;
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    type: String,
  })
  name: string;
  @ApiProperty({
    description: 'Username of the user',
    example: 'johndoe123',
    type: String,
  })
  userName: string;
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    type: String,
    nullable: true,
    required: false,
  })
  email?: string | null;
  @ApiProperty({
    description: 'Phone number of the user',
    example: '0987654321',
    type: String,
    nullable: true,
    required: false,
  })
  phone?: string | null;
  @ApiProperty({
    description: 'Address of the user',
    example: '123 Main Street, Ho Chi Minh City',
    type: String,
    nullable: true,
    required: false,
  })
  address?: string | null;
  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
    type: Boolean,
  })
  isActive: boolean;
  @ApiProperty({
    description: 'Profile image URL',
    example: 'https://example.com/profile-image.jpg',
    type: String,
    nullable: true,
    required: false,
  })
  imageUrl?: string | null;
  @ApiProperty({
    description: 'Current status of the user',
    example: 'ACTIVE',
    type: String,
  })
  status: string;
  @ApiProperty({
    description: 'Role of the user',
    example: 'USER',
    type: String,
  })
  role: string;
}
