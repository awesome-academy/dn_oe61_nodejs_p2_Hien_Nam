import { ApiProperty } from '@nestjs/swagger';

export class UserCreationResponse {
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
  })
  email: string | null;
  @ApiProperty({
    description: 'Profile image URL',
    example: 'https://example.com/profile-image.jpg',
    type: String,
    nullable: true,
  })
  imageUrl: string | null;
  @ApiProperty({
    description: 'Phone number of the user',
    example: '0987654321',
    type: String,
    nullable: true,
  })
  phone: string | null;
  @ApiProperty({
    description: 'Address of the user',
    example: '123 Main Street, Ho Chi Minh City',
    type: String,
    nullable: true,
  })
  address: string | null;
  @ApiProperty({
    description: 'Date of birth',
    example: '1990-01-15T00:00:00.000Z',
    type: Date,
    nullable: true,
  })
  dateOfBirth: Date | null;
  @ApiProperty({
    description: 'Role of the user',
    example: 'USER',
    type: String,
  })
  role: string;
  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2024-01-15T10:30:00.000Z',
    type: Date,
  })
  createdAt: Date;
}
