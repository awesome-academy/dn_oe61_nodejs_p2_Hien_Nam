import { MAX_MONTH, MIN_MONTH, MIN_YEAR } from '@app/common/constant/validation.constant';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class GetStatisticByMonthRequest {
  @ApiProperty({
    description: 'Month to get statistic',
    example: 1,
    minimum: 1,
    maximum: 12,
    type: 'integer',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'month',
    }),
  })
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('common.validation.isNumber', {
      field: 'month',
    }),
  })
  @Min(MIN_MONTH, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'month',
      value: MIN_MONTH,
    }),
  })
  @Max(MAX_MONTH, {
    message: i18nValidationMessage('common.validation.max', {
      field: 'month',
      value: MAX_MONTH,
    }),
  })
  month: number;
  @ApiProperty({
    description: 'Year to get statistic',
    example: 2024,
    type: 'integer',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'year',
    }),
  })
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('common.validation.isNumber', {
      field: 'year',
    }),
  })
  @Min(MIN_YEAR, {
    message: i18nValidationMessage('common.validation.min', {
      field: 'month',
      value: MIN_YEAR,
    }),
  })
  year: number;
}
