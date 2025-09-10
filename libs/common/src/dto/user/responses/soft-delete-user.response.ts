import { ApiProperty } from '@nestjs/swagger';

export class SoftDeleteUserResponse {
  @ApiProperty({
    description: 'ID of the deleted user',
    example: 1,
    type: Number,
  })
  userId: number;
  @ApiProperty({
    description: 'Timestamp when the user was soft deleted',
    example: '2024-01-15T10:30:00.000Z',
    type: Date,
  })
  deletedAt: Date;
}
