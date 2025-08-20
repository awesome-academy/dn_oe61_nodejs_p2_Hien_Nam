import { AuthMsgPattern } from '@app/common';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request.';
import { ProfileFacebookUser } from '@app/common/dto/user/requests/facebook-user-dto.request';
import { PayLoadJWT } from '@app/common/dto/user/sign-token.dto';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth-service.service';
import { RpcExceptionsFilter } from '@app/common/filters/rpc-exceptions.filter';

@Controller()
@UseFilters(RpcExceptionsFilter)
export class AuthServiceController {
  constructor(private readonly authService: AuthService) {}
  // @UsePipes(new I18nRpcValidationPipe())
  @MessagePattern(AuthMsgPattern.AUTH_LOGIN)
  async login(@Payload() data: LoginRequestDto) {
    return this.authService.login(data);
  }

  @MessagePattern(AuthMsgPattern.VALIDATE_USER)
  async validateUser(@Payload() data: { token: string }): Promise<TUserPayload> {
    return await this.authService.validateToken(data.token);
  }
  @MessagePattern(AuthMsgPattern.AUTH_LOGIN_FACEBOOK)
  async loginFromFacebook(data: ProfileFacebookUser) {
    return this.authService.loginFromFacebook(data);
  }

  @MessagePattern({ cmd: AuthMsgPattern.SIGN_JWT_TOKEN })
  async signJwtToken(@Payload() data: PayLoadJWT) {
    const result = await this.authService.signJwtToken(data);
    return result;
  }

  @MessagePattern(AuthMsgPattern.SIGN_JWT_TOKEN_USER_CREATE)
  async signJwtTokenUserCreate(@Payload() data: PayLoadJWT) {
    const result = await this.authService.signJwtTokenUserCreate(data);
    return result;
  }
}
