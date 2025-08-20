import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';
import { SetAccessTokenInterceptor } from '@app/common/interceptors/set-access-token.interceptor';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { Body, Controller, Get, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { AuthService } from './auth.service';
import { ResponseDecorator, UserDecorator } from '@app/common';
import { TwitterProfileDto } from '@app/common/dto/twitter-profile.dto';
import { Public } from '@app/common/decorators/metadata.decorator';
import { CreateUserDto } from '@app/common/dto/user/create-user.dto';
import { CookieResponse } from '@app/common/interfaces/request-cookie.interface';
import { GoogleProfileDto } from '@app/common/dto/google-profile.dro';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { ConfigService } from '@nestjs/config';
import { ApiResponseRegister } from '@app/common/decorators/document/auth-documents/register.dto';
import { ApiResponseLogout } from '@app/common/decorators/document/auth-documents/logout.dto';

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
      message: this.i18nService.translate('common.auth.action.login.success'),
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
  async twitterCallback(
    @UserDecorator() user: TwitterProfileDto,
  ): Promise<BaseResponse<LoginResponse>> {
    return await this.authService.twitterCallback(user);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @UseInterceptors(SetAccessTokenInterceptor)
  async googleCallback(
    @UserDecorator() user: GoogleProfileDto,
  ): Promise<BaseResponse<LoginResponse>> {
    return await this.authService.googleCallback(user);
  }

  @ApiResponseRegister()
  @Public()
  @Post('register')
  async registerUser(@Body() userInput: CreateUserDto): Promise<BaseResponse<UserResponse>> {
    return await this.authService.register(userInput);
  }

  @Public()
  @Get('complete')
  showCompletePage() {
    return { url: `${this.configService.get<string>('FRONTEND_URL')}/activate` };
  }

  @Public()
  @Post('complete')
  async completeRegister(@Body('token') token: string): Promise<BaseResponse<UserResponse>> {
    return this.authService.completeRegister(token);
  }

  @ApiResponseLogout()
  @Get('logout')
  logout(@ResponseDecorator() res: CookieResponse) {
    return this.authService.logout(res);
  }
}
