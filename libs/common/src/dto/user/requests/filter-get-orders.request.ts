import { SortDirection } from '@app/common/enums/query.enum';
import { UserStatus } from 'apps/user-service/generated/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class FilterGetUsersRequest {
  @ApiProperty({
    description: 'Filter by user name',
    example: 'John Doe',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'name',
    }),
  })
  name?: string;
  @ApiProperty({
    description: 'Filter by user email',
    example: 'john.doe@example.com',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'email',
    }),
  })
  email?: string;
  @ApiProperty({
    description: 'Filter by user statuses',
    enum: UserStatus,
    isArray: true,
    example: ['ACTIVE', 'INACTIVE'],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (Array.isArray(value)) {
      return value.map((v) => String(v).toUpperCase().replace(/\s+/g, '_'));
    }
    return String(value).toUpperCase().replace(/\s+/g, '_');
  })
  @IsEnum(UserStatus, {
    each: true,
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'statuses',
    }),
  })
  statuses?: UserStatus[];
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    type: Number,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt'),
  })
  @Min(1, {
    message: i18nValidationMessage('common.validation.min'),
  })
  page: number = 1;
  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    type: Number,
    minimum: 1,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt'),
  })
  @Min(1, {
    message: i18nValidationMessage('common.validation.min'),
  })
  pageSize: number = 10;
  @ApiProperty({
    description: 'Field to sort by',
    example: 'name',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString'),
  })
  sortBy?: string;
  @ApiProperty({
    description: 'Sort direction',
    enum: SortDirection,
    example: SortDirection.ASC,
    default: SortDirection.ASC,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.toLowerCase() : undefined,
  )
  @IsEnum(SortDirection, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'direction',
    }),
  })
  direction: SortDirection = SortDirection.ASC;
}
