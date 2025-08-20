import { PaymentMethodEnum } from '@app/common/enums/product/payment-method.enum';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { OrderItemRequest } from './order-item.request';
import { SUPPORTED_LOCALES, SupportedLocalesType } from '@app/common/constant/locales.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderRequest {
  @ApiProperty({
    description: 'ID of the user placing the order',
    example: 1,
    type: 'integer',
  })
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
  @ApiProperty({
    description: 'Delivery address for the order',
    example: '123 Main Street, City, State 12345',
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
  @ApiPropertyOptional({
    description: 'Optional note for the order',
    example: 'Please deliver after 6 PM',
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
    example: PaymentMethodEnum.CREDIT_CARD,
  })
  @IsEnum(PaymentMethodEnum, {
    message: i18nValidationMessage('common.validation.isEnum', {
      field: 'paymentMethod',
      enum: PaymentMethodEnum,
    }),
  })
  paymentMethod: PaymentMethodEnum;
  @ApiPropertyOptional({
    description: 'Language preference for the order',
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
  @ApiProperty({
    description: 'List of items in the order',
    type: [OrderItemRequest],
    isArray: true,
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
