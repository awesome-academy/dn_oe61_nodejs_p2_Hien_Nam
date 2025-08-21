/* eslint-disable @typescript-eslint/unbound-method */
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { TwitterStrategy } from '../twitter.strategy';
import { mockTwitterProfile, MockTwitterProfile } from './strategy.interface';

describe('TwitterStrategy', () => {
  let strategy: TwitterStrategy;
  let configService: jest.Mocked<ConfigService>;
  let i18nService: jest.Mocked<I18nService>;

  beforeEach(() => {
    const rawCfg = { get: jest.fn().mockReturnValue('dummy') };
    configService = rawCfg as unknown as jest.Mocked<ConfigService>;

    const rawI18n = { translate: jest.fn().mockReturnValue('error') };
    i18nService = rawI18n as unknown as jest.Mocked<I18nService>;

    strategy = new TwitterStrategy(configService, i18nService);
  });

  describe('constructor()', () => {
    it('should throw InternalServerErrorException when required config is missing', () => {
      const cfgRaw = {
        get: jest.fn((key: string) => (key === 'TWITTER_CLIENT_ID' ? undefined : 'dummy')),
      };
      const cfgMock = cfgRaw as unknown as jest.Mocked<ConfigService>;

      expect(() => new TwitterStrategy(cfgMock, i18nService)).toThrow(InternalServerErrorException);
      expect(i18nService.translate).toHaveBeenCalledWith(
        'common.auth.action.twitter.invalidConfig',
      );
    });
  });

  describe('validate()', () => {
    const profileMock: MockTwitterProfile = mockTwitterProfile;

    it('should call done with user object when all arguments are provided', async () => {
      const done = jest.fn();
      const token = 'token';
      const tokenSecret = 'tokenSecret';

      await strategy.validate(token, tokenSecret, profileMock, done);

      expect(done).toHaveBeenCalledWith(null, {
        twitterId: profileMock.id,
        userName: profileMock.username,
        name: profileMock.displayName,
        token,
        tokenSecret,
      });
    });

    it.each([
      { token: null, tokenSecret: 'secret', profile: profileMock, missing: 'token' },
      { token: 'token', tokenSecret: null, profile: profileMock, missing: 'tokenSecret' },
      { token: 'token', tokenSecret: 'secret', profile: null, missing: 'profile' },
    ])(
      'should throw UnauthorizedException when $missing is missing',
      async ({ token, tokenSecret, profile }) => {
        await expect(
          strategy.validate(
            token as unknown as string,
            tokenSecret as unknown as string,
            profile,
            jest.fn(),
          ),
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(i18nService.translate).toHaveBeenCalledWith('common.auth.action.twitter.error');
      },
    );
  });
});
