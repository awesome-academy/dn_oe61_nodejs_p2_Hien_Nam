import { IsNotEmpty, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

export class DeleteReviewDto {
  @IsNotEmpty({ message: i18nValidationMessage('common.validation.isNotEmpty') })
  @IsNumber({}, { message: i18nValidationMessage('common.validation.isNumber') })
  @Transform(({ value }) => parseInt(value as string))
  reviewId: number;

  @IsNotEmpty({ message: i18nValidationMessage('common.validation.isNotEmpty') })
  @IsNumber({}, { message: i18nValidationMessage('common.validation.isNumber') })
  @Transform(({ value }) => parseInt(value as string))
  userId: number;
}
