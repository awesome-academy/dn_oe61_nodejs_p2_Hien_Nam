import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { UserProductService } from './user-product.service';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { Role } from '@app/common/enums/roles/users.enum';
import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { GetByIdProductDto } from '@app/common/dto/product/get-by-id-product';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { UserProductResponse } from '@app/common/dto/product/response/product-response';
import { UserProductDetailResponse } from '@app/common/dto/product/response/product-detail-reponse';
import { Public } from '@app/common/decorators/metadata.decorator';
import { ShareUrlProductResponse } from '@app/common/dto/product/response/share-url-product-response';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';
import { GetProductReviewsDto } from '@app/common/dto/product/requests/get-product-reviews.dto';
import {
  CreateReviewResponse,
  ReviewResponse,
} from '@app/common/dto/product/response/review-response.dto';
import { DeleteReviewResponse } from '@app/common/dto/product/response/delete-review.response';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { UserDecorator } from '@app/common';
import { User } from 'apps/user-service/generated/prisma';
import { ApiResponseListProductsForUser } from '@app/common/decorators/document/product-documents/list-products-for-user.decorator';
import { ApiResponseGetProductDetailForUser } from '@app/common/decorators/document/product-documents/get-product-detail-for-user.decorator';
import { ApiResponseCreateReview } from '@app/common/decorators/document/product-documents/create-review.decorator';
import { ApiResponseGetProductReviews } from '@app/common/decorators/document/product-documents/get-product-reviews.decorator';
import { ApiResponseDeleteReview } from '@app/common/decorators/document/product-documents/delete-review.decorator';
import { ApiResponseShareProduct } from '@app/common/decorators/document/product-documents/share-product.decorator';

@Controller('user/products')
export class UserProductController {
  constructor(private readonly userProductService: UserProductService) {}

  @ApiResponseListProductsForUser()
  @AuthRoles(Role.USER)
  @Get('')
  async listProductsForUser(
    @Query() query: GetAllProductUserDto,
  ): Promise<BaseResponse<PaginationResult<UserProductResponse>>> {
    return this.userProductService.listProductsForUser(query);
  }

  @AuthRoles(Role.USER)
  @ApiResponseGetProductDetailForUser()
  @Public()
  @Get(':skuId')
  async getProductDetailForUser(
    @Param() dto: GetByIdProductDto,
  ): Promise<BaseResponse<UserProductDetailResponse>> {
    return this.userProductService.getProductDetailForUser(dto);
  }

  @ApiResponseShareProduct()
  @AuthRoles(Role.USER)
  @Post('share/:skuId')
  shareProduct(@Param() skuId: GetByIdProductDto): Promise<BaseResponse<ShareUrlProductResponse>> {
    return this.userProductService.shareProduct(skuId);
  }

  @ApiResponseCreateReview()
  @AuthRoles(Role.USER)
  @Post(':skuId/reviews')
  async createReview(
    @Param() param: GetByIdProductDto,
    @Body() createReviewDto: CreateReviewDto,
    @UserDecorator() user: User,
  ): Promise<BaseResponse<CreateReviewResponse>> {
    return await this.userProductService.createReview(param.skuId, createReviewDto, user.id);
  }

  @ApiResponseGetProductReviews()
  @Public()
  @Get(':skuId/reviews')
  async getProductReviews(
    @Param() param: GetByIdProductDto,
    @Query() query: GetProductReviewsDto,
  ): Promise<BaseResponse<PaginationResult<ReviewResponse>>> {
    return await this.userProductService.getProductReviews(param, query);
  }

  @ApiResponseDeleteReview()
  @AuthRoles(Role.USER)
  @Delete('reviews/:reviewId')
  async deleteReview(
    @Param('reviewId', new ParseIntPipe()) reviewId: number,
    @UserDecorator() user: User,
  ): Promise<BaseResponse<DeleteReviewResponse>> {
    const userId = user.id;
    return await this.userProductService.deleteReview(reviewId, userId);
  }
}
