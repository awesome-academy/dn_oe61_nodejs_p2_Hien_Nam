import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsOptional, IsInt, Min, Max, IsNumber, IsString } from 'class-validator';

@InputType()
export class GetReviewsInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  productId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  userId?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @Field(() => String, { nullable: true, defaultValue: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: string = 'desc';
}
