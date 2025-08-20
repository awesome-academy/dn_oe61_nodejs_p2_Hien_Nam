import { UserStatus } from '@app/common/enums/user-status.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayNotEmpty, IsEnum, IsInt, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UserUpdateStatusItem {
  @ApiProperty({
    description: 'ID of the user to update status',
    example: 1,
    type: Number,
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'userId',
    }),
  })
  userId: number;
  @ApiProperty({
    description: 'New status for the user',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    return String(value).toUpperCase();
  })
  @IsEnum(UserStatus, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'status',
      enum: UserStatus,
    }),
  })
  status: UserStatus;
}

export class UserUpdateStatusRequest {
  @ApiProperty({
    description: 'Array of users with their new status',
    type: [UserUpdateStatusItem],
    example: [
      {
        userId: 1,
        status: 'ACTIVE',
      },
      {
        userId: 2,
        status: 'INACTIVE',
      },
    ],
  })
  @ArrayNotEmpty({
    message: i18nValidationMessage('common.validation.arrayNotEmpty', {
      field: 'users',
    }),
  })
  @ValidateNested({ each: true })
  @Type(() => UserUpdateStatusItem)
  users: UserUpdateStatusItem[];
}
