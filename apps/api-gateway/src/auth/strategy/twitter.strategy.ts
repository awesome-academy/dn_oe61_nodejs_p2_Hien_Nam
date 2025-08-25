import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { I18nService } from 'nestjs-i18n';
import { Strategy as TwitterStrategyOAuth1 } from 'passport-twitter';

@Injectable()
export class TwitterStrategy extends PassportStrategy(TwitterStrategyOAuth1, 'twitter') {
  constructor(
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
  ) {
    const consumerKey = configService.get<string>('TWITTER_CLIENT_ID');
    const consumerSecret = configService.get<string>('TWITTER_CLIENT_SECRET');
    const callbackURL = configService.get<string>('TWITTER_CALLBACK_URL');

    if (!consumerKey || !consumerSecret || !callbackURL) {
      throw new InternalServerErrorException(
        i18nService.translate('common.auth.action.twitter.invalidConfig'),
      );
    }

    super({
      consumerKey,
      consumerSecret,
      callbackURL,
      includeEmail: true,
    });
  }

  async validate(
    token: string,
    tokenSecret: string,
    profile: {
      id: string;
      username: string;
      displayName: string;
    } | null,
    done: (error: Error | null, user?: unknown) => void,
  ): Promise<void> {
    if (!profile || !tokenSecret || !token) {
      throw new UnauthorizedException(
        this.i18nService.translate('common.auth.action.twitter.error'),
      );
    }

    const user = {
      twitterId: profile.id,
      userName: profile.username,
      name: profile.displayName,
      token,
      tokenSecret,
    };
    done(null, user);
    return Promise.resolve();
  }
}
