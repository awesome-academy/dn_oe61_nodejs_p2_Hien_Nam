import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SoftDeleteUserRequest {
  @ApiProperty({
    description: 'ID of the user to soft delete',
    example: 1,
    type: Number,
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'userId',
    }),
  })
  userId: number;
}
