import { SUPPORTED_LOCALES, SupportedLocalesType } from '@app/common/constant/locales.constant';
import { MIN_NUMBER_ID } from '@app/common/constant/validation.constant';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RetryPaymentRequest {
  @ApiProperty({
    description: 'ID of the user retrying the payment',
    example: 123,
    type: 'number',
    minimum: MIN_NUMBER_ID,
  })
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
  @ApiProperty({
    description: 'ID of the order to retry payment for',
    example: 456,
    type: 'number',
    minimum: MIN_NUMBER_ID,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'orderId' }),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isNumber', { field: 'orderId' }),
    },
  )
  @Min(MIN_NUMBER_ID, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'orderId',
      min: MIN_NUMBER_ID,
    }),
  })
  orderId: number;
  @ApiPropertyOptional({
    description: 'Language preference for payment messages',
    enum: SUPPORTED_LOCALES,
    default: 'en',
    example: 'en',
  })
  @IsOptional()
  @IsEnum(SUPPORTED_LOCALES, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'lang',
      enum: SUPPORTED_LOCALES,
    }),
  })
  lang: SupportedLocalesType = 'en';
}
