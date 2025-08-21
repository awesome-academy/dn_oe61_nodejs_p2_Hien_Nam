import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { Body, Controller, Post, UseInterceptors, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { AuthService } from './auth.service';
import { SetAccessTokenInterceptor } from '@app/common/interceptors/set-access-token.interceptor';
import { Public } from '@app/common/decorators/metadata.decorator';
import { AuthGuard } from '@nestjs/passport';
import { UserDecorator } from '@app/common';
import { TwitterProfileDto } from '@app/common/dto/twitter-profile.dto';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly i18nService: I18nService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('/login')
  @UseInterceptors(SetAccessTokenInterceptor)
  login(@Body() dto: LoginRequestDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('twitter')
  @UseGuards(AuthGuard('twitter'))
  twitterLogin() {
    return;
  }

  @Public()
  @Get('twitter/callback')
  @UseGuards(AuthGuard('twitter'))
  @UseInterceptors(SetAccessTokenInterceptor)
  async twitterCallback(@UserDecorator() user: TwitterProfileDto): Promise<LoginResponse> {
    const result = await this.authService.twitterCallback(user);
    return result;
  }
}
