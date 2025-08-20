import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class PayOSDataReponseDto {
  @IsOptional()
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'orderCode',
    }),
  })
  orderCode: number;

  @IsOptional()
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
  description?: string;

  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'accountNumber',
    }),
  })
  accountNumber: string;

  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'reference',
    }),
  })
  reference: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'transactionDateTime',
    }),
  })
  transactionDateTime?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'currency',
    }),
  })
  currency?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'paymentLinkId',
    }),
  })
  paymentLinkId?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'code',
    }),
  })
  code?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'desc',
    }),
  })
  desc?: string;

  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'counterAccountBankId',
    }),
  })
  counterAccountBankId: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'counterAccountBankName',
    }),
  })
  counterAccountBankName?: string;

  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'counterAccountName',
    }),
  })
  counterAccountName: string;

  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'counterAccountNumber',
    }),
  })
  counterAccountNumber: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'virtualAccountName',
    }),
  })
  virtualAccountName?: string;

  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'virtualAccountNumber',
    }),
  })
  virtualAccountNumber?: string;
}
