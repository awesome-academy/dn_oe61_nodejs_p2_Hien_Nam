import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'name',
    }),
  })
  name?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'skuId',
    }),
  })
  skuId?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'description',
    }),
  })
  description?: string;

  @IsOptional()
  @IsEnum(StatusProduct)
  status?: StatusProduct;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    {
      message: i18nValidationMessage('common.validation.isNumber', { field: 'basePrice' }),
    },
  )
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', { field: 'quantity' }),
  })
  @Type(() => Number)
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secureUrls?: string[];
}
