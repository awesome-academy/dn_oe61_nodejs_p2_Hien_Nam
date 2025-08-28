import { ProductDto } from './product.dto';
import { ValidateNested, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ValidateNested()
  @Type(() => ProductDto)
  productData: ProductDto;

  @IsArray()
  @IsString({ each: true })
  secureUrl: string[];
}
