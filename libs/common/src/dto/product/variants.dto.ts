import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class VariantInput {
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    {
      message: i18nValidationMessage('common.validation.isNumber', { field: 'price' }),
    },
  )
  @Min(0)
  price: number;

  @IsDateString(
    {},
    {
      message: i18nValidationMessage('common.validation.isDateString', { field: 'startDate' }),
    },
  )
  startDate: Date;

  @IsOptional()
  @IsDateString(
    {},
    {
      message: i18nValidationMessage('common.validation.isDateString', { field: 'endDate' }),
    },
  )
  endDate?: Date;

  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', { field: 'sizeId' }),
  })
  sizeId: number;
}
