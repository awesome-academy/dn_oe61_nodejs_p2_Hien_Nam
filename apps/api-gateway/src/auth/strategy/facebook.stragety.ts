import { AuthMsgPattern } from '@app/common';
import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { AUTH_SERVICE } from '@app/common/constant/service.constant';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';
import { ProfileFacebookUser } from '@app/common/dto/user/requests/facebook-user-dto.request';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { PassportStrategy } from '@nestjs/passport';
import { Profile } from 'passport';
import { Strategy, StrategyOptions } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly configService: ConfigService,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly loggerService: CustomLogger,
  ) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('facebook.appID', ''),
      clientSecret: configService.get<string>('facebook.appSecret', ''),
      callbackURL: 'http://localhost:3002/auths/facebook/callback',
      scope: 'email',
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    };
    super(options);
  }
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<BaseResponse<LoginResponse>> {
    const { id, name, emails, photos } = profile;
    const profileFacebookUser: ProfileFacebookUser = {
      providerId: id,
      firstName: name?.givenName,
      lastName: name?.familyName,
      email: emails?.[0]?.value,
      avatarUrl: photos?.[0]?.value,
    };
    const loginResponse = await callMicroservice(
      this.authClient.send<BaseResponse<LoginResponse>>(
        AuthMsgPattern.AUTH_LOGIN_FACEBOOK,
        profileFacebookUser,
      ),
      AUTH_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
    return loginResponse;
  }
}
