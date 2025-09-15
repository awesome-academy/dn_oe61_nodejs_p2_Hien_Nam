import { MIN_NUMBER_ID } from '@app/common/constant/validation.constant';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmOrderRequest {
  @ApiProperty({
    description: 'ID of the user confirming the order',
    example: 123,
    type: 'number',
    minimum: MIN_NUMBER_ID,
  })
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
  @ApiProperty({
    description: 'ID of the order to be confirmed',
    example: 456,
    type: 'number',
    minimum: MIN_NUMBER_ID,
  })
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
}
