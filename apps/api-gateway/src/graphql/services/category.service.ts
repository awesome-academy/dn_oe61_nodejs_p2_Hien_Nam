import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CategoryGroupGraphQL,
  CategoryType,
  CategoriesType,
} from '@app/common/types/graphql/caterories.type';
import { PaginationArgs } from '@app/common/types/graphql/arg-type/pagination.type';
import { PaginationResult } from '@app/common/interfaces/pagination';
import { ProductPattern } from '@app/common/enums/message-patterns/product.pattern';
import { PRODUCT_SERVICE } from '@app/common/constant/service.constant';
import { ClientProxy } from '@nestjs/microservices';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { firstValueFrom } from 'rxjs';
import { GraphQLCateroryInput } from '@app/common/types/graphql/arg-type/create-category.type';
import { I18nService } from 'nestjs-i18n';
import { GraphQLUpdateCateroryInput } from '@app/common/types/graphql/arg-type/update-category.typ';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    private readonly i18nService: I18nService,
  ) {}

  async getCategories(args: PaginationArgs): Promise<CategoriesType> {
    const result = await firstValueFrom<PaginationResult<CategoryGroupGraphQL>>(
      this.productClient.send(ProductPattern.GET_ALL_CATERORY, args),
    );

    if (!result) {
      return {
        items: [],
        paginations: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          pageSize: args.pageSize || 10,
          itemsOnPage: 0,
        },
      };
    }

    return {
      items: result.items,
      paginations: result.paginations,
    };
  }

  async createCategory(args: GraphQLCateroryInput): Promise<CategoryType> {
    const result = await firstValueFrom<CategoryType>(
      this.productClient.send(ProductPattern.CREATE_CATEGORY, args),
    );

    if (!result) {
      throw new BadRequestException(
        this.i18nService.translate('common.category.action.createCategory.failed'),
      );
    }

    return result;
  }

  async updateCategory(args: GraphQLUpdateCateroryInput): Promise<CategoryType> {
    const result = await firstValueFrom<CategoryType>(
      this.productClient.send(ProductPattern.UPDATE_CATEGORY, args),
    );

    if (!result) {
      throw new BadRequestException(
        this.i18nService.translate('common.category.action.updateCategory.failed'),
      );
    }

    return result;
  }
}
