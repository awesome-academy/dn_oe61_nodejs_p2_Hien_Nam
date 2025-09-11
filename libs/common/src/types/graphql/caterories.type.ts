import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class CategoryType {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => ID, { nullable: true })
  parentId: number | '';

  @Field(() => String, { nullable: true })
  createdAt: Date | null;

  @Field(() => String, { nullable: true })
  updatedAt: Date | null;
}

@ObjectType()
export class PaginationMeta {
  @Field(() => Number)
  currentPage: number;

  @Field(() => Number)
  totalPages: number;

  @Field(() => Number)
  pageSize: number;

  @Field(() => Number)
  totalItems: number;

  @Field(() => Number)
  itemsOnPage: number;
}

@ObjectType()
export class RootCategoryGraphQL {
  @Field(() => Number)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  parent: string;

  @Field(() => String, { nullable: true })
  createdAt?: Date | null;

  @Field(() => String, { nullable: true })
  updatedAt?: Date | null;
}

@ObjectType()
export class ChildCategoryGraphQL {
  @Field(() => Number)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  parent: string;

  @Field(() => String, { nullable: true })
  createdAt?: Date | null;

  @Field(() => String, { nullable: true })
  updatedAt?: Date | null;
}

@ObjectType()
export class CategoryGroupGraphQL {
  @Field(() => RootCategoryGraphQL)
  rootCategory: RootCategoryGraphQL;

  @Field(() => [ChildCategoryGraphQL])
  childCategories: ChildCategoryGraphQL[];
}

@ObjectType()
export class CategoriesResponseGraphQL {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;

  @Field(() => [CategoryGroupGraphQL], { nullable: true })
  items?: CategoryGroupGraphQL[];

  @Field(() => PaginationMeta, { nullable: true })
  paginations?: PaginationMeta;
}

@ObjectType()
export class CategoriesType {
  @Field(() => [CategoryGroupGraphQL], { nullable: true })
  items?: CategoryGroupGraphQL[];

  @Field(() => PaginationMeta, { nullable: true })
  paginations?: PaginationMeta;
}
