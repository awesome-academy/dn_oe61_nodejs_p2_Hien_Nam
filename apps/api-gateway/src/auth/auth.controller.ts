import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';
import { SetAccessTokenInterceptor } from '@app/common/interceptors/set-access-token.interceptor';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { Body, Controller, Get, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { AuthService } from './auth.service';
import { Public } from '@app/common/decorators/metadata.decorator';
import { UserDecorator } from '@app/common';
import { TwitterProfileDto } from '@app/common/dto/twitter-profile.dto';

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
  @Get('/facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookLogin(): object {
    return {
      message: this.i18nService.translate('common.auth.action.login.facebook'),
    };
  }
  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @UseInterceptors(SetAccessTokenInterceptor)
  facebookCallback(@Req() req: Request) {
    const loginResult: BaseResponse<LoginResponse> = req.user as BaseResponse<LoginResponse>;
    return {
      success: true,
      messsage: this.i18nService.translate('common.auth.action.login.success'),
      payload: loginResult.data,
    };
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
    return await this.authService.twitterCallback(user);
  }
}
