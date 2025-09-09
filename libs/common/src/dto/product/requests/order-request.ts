import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { OrderItemRequest } from './order-item.request';
import { SUPPORTED_LOCALES, SupportedLocalesType } from '@app/common/constant/locales.constant';

export class OrderRequest {
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'userId',
    }),
  })
  @IsInt({
    message: i18nValidationMessage('common.validation.isNumber', {
      field: 'userId',
    }),
  })
  userId: number;
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'deliveryAddress',
    }),
  })
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'deliveryAddress',
    }),
  })
  deliveryAddress: string;
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'note',
    }),
  })
  note?: string;
  @IsEnum(PaymentMethodEnum, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'paymentMethod',
      enum: PaymentMethodEnum,
    }),
  })
  paymentMethod: PaymentMethodEnum;
  @IsOptional()
  @IsEnum(SUPPORTED_LOCALES, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'lang',
      enum: SUPPORTED_LOCALES,
    }),
  })
  lang: SupportedLocalesType = 'en';
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'items',
    }),
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemRequest)
  items: OrderItemRequest[];
}
