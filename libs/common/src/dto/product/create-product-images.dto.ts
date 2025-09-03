import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateProductImagesDto {
  @Transform(({ value }) => parseInt(value as string))
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'productId',
    }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'productId',
    }),
  })
  productId: number;
}

export class CreateProductImagesServiceDto {
  @IsInt({
    message: i18nValidationMessage('common.validation.isInt', {
      field: 'productId',
    }),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('common.validation.isNotEmpty', {
      field: 'productId',
    }),
  })
  productId: number;

  @IsArray()
  @IsString({ each: true })
  secureUrls: string[];
}
