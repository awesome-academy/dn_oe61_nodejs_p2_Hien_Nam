import { SortDirection } from '@app/common/enums/query.enum';
import { OrderStatus, PaymentMethod, PaymentStatus } from 'apps/product-service/generated/prisma';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class FilterGetOrdersRequest {
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: i18nValidationMessage('common.validation.isDate', {
      field: 'startDate',
    }),
  })
  startDate?: Date;
  @IsOptional()
  @Type(() => Date)
  @IsDate({
    message: i18nValidationMessage('common.validation.isDate', {
      field: 'endDate',
    }),
  })
  endDate?: Date;
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
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt'),
  })
  @Min(1, {
    message: i18nValidationMessage('common.validation.min'),
  })
  page: number = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt'),
  })
  @Min(1, {
    message: i18nValidationMessage('common.validation.min'),
  })
  pageSize: number = 10;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString'),
  })
  sortBy?: string;
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
