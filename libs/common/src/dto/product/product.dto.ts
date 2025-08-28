import { StatusProduct } from '@app/common/enums/product/product-status.enum';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayNotEmpty,
  IsNotEmpty,
} from 'class-validator';
import { VariantInput } from './variants.dto';
import { Type } from 'class-transformer';

export class ProductDto {
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'name',
    }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'name',
    }),
  })
  name: string;

  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'skuId',
    }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'skuId',
    }),
  })
  skuId: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'description',
    }),
  })
  description?: string;

  @IsEnum(StatusProduct)
  status: StatusProduct;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    {
      message: i18nValidationMessage('common.validation.isNumber', { field: 'basePrice' }),
    },
  )
  @Min(0)
  basePrice: number;

  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', { field: 'quantity' }),
  })
  @Type(() => Number)
  @Min(0)
  quantity: number;

  @IsArray()
  @ArrayNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'variants',
    }),
  })
  @ValidateNested({ each: true })
  @Type(() => VariantInput)
  variants: VariantInput[];

  @IsArray()
  @ArrayNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'categoryIds',
    }),
  })
  @IsInt({ each: true })
  categoryIds: number[];
}
