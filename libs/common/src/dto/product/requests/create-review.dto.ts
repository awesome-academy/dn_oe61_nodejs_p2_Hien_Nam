import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateReviewDto {
  @IsNotEmpty({ message: i18nValidationMessage('common.validation.isNotEmpty') })
  @IsNumber({}, { message: i18nValidationMessage('common.validation.isNumber') })
  @Min(1, { message: i18nValidationMessage('common.validation.min', { min: 1 }) })
  @Max(5, { message: i18nValidationMessage('common.validation.max', { max: 5 }) })
  @Transform(({ value }) => parseFloat(value as string))
  rating: number;

  @IsOptional()
  @IsString({ message: i18nValidationMessage('common.validation.isString') })
  comment?: string;
}
