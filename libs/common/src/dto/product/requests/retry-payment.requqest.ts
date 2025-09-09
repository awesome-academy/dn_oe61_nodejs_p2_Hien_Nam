import { SUPPORTED_LOCALES, SupportedLocalesType } from '@app/common/constant/locales.constant';
import { MIN_NUMBER_ID } from '@app/common/constant/validation.constant';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RetryPaymentRequest {
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'userId' }),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isNumber', { field: 'userId' }),
    },
  )
  @Min(MIN_NUMBER_ID, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'userId',
      min: MIN_NUMBER_ID,
    }),
  })
  userId: number;
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'userId' }),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isNumber', { field: 'userId' }),
    },
  )
  @Min(MIN_NUMBER_ID, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'orderId',
      min: MIN_NUMBER_ID,
    }),
  })
  orderId: number;
  @IsOptional()
  @IsEnum(SUPPORTED_LOCALES, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'lang',
      enum: SUPPORTED_LOCALES,
    }),
  })
  lang: SupportedLocalesType = 'en';
}
