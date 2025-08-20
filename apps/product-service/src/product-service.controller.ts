import { PaginationDto } from '@app/common/dto/pagination.dto';
import { CreateProductCategoryDto } from '@app/common/dto/product/create-product-category.dto';
import { CreateProductImagesServiceDto } from '@app/common/dto/product/create-product-images.dto';
import { CreateProductDto } from '@app/common/dto/product/create-product.dto';
import { DeleteProductCategoryDto } from '@app/common/dto/product/delete-product-category.dto';
import { DeleteProductImagesDto } from '@app/common/dto/product/delete-product-images.dto';
import { skuIdProductDto } from '@app/common/dto/product/delete-product.dto';
import { GetAllProductUserDto } from '@app/common/dto/product/get-all-product-user.dto';
import { AddProductCartRequest } from '@app/common/dto/product/requests/add-product-cart.request';
import { CreateReviewDto } from '@app/common/dto/product/requests/create-review.dto';
import { DeleteProductCartRequest } from '@app/common/dto/product/requests/delete-product-cart.request';
import { DeleteReviewDto } from '@app/common/dto/product/requests/delete-review.dto';
import { GetCartRequest } from '@app/common/dto/product/requests/get-cart.request';
import { GetProductReviewsDto } from '@app/common/dto/product/requests/get-product-reviews.dto';
import { OrderRequest } from '@app/common/dto/product/requests/order-request';
import { RejectOrderRequest } from '@app/common/dto/product/requests/reject-order.request';
import { RetryPaymentRequest } from '@app/common/dto/product/requests/retry-payment.requqest';
import { CartSummaryResponse } from '@app/common/dto/product/response/cart-summary.response';
import { DeleteReviewResponse } from '@app/common/dto/product/response/delete-review.response';
import {
  OrderResponse,
  PaymentInfoResponse,
} from '@app/common/dto/product/response/order-response';
import { PayOSWebhookDTO } from '@app/common/dto/product/response/payos-webhook.dto';
import { ProductCategoryResponse } from '@app/common/dto/product/response/product-category-response';
import {
  ProductDetailResponse,
  UserProductDetailResponse,
} from '@app/common/dto/product/response/product-detail-reponse';
import {
  ProductResponse,
  UserProductResponse,
} from '@app/common/dto/product/response/product-response';
import {
  CreateReviewResponse,
  ReviewResponse,
} from '@app/common/dto/product/response/review-response.dto';
import { UpdateProductDto } from '@app/common/dto/product/upate-product.dto';
import { UpdateProductCategoryDto } from '@app/common/dto/product/update-product-category.dto';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { Controller, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Product } from '../generated/prisma';
import { ProductService } from './product-service.service';

