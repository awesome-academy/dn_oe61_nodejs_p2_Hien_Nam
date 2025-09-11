import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CategoryService } from '../services/category.service';
import { AuthRoles } from '@app/common/decorators/auth-role.decorator';
import { Role } from '@app/common/enums/roles/users.enum';
import { CategoriesResponseGraphQL, CategoryType } from '@app/common/types/graphql/caterories.type';
import { PaginationArgs } from '@app/common/types/graphql/arg-type/pagination.type';
import { CategoryResponse } from '@app/common/types/graphql/create-category.type';
import { GraphQLCateroryInput } from '@app/common/types/graphql/arg-type/create-category.type';
import { GraphQLUpdateCateroryInput } from '@app/common/types/graphql/arg-type/update-category.typ';

@Resolver()
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Query(() => CategoriesResponseGraphQL)
  @AuthRoles(Role.ADMIN)
  async getCategories(@Args() args: PaginationArgs) {
    return await this.categoryService.getCategories(args);
  }

  @Mutation(() => CategoryResponse)
  @AuthRoles(Role.ADMIN)
  async createCategory(@Args('input') args: GraphQLCateroryInput): Promise<CategoryType> {
    return await this.categoryService.createCategory(args);
  }

  @Mutation(() => CategoryResponse)
  @AuthRoles(Role.ADMIN)
  async updateCategory(@Args('input') args: GraphQLUpdateCateroryInput): Promise<CategoryType> {
    return await this.categoryService.updateCategory(args);
  }
}
