import { IsInt, IsString } from 'class-validator';

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
