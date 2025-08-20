import { SUPPORTED_LOCALES, SupportedLocalesType } from '@app/common/constant/locales.constant';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { StatisticOrderByMonthResponse } from '../response/statistic-order-by-month.response';

export class SendStatisticOrderMonthly {
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('common.validation.isEmail', {
        field: 'email',
      }),
    },
  )
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'email',
    }),
  })
  email: string;
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'name',
    }),
  })
  name: string;
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'data',
    }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'lang',
    }),
  })
  @IsEnum(SUPPORTED_LOCALES, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'lang',
    }),
  })
  lang: SupportedLocalesType;
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isNumber', {
        field: 'month',
      }),
    },
  )
  month: number;
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'year',
    }),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('common.validation.isNumber', {
        field: 'year',
      }),
    },
  )
  year: number;
  data: StatisticOrderByMonthResponse | string;
}
