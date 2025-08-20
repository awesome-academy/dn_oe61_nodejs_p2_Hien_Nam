import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetUserProfileRequest {
  @IsNotEmpty({ message: 'common.validation.userId.required' })
  @IsNumber({}, { message: 'common.validation.userId.number' })
  userId: number;
}
