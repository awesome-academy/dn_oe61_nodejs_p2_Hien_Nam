import { SortDirection } from '@app/common/enums/query.enum';
import { OrderStatus, PaymentMethod, PaymentStatus } from 'apps/product-service/generated/prisma';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterGetOrdersRequest {
  @ApiPropertyOptional({
    description: 'Filter orders from this start date',
    example: '2024-01-01T00:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: i18nValidationMessage('common.validation.isDate', {
      field: 'startDate',
    }),
  })
  startDate?: Date;
  @ApiPropertyOptional({
    description: 'Filter orders until this end date',
    example: '2024-12-31T23:59:59Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: i18nValidationMessage('common.validation.isDate', {
      field: 'endDate',
    }),
  })
  endDate?: Date;
  @ApiPropertyOptional({
    description: 'Filter by payment methods',
    enum: PaymentMethod,
    isArray: true,
    example: ['CREDIT_CARD', 'CASH'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (Array.isArray(value)) {
      return value.map((v) => String(v).toUpperCase().replace(/\s+/g, '_'));
    }
    return String(value).toUpperCase().replace(/\s+/g, '_');
  })
  @IsEnum(PaymentMethod, {
    each: true,
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'methods',
    }),
  })
  methods?: PaymentMethod[];
  @ApiPropertyOptional({
    description: 'Filter by payment statuses',
    enum: PaymentStatus,
    isArray: true,
    example: ['PENDING', 'COMPLETED'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (Array.isArray(value)) {
      return value.map((v) => String(v).toUpperCase().replace(/\s+/g, '_'));
    }
    return String(value).toUpperCase().replace(/\s+/g, '_');
  })
  @IsEnum(PaymentStatus, {
    each: true,
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'PaymentStatus',
    }),
  })
  paymentStatuses?: PaymentStatus[];
  @ApiPropertyOptional({
    description: 'Filter by order statuses',
    enum: OrderStatus,
    isArray: true,
    example: ['PROCESSING', 'DELIVERED'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (Array.isArray(value)) {
      return value.map((v) => String(v).toUpperCase().replace(/\s+/g, '_'));
    }
    return String(value).toUpperCase().replace(/\s+/g, '_');
  })
  @IsEnum(OrderStatus, {
    each: true,
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'status',
    }),
  })
  statuses?: OrderStatus[];
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
    type: 'integer',
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
  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
    type: 'integer',
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

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString'),
  })
  sortBy?: string;
  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortDirection,
    default: SortDirection.ASC,
    example: SortDirection.ASC,
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
