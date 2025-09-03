import { IsEnum, IsInt, IsString } from 'class-validator';
import { UserResponse } from './responses/user.response';
import { UserStatus } from '@app/common/enums/user-status.enum';

export class PayLoadJWT {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsString()
  email?: string;
  @IsEnum(UserStatus)
  status: string;
  @IsString()
  providerName: string;
}
export class PayLoadJWTComplete {
  @IsString()
  token: string;

  @IsString()
  user: UserResponse;
}
