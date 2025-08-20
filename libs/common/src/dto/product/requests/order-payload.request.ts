import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { OrderItemRequest } from './order-item.request';

export class OrderPayload {
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
  @Transform(({ value }) => {
    if (!value) return undefined;
    return String(value).replace(/\s+/g, '_').toUpperCase();
  })
  @IsEnum(PaymentMethodEnum, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'paymentMethod',
      enum: PaymentMethodEnum,
    }),
  })
  paymentMethod: PaymentMethodEnum;
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'items',
    }),
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemRequest)
  items: OrderItemRequest[];
}
