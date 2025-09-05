import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserProductService } from './user-product.service';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { Role } from '@app/common/enums/roles/users.enum';
import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { UserProductResponse } from '@app/common/dto/product/response/product-response';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';

@Controller('user/products')
export class UserProductController {
  constructor(private readonly userProductService: UserProductService) {}

  @AuthRoles(Role.USER)
  @Get('')
  async listProductsForUser(
    @Query() query: GetAllProductUserDto,
  ): Promise<BaseResponse<UserProductResponse[]>> {
    return this.userProductService.listProductsForUser(query);
  }

  @AuthRoles(Role.USER)
  @Get(':skuId')
  async getProductDetailForUser(
    @Param() dto: GetByIdProductDto,
  ): Promise<BaseResponse<UserProductDetailResponse>> {
    return this.userProductService.getProductDetailForUser(dto);
  }
}
