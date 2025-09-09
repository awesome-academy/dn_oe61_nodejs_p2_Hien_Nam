import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

@InputType()
export class GraphQLCateroryInput {
  @Field(() => String, { nullable: false })
  @IsString({ message: i18nValidationMessage('common.validation.isString', { field: 'name' }) })
  @IsNotEmpty({ message: i18nValidationMessage('common.validation.isNotEmpty', { field: 'name' }) })
  name: string;

  @Field(() => Int, { nullable: true })
  @IsInt({ message: i18nValidationMessage('common.validation.isInt', { field: 'parentId' }) })
  @Type(() => Number)
  @IsOptional()
  parentId?: number;
}
