import { MIN_NUMBER_ID } from '@app/common/constant/validation.constant';
import { Role } from '@app/common/enums/roles/users.enum';
import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class GetOrderRequest {
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
      field: 'orderId',
    }),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isInt', {
        field: 'orderId',
      }),
    },
  )
  @Min(MIN_NUMBER_ID, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'orderId',
      value: MIN_NUMBER_ID,
    }),
  })
  orderId: number;
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'role',
    }),
  })
  @IsEnum(Role, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'role',
    }),
  })
  role: Role;
}
