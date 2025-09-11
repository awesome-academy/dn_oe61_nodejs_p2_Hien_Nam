import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

@InputType()
export class GraphQLUpdateCateroryInput {
  @Field(() => ID)
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('common.validation.isInt', { field: 'id' }) })
  @IsNotEmpty({ message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'id' }) })
  id: number;

  @IsOptional()
  @Field(() => String, { nullable: true })
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'name' }) })
  name?: string | undefined;

  @Field(() => Int, { nullable: true })
  @IsInt({ message: i18nValidationMessage('common.validation.isInt', { field: 'parentId' }) })
  @Type(() => Number)
  @IsOptional()
  parentId?: number | undefined;
}
