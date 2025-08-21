import { IsString } from 'class-validator';

export class TwitterProfileDto {
  @IsString()
  twitterId: string;

  @IsString()
  userName: string;

  @IsString()
  name: string;
}
