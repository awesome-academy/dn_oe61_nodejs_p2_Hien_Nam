import { AuthMsgPattern } from '@app/common';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { Controller } from '@nestjs/common';
import { AuthService } from './auth-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { PayLoadJWT } from '@app/common/dto/user/sign-token.dto';

@Controller()
export class AuthServiceController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AuthMsgPattern.AUTH_LOGIN)
  async login(data: LoginRequestDto) {
    return this.authService.login(data);
  }

  @MessagePattern({ cmd: AuthMsgPattern.VALIDATE_USER })
  async validateUser(@Payload() data: { token: string }): Promise<TUserPayload> {
    return await this.authService.validateToken(data.token);
  }

  @MessagePattern({ cmd: AuthMsgPattern.SIGN_JWT_TOKEN })
  async signJwtToken(@Payload() data: PayLoadJWT) {
    const result = await this.authService.signJwtToken(data);
    return result;
  }
}
