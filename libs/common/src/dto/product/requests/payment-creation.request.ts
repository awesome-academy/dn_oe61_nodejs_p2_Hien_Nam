import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class PaymentCreationRequestDto {
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'orderId',
    }),
  })
  orderId: number;
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'userId',
    }),
  })
  userId: number;
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isNumber', {
        field: 'amount',
      }),
    },
  )
  amount: number;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'description',
    }),
  })
  description: string;
  expiredAt: number;
}
