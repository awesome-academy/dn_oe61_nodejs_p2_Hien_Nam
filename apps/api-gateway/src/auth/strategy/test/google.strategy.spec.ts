/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { GoogleStrategy } from '../google-strategy';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let configService: jest.Mocked<ConfigService>;
  let i18nService: jest.Mocked<I18nService>;

  beforeEach(() => {
    const rawCfg = { get: jest.fn().mockReturnValue('dummy') };
    configService = rawCfg as unknown as jest.Mocked<ConfigService>;

    const rawI18n = { translate: jest.fn().mockReturnValue('error') };
    i18nService = rawI18n as unknown as jest.Mocked<I18nService>;

    strategy = new GoogleStrategy(configService, i18nService);
  });

  describe('constructor', () => {
    it('should throw InternalServerErrorException if config is missing', () => {
      configService.get.mockReturnValue(null);
      expect(() => new GoogleStrategy(configService, i18nService)).toThrow(
        InternalServerErrorException,
      );
      expect(i18nService.translate).toHaveBeenCalledWith('common.auth.action.google.invalidConfig');
    });
  });

  describe('validate()', () => {
    const mockProfile = {
      id: 'google-id',
      name: { givenName: 'John', familyName: 'Doe' },
      emails: [{ value: 'john.doe@example.com' }],
    };

    it('should call done with user object when profile is valid', async () => {
      const done = jest.fn();
      await strategy.validate('accessToken', 'refreshToken', mockProfile, done);

      expect(done).toHaveBeenCalledWith(null, {
        googleId: mockProfile.id,
        email: mockProfile.emails[0].value,
        userName: 'john.doe',
        name: 'John Doe',
      });
    });

    it.each([
      { case: 'profile is null', profile: null, emails: null },
      { case: 'emails missing', profile: { ...mockProfile, emails: [] }, emails: [] },
    ])('should call done with UnauthorizedException when $case', async ({ profile }) => {
      const done = jest.fn();
      await strategy.validate('accessToken', 'refreshToken', profile, done);

      expect(done.mock.calls[0][0]).toBeInstanceOf(UnauthorizedException);
      expect(done.mock.calls[0][1]).toBe(false);
      expect(i18nService.translate).toHaveBeenCalledWith('common.auth.action.google.error');
    });
  });
});
