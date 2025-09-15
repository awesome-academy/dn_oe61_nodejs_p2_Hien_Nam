import { Role } from '@app/common/enums/roles/users.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UserUpdateRoleItem {
  @ApiProperty({
    description: 'ID of the user to update role',
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
    description: 'New role for the user',
    enum: Role,
    example: Role.USER,
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    return String(value).toUpperCase();
  })
  @IsEnum(Role, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'role',
      enum: [Role.ADMIN, Role.USER],
    }),
  })
  role: Role;
}

export class UserUpdateRoleRequest {
  @ApiProperty({
    description: 'Array of users with their new roles',
    type: [UserUpdateRoleItem],
    example: [
      {
        userId: 1,
        role: 'USER',
      },
      {
        userId: 2,
        role: 'ADMIN',
      },
    ],
  })
  @ArrayNotEmpty({
    message: i18nValidationMessage('common.validation.arrayNotEmpty', {
      field: 'users',
    }),
  })
  @ValidateNested({ each: true })
  @Type(() => UserUpdateRoleItem)
  users: UserUpdateRoleItem[];
}
