/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
  ) {
    const clientID = configService.get<string>('google.appID');
    const clientSecret = configService.get<string>('google.appSecret');
    const callbackURL = configService.get<string>('google.callbackUrl');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new InternalServerErrorException(
        i18nService.translate('common.auth.action.google.invalidConfig'),
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    if (!profile) {
      const message = this.i18nService.translate('common.auth.action.google.error');
      done(new UnauthorizedException(message), false);
      return;
    }

    const { name, emails } = profile;
    if (!emails || emails.length === 0) {
      const message = this.i18nService.translate('common.auth.action.google.error');
      done(new UnauthorizedException(message), false);
      return;
    }

    const user = {
      googleId: profile.id,
      email: emails[0].value,
      userName: emails[0].value.split('@')[0],
      name: `${name?.givenName} ${name?.familyName}`.trim(),
    };
    done(null, user);
    return Promise.resolve();
  }
}
