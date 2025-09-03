import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { ProductDto } from '@app/common/dto/product/product.dto';
import { ParseJsonFieldsInterceptor } from '@app/common/interceptors/form-data/parse-json-fields.interceptor';
import { ParseCommaSeparatedFieldsInterceptor } from '@app/common/interceptors/form-data/parse-comma-separated-fields.interceptor';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { Role } from '@app/common/enums/roles/users.enum';
import { COLUMN } from '@app/common/constant/column.constant';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';

@Controller('admin/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @AuthRoles(Role.ADMIN)
  @Post('')
  @UseInterceptors(
    FilesInterceptor('images', 10),
    new ParseJsonFieldsInterceptor([COLUMN.VARIANTS]),
    new ParseCommaSeparatedFieldsInterceptor([COLUMN.CATEGORY_IDS]),
  )
  async create(
    @Body() input: ProductDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<BaseResponse<ProductResponse>> {
    return this.productService.create(input, files);
  }

  @AuthRoles(Role.ADMIN)
  @Patch(':skuId')
  async update(@Param('skuId') skuId: string, @Body() input: UpdateProductDto) {
    return await this.productService.update(skuId, input);
  }
}
