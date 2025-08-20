import { MIN_NUMBER_ID } from '@app/common/constant/validation.constant';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ConfirmOrderRequest {
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'userId',
    }),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isInt', {
        field: 'userId',
      }),
    },
  )
  @Min(MIN_NUMBER_ID, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'userId',
      value: MIN_NUMBER_ID,
    }),
  })
  userId: number;
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'userId',
    }),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isInt', {
        field: 'userId',
      }),
    },
  )
  @Min(MIN_NUMBER_ID, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'userId',
      value: MIN_NUMBER_ID,
    }),
  })
  orderId: number;
}
