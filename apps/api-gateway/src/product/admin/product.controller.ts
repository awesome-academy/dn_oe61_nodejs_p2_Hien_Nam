import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { DeleteProductDto } from '@app/common/dto/product/delete-product.dto';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { ProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';
import { UpdateProductCategoryBodyDto } from '@app/common/dto/product/update-product-category.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import { DeleteProductCategoryDto } from '@app/common/dto/product/delete-product-category.dto';
import { CreateProductImagesDto } from '@app/common/dto/product/create-product-images.dto';
import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';
import { ProductImagesResponse } from '@app/common/dto/product/response/product-images.response.dto';

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

  @AuthRoles(Role.ADMIN)
  @Delete(':skuId')
  async delete(@Param() skuId: DeleteProductDto): Promise<BaseResponse<ProductResponse>> {
    return await this.productService.delete(skuId);
  }

  @AuthRoles(Role.ADMIN)
  @Get(':skuId')
  async getById(@Param() skuId: GetByIdProductDto): Promise<BaseResponse<ProductDetailResponse>> {
    return await this.productService.getById(skuId);
  }

  @AuthRoles(Role.ADMIN)
  @Get('')
  async getAll(
    @Query() query: { page: number; limit: number },
  ): Promise<BaseResponse<ProductResponse[]>> {
    return await this.productService.getAll(query);
  }

  @AuthRoles(Role.ADMIN)
  @Post('categories')
  async createProductCategory(
    @Body() input: CreateProductCategoryDto,
  ): Promise<BaseResponse<ProductCategoryResponse>> {
    return await this.productService.createProductCategory(input);
  }

  @AuthRoles(Role.ADMIN)
  @Patch('categories/:id')
  async updateProductCategory(
    @Param('id') id: number,
    @Body() input: UpdateProductCategoryBodyDto,
  ): Promise<BaseResponse<ProductCategoryResponse>> {
    return await this.productService.updateProductCategory({ ...input, id });
  }

  @AuthRoles(Role.ADMIN)
  @Delete('categories/:id')
  async deleteProductCategory(
    @Param() id: DeleteProductCategoryDto,
  ): Promise<BaseResponse<ProductCategoryResponse>> {
    return await this.productService.deleteProductCategory(id);
  }

  @AuthRoles(Role.ADMIN)
  @Post('images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async createProductImages(
    @Body() dto: CreateProductImagesDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return await this.productService.createProductImages(dto, files);
  }

  @AuthRoles(Role.ADMIN)
  @Delete('images/delete')
  async deleteProductImages(
    @Body() productImageIds: DeleteProductImagesDto,
  ): Promise<BaseResponse<ProductImagesResponse[] | []>> {
    return await this.productService.deleteProductImages(productImageIds);
  }
}