import { GetOrderRequest } from '@app/common/dto/product/requests/get-order.request';
import { FilterGetOrdersRequest } from '@app/common/dto/product/requests/filter-get-orders.request';
import { PaginationArgs } from '@app/common/types/graphql/arg-type/pagination.type';
import { CategoryGroupGraphQL, CategoryType } from '@app/common/types/graphql/caterories.type';
import { GraphQLCateroryInput } from '@app/common/types/graphql/arg-type/create-category.type';
import { GraphQLUpdateCateroryInput } from '@app/common/types/graphql/arg-type/update-category.typ';

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

  @MessagePattern(ProductPattern.DELETE_PRODUCT)
  async deleteProduct(@Payload() payLoad: skuIdProductDto): Promise<Product | null> {
    return await this.productService.deleteProduct(payLoad);
  }

  @MessagePattern(ProductPattern.GET_BY_ID)
  async getById(@Payload() payLoad: skuIdProductDto): Promise<ProductDetailResponse | null> {
    return await this.productService.getById(payLoad);
  }

  @MessagePattern(ProductPattern.GET_ALL)
  async getAll(@Payload() payLoad: PaginationDto): Promise<PaginationResult<ProductResponse>> {
    return await this.productService.getAll(payLoad);
  }

  @MessagePattern(ProductPattern.CREATE_PRODUCT_CATEGORY)
  async createProductCategory(
    @Payload() payLoad: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return await this.productService.createProductCategory(payLoad);
  }

  @MessagePattern(ProductPattern.UPDATE_PRODUCT_CATEGORY)
  async updateProductCategory(
    @Payload() payLoad: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return await this.productService.updateProductCategory(payLoad);
  }

  @MessagePattern(ProductPattern.DELETE_PRODUCT_CATEGORY)
  async deleteProductCategory(
    @Payload() payLoad: DeleteProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return await this.productService.deleteProductCategory(payLoad);
  }

  @MessagePattern(ProductPattern.CHECK_PRODUCT_BY_ID)
  async checkProductById(@Payload() productId: number) {
    return await this.productService.checkProductById(productId);
  }

  @MessagePattern(ProductPattern.COUNT_PRODUCT_IMAGES)
  async countProductImages(@Payload() productId: number) {
    return await this.productService.countProductImages(productId);
  }

  @MessagePattern(ProductPattern.CREATE_PRODUCT_IMAGES)
  async createProductImages(@Payload() payLoad: CreateProductImagesServiceDto) {
    return await this.productService.createProductImages(payLoad);
  }

  @MessagePattern(ProductPattern.DELETE_PRODUCT_IMAGES)
  async deleteProductImages(@Payload() payLoad: DeleteProductImagesDto) {
    return await this.productService.deleteProductImages(payLoad);
  }
  @MessagePattern(ProductPattern.ADD_PRODUCT_CART)
  async addProductCart(
    @Payload() payLoad: AddProductCartRequest,
  ): Promise<BaseResponse<CartSummaryResponse>> {
    return await this.productService.addProductCart(payLoad);
  }
  @MessagePattern(ProductPattern.DELETE_PRODUCT_CART)
  async deleteProductCart(
    @Payload() payLoad: DeleteProductCartRequest,
  ): Promise<BaseResponse<CartSummaryResponse>> {
    return await this.productService.deleteProductCart(payLoad);
  }
  @MessagePattern(ProductPattern.GET_ALL_USER)
  async listProductsForUser(
    @Payload() payLoad: GetAllProductUserDto,
  ): Promise<PaginationResult<UserProductResponse>> {
    return await this.productService.listProductsForUser(payLoad);
  }

  @MessagePattern(ProductPattern.GET_BY_ID_FOR_USER)
  async getProductDetailForUser(
    @Payload() payload: skuIdProductDto,
  ): Promise<UserProductDetailResponse | null> {
    return await this.productService.getProductDetailForUser(payload);
  }
  @UsePipes(I18nRpcValidationPipe)
  @MessagePattern(ProductPattern.GET_CART)
  async getCart(@Payload() payLoad: GetCartRequest): Promise<BaseResponse<CartSummaryResponse>> {
    return await this.productService.getCart(payLoad);
  }

  @MessagePattern(ProductPattern.CREATE_REVIEW)
  async createReview(
    @Payload() data: { skuId: string } & { userId: number } & CreateReviewDto,
  ): Promise<CreateReviewResponse> {
    const { skuId, userId, ...reviewData } = data;
    return await this.productService.createReview(skuId, reviewData, userId);
  }

  @MessagePattern(ProductPattern.GET_PRODUCT_REVIEWS)
  async getProductReviews(
    data: { skuId: string } & GetProductReviewsDto,
  ): Promise<PaginationResult<ReviewResponse>> {
    const { skuId, ...reviewsData } = data;
    return this.productService.getProductReviews(skuId, reviewsData);
  }

  @MessagePattern(ProductPattern.DELETE_REVIEW)
  async deleteReview(@Payload() deleteReviewData: DeleteReviewDto): Promise<DeleteReviewResponse> {
    return await this.productService.deleteReview(deleteReviewData);
  }
  @UsePipes(I18nRpcValidationPipe)
  @MessagePattern(ProductPattern.CREATE_ORDER)
  async createOrder(@Payload() payLoad: OrderRequest): Promise<BaseResponse<OrderResponse>> {
    return await this.productService.createOrder(payLoad);
  }
  @UsePipes(I18nRpcValidationPipe)
  @MessagePattern(ProductPattern.RETRY_PAYMENT)
  async retryPayment(
    @Payload() payLoad: RetryPaymentRequest,
  ): Promise<BaseResponse<PaymentInfoResponse>> {
    return await this.productService.retryPayment(payLoad);
  }
  @MessagePattern(ProductPattern.CALLBACK_WEBHOOK_PAYMENT)
  callbackWebHook(@Payload() payLoad: PayOSWebhookDTO) {
    return this.productService.handleWebhookCallbackPayment(payLoad);
  }
  @MessagePattern(ProductPattern.REJECT_ORDER)
  async rejectOrder(@Payload() payLoad: RejectOrderRequest) {
    return this.productService.rejectOrder(payLoad);
  }
  @MessagePattern(ProductPattern.CONFIRM_ORDER)
  async confirmOrder(@Payload() payLoad: RejectOrderRequest) {
    return this.productService.confirmOrder(payLoad);
  }

  @MessagePattern(ProductPattern.GET_ALL_CATERORY)
  async getAllCategories(
    @Payload() payload: PaginationArgs,
  ): Promise<PaginationResult<CategoryGroupGraphQL>> {
    return await this.productService.getAllCategories(payload);
  }

  @MessagePattern(ProductPattern.CREATE_CATEGORY)
  async createCategory(@Payload() payload: GraphQLCateroryInput): Promise<CategoryType> {
    return await this.productService.createCategory(payload);
  }

  @MessagePattern(ProductPattern.UPDATE_CATEGORY)
  async updateCategory(@Payload() payLoad: GraphQLUpdateCateroryInput) {
    return this.productService.updateCategory(payLoad);
  }
  @MessagePattern(ProductPattern.GET_ORDER)
  async getOrder(@Payload() payLoad: GetOrderRequest) {
    return this.productService.getOrder(payLoad);
  }
  @MessagePattern(ProductPattern.GET_ORDERS)
  async getOrders(@Payload() filter: FilterGetOrdersRequest) {
    return this.productService.getOrders(filter);
  }
}
