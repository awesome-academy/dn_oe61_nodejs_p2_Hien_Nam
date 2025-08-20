import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { AuthService } from './auth.service';
import { SetAccessTokenInterceptor } from '@app/common/interceptors/set-access-token.interceptor';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly i18nService: I18nService,
    private readonly configService: ConfigService,
  ) {}
  @Post('/login')
  @UseInterceptors(SetAccessTokenInterceptor)
  login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
  }
}
