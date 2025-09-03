import { Controller } from '@nestjs/common';
import { ProductService } from './product-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { CreateProductDto } from '@app/common/dto/product/create-product.dto';
import { ProductResponse } from '@app/common/dto/product/response/product-response';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { Product } from '../generated/prisma';

@Controller()
export class ProductServiceController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern(ProductPattern.CHECK_PRODUCT_EXISTS)
  async checkProductExists(@Payload() skuId: string) {
    return await this.productService.checkProductExists(skuId);
  }

  @MessagePattern(ProductPattern.CREATE_PRODUCT)
  async createProduct(@Payload() payLoad: CreateProductDto): Promise<ProductResponse | null> {
    return await this.productService.createProduct(payLoad);
  }

  @MessagePattern(ProductPattern.UPDATE_PRODUCT)
  async updateProduct(
    @Payload() payLoad: { payLoad: UpdateProductDto; skuIdParam: string },
  ): Promise<Product | null> {
    return await this.productService.updateProduct(payLoad.payLoad, payLoad.skuIdParam);
  }
}
