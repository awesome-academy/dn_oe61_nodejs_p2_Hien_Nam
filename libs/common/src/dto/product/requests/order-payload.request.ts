import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { OrderItemRequest } from './order-item.request';
import { ApiProperty } from '@nestjs/swagger';

export class OrderPayload {
  @ApiProperty({
    description: 'Delivery address for the order',
    example: '123 Main Street, City, Country',
    type: String,
  })
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

  @ApiProperty({
    description: 'Optional note for the order',
    example: 'Please deliver after 6 PM',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('common.validation.isString', {
      field: 'note',
    }),
  })
  note?: string;

  @ApiProperty({
    description: 'Payment method for the order',
    enum: PaymentMethodEnum,
    example: PaymentMethodEnum.CASH,
    enumName: 'PaymentMethodEnum',
  })
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

  @ApiProperty({
    description: 'List of items in the order',
    type: () => [OrderItemRequest],
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'items',
    }),
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemRequest)
  items: OrderItemRequest[];
}
