import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class GetProductReviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: i18nValidationMessage('common.validation.isNumber') })
  @Min(1, { message: i18nValidationMessage('common.validation.min', { min: 1 }) })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: i18nValidationMessage('common.validation.isNumber') })
  @Min(1, { message: i18nValidationMessage('common.validation.min', { min: 1 }) })
  pageSize?: number = 10;
}
