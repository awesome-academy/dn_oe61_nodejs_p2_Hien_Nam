import { AUTH_SERVICE } from '@app/common/constant/service.constant';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import * as micro from '@app/common/helpers/microservices';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';

import { of } from 'rxjs';
import { USER_SERVICE } from '@app/common/constant/service.constant';
import { I18nService } from 'nestjs-i18n';
import { TwitterProfileDto } from '@app/common/dto/twitter-profile.dto';
import { BadRequestException } from '@nestjs/common';

afterEach(() => {
  jest.clearAllMocks();
});
describe('ApiGateway AuthService', () => {
  let service: AuthService;
  const userClientMock: { send: jest.Mock } = { send: jest.fn() };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AUTH_SERVICE,
          useValue: { send: jest.fn() },
        },
        {
          provide: CustomLogger,
          useValue: { error: jest.fn(), log: jest.fn() },
        },
        {
          provide: USER_SERVICE,
          useValue: userClientMock,
        },
        {
          provide: I18nService,
          useValue: { translate: jest.fn().mockReturnValue('Translated msg') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should login successfully', async () => {
    const dto: LoginRequestDto = { email: 'test@example.com', password: '123456' };
    const response = {
      status: 200,
      data: {
        accessToken: 'token',
        user: { id: 1, email: 'test@example.com', name: 'Test', role: 'USER' },
      },
    };
    jest.spyOn(micro, 'callMicroservice').mockResolvedValue(response);
    const result = await service.login(dto);
    expect(result).toEqual(response);
    expect(micro.callMicroservice).toHaveBeenCalled();
  });
  it('should propagate error from AuthService microservice', async () => {
    const dto: LoginRequestDto = { email: 'test@example.com', password: '123456' };
    jest.spyOn(micro, 'callMicroservice').mockRejectedValueOnce(
      new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      }),
    );
    await expect(service.login(dto)).rejects.toThrow(TypedRpcException);
  });
  it('should propagate error from AuthService microservice down', async () => {
    const dto: LoginRequestDto = { email: 'test@example.com', password: '123456' };
    const rpcError = {
      code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
      message: 'common.errors.unavailableService',
    } as const;
    jest.spyOn(micro, 'callMicroservice').mockRejectedValueOnce(new TypedRpcException(rpcError));
    try {
      await service.login(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(TypedRpcException);
      expect((error as TypedRpcException).getError()).toEqual(rpcError);
      expect((error as TypedRpcException).getError().code).toEqual(
        HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
      );
    }
  });

  describe('twitterCallback', () => {
    const baseProfile: TwitterProfileDto = {
      twitterId: 'tw1',
      name: 'John',
      userName: 'johnny',
    };

    it('should throw BadRequestException when user is null', async () => {
      await expect(service.twitterCallback(null as unknown as TwitterProfileDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return response when user exists', async () => {
      const existingUser = {
        id: 1,
        email: 'a@mail.com',
        name: 'John',
        role: 'USER',
        userName: 'johnny',
        providerName: 'twitter',
      };
      const token = 'token123';

      userClientMock.send.mockReturnValueOnce(of(existingUser)).mockReturnValueOnce(of(token));

      const result = await service.twitterCallback(baseProfile);

      expect(result).toEqual({
        accessToken: token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
        },
      });
      expect(userClientMock.send).toHaveBeenCalledTimes(2);
    });

    it('should create user when not exists and return token', async () => {
      const createdUser = {
        id: 2,
        email: 'b@mail.com',
        name: 'Bob',
        role: 'USER',
        userName: 'bobby',
        providerName: 'twitter',
      };
      const token = 'token456';

      userClientMock.send
        .mockReturnValueOnce(of(null))
        .mockReturnValueOnce(of(createdUser))
        .mockReturnValueOnce(of(token));

      const profile = { ...baseProfile, twitterId: 'tw2', name: 'Bob', userName: 'bobby' };

      const result = await service.twitterCallback(profile);

      expect(result.accessToken).toBe(token);
      expect(result.user.id).toBe(createdUser.id);
      expect(userClientMock.send).toHaveBeenCalledTimes(3);
    });

    it('should throw BadRequestException when token signing fails', async () => {
      const existingUser = {
        id: 3,
        email: 'c@mail.com',
        name: 'Cat',
        role: 'USER',
        userName: 'cat',
        providerName: 'twitter',
      };

      userClientMock.send.mockReturnValueOnce(of(existingUser)).mockReturnValueOnce(of(null));

      await expect(service.twitterCallback(baseProfile)).rejects.toThrow(BadRequestException);
    });
  });
});
