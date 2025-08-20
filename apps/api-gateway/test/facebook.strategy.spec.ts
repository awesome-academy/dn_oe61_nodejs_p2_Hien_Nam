import { AuthMsgPattern } from '@app/common';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import * as micro from '@app/common/helpers/microservices';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { Profile } from 'passport';
import { FacebookStrategy } from '../src/auth/stragety/facebook.stragety';
import { AUTH_SERVICE } from '@app/common/constant/service.constant';

describe('FacebookStrategy', () => {
  let strategy: FacebookStrategy;
  let configService: ConfigService;
  let authClient: ClientProxy;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let loggerService: CustomLogger;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacebookStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: string) => {
              if (key === 'facebook.appID') return 'fake-app-id';
              if (key === 'facebook.appSecret') return 'fake-app-secret';
              return def;
            }),
          },
        },
        {
          provide: AUTH_SERVICE,
          useValue: { send: jest.fn() },
        },
        {
          provide: CustomLogger,
          useValue: { error: jest.fn(), log: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<FacebookStrategy>(FacebookStrategy);
    configService = module.get<ConfigService>(ConfigService);
    authClient = module.get<ClientProxy>(AUTH_SERVICE);
    loggerService = module.get<CustomLogger>(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should register strategy with name "facebook" and load configs', () => {
      const getSpy = jest.spyOn(configService, 'get');
      expect(strategy.name).toBe('facebook');
      expect(getSpy).toHaveBeenCalledWith('facebook.appID', '');
      expect(getSpy).toHaveBeenCalledWith('facebook.appSecret', '');
    });
  });

  describe('validate', () => {
    it('should call auth microservice and return login response', async () => {
      const mockProfile: Profile = {
        id: 'fb123',
        displayName: 'Test User',
        name: { givenName: 'Test', familyName: 'User' },
        emails: [{ value: 'test@fb.com' }],
        photos: [{ value: 'http://fb.com/photo.jpg' }],
        provider: 'facebook',
        _raw: '',
        _json: {},
      } as Profile;
      const expectedPayload = {
        providerId: 'fb123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@fb.com',
        avatarUrl: 'http://fb.com/photo.jpg',
      };
      const mockResponse = {
        status: 200,
        data: {
          accessToken: 'mock-fb-token',
          user: { id: 1, email: 'test@fb.com', name: 'Test User', role: 'USER' },
        },
      };
      const authClientSpy = jest.spyOn(authClient, 'send');
      jest.spyOn(micro, 'callMicroservice').mockResolvedValue(mockResponse);
      const result = await strategy.validate('access-token', 'refresh-token', mockProfile);
      expect(authClientSpy).toHaveBeenCalledWith(
        AuthMsgPattern.AUTH_LOGIN_FACEBOOK,
        expectedPayload,
      );
      expect(result).toEqual(mockResponse);
    });
    it('should throw internal server error if token generation fails', async () => {
      const mockProfile: Profile = {
        id: 'fb123',
        displayName: 'Test User',
        name: { givenName: 'Test', familyName: 'User' },
        emails: [{ value: 'test@fb.com' }],
        photos: [{ value: 'http://fb.com/photo.jpg' }],
        provider: 'facebook',
        _raw: '',
        _json: {},
      } as Profile;
      const expectedPayload = {
        providerId: 'fb123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@fb.com',
        avatarUrl: 'http://fb.com/photo.jpg',
      };
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      const authClientSpy = jest.spyOn(authClient, 'send');
      jest.spyOn(micro, 'callMicroservice').mockRejectedValueOnce(new TypedRpcException(rpcError));

      try {
        await strategy.validate('access-token', 'refresh-token', mockProfile);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError().code).toBe(rpcError.code);
        expect((error as TypedRpcException).getError().message).toBe(rpcError.message);
      }
      expect(authClientSpy).toHaveBeenCalledWith(
        AuthMsgPattern.AUTH_LOGIN_FACEBOOK,
        expectedPayload,
      );
    });

    it('should propagate errors from callMicroservice', async () => {
      const mockProfile = {
        id: 'fb123',
        provider: 'facebook',
        name: {
          givenName: '',
          familyName: '',
        },
        emails: [],
        photos: [],
        displayName: '',
        _raw: '',
        _json: {},
      } as Profile;
      const rpcError = {
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      };
      jest.spyOn(micro, 'callMicroservice').mockRejectedValueOnce(new TypedRpcException(rpcError));
      try {
        await strategy.validate('access-token', 'refresh-token', mockProfile);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError().code).toBe(rpcError.code);
        expect((error as TypedRpcException).getError().message).toBe(rpcError.message);
      }
    });

    it('should call auth microservice and succeed when email is missing', async () => {
      const mockProfile: Profile = {
        id: 'fb123',
        displayName: 'Test User',
        name: { givenName: 'Test', familyName: 'User' },
        emails: [],
        photos: [{ value: 'http://fb.com/photo.jpg' }],
        provider: 'facebook',
        _raw: '',
        _json: {},
      } as Profile;

      const expectedPayload = {
        providerId: 'fb123',
        firstName: 'Test',
        lastName: 'User',
        email: undefined,
        avatarUrl: 'http://fb.com/photo.jpg',
      };

      const mockResponse = {
        status: 200,
        data: {
          accessToken: 'mock-fb-token',
          user: { id: 1, email: undefined, name: 'Test User', role: 'USER' },
        },
      };
      const authClientSpy = jest.spyOn(authClient, 'send');
      jest.spyOn(micro, 'callMicroservice').mockResolvedValue(mockResponse);
      const result = await strategy.validate('access-token', 'refresh-token', mockProfile);
      expect(authClientSpy).toHaveBeenCalledWith(
        AuthMsgPattern.AUTH_LOGIN_FACEBOOK,
        expectedPayload,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should call auth microservice and succeed when avatar is missing', async () => {
      const mockProfile: Profile = {
        id: 'fb123',
        displayName: 'Test User',
        name: { givenName: 'Test', familyName: 'User' },
        emails: [{ value: 'test@fb.com' }],
        photos: [],
        provider: 'facebook',
        _raw: '',
        _json: {},
      } as Profile;

      const expectedPayload = {
        providerId: 'fb123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@fb.com',
        avatarUrl: undefined,
      };

      const mockResponse = {
        status: 200,
        data: {
          accessToken: 'mock-fb-token',
          user: { id: 1, email: 'test@fb.com', name: 'Test User', role: 'USER' },
        },
      };

      const authClientSpy = jest.spyOn(authClient, 'send');
      jest.spyOn(micro, 'callMicroservice').mockResolvedValue(mockResponse);

      const result = await strategy.validate('access-token', 'refresh-token', mockProfile);
      expect(authClientSpy).toHaveBeenCalledWith(
        AuthMsgPattern.AUTH_LOGIN_FACEBOOK,
        expectedPayload,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate conflict errors from callMicroservice', async () => {
      const mockProfile = {
        id: 'fb123',
        provider: 'facebook',
        name: { givenName: 'Test', familyName: 'User' },
        emails: [{ value: 'test@fb.com' }],
        photos: [],
        displayName: '',
        _raw: '',
        _json: {},
      } as Profile;
      const rpcError = {
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.uniqueConstraint',
      };
      jest.spyOn(micro, 'callMicroservice').mockRejectedValueOnce(new TypedRpcException(rpcError));
      try {
        await strategy.validate('access-token', 'refresh-token', mockProfile);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError().code).toBe(rpcError.code);
        expect((error as TypedRpcException).getError().message).toBe(rpcError.message);
      }
    });
  });
});
