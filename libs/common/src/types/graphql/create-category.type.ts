import { Field, ObjectType } from '@nestjs/graphql';
import { CategoryType } from './caterories.type';

@ObjectType()
export class CategoryResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;

  @Field(() => CategoryType, { nullable: true })
  data?: CategoryType | null;
}
