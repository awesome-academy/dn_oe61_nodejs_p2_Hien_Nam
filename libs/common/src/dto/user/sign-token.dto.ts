import { IsInt, IsString } from 'class-validator';
import { UserResponse } from './responses/user.response';

export class PayLoadJWT {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsString()
  email?: string;

  @IsString()
  providerName: string;
}

export class PayLoadJWTComplete {
  @IsString()
  token: string;

  @IsString()
  user: UserResponse;
}
