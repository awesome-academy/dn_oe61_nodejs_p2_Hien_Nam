import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Min, IsOptional } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number;
}
