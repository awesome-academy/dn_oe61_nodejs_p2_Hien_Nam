/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let i18nService: I18nService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { login: jest.fn(), twitterCallback: jest.fn() },
        },
        {
          provide: I18nService,
          useValue: { translate: jest.fn().mockReturnValue('Login successfully') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(3600) },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    beforeEach(() => {});

    it('should login and set cookie if accessToken exists', async () => {
      const dto: LoginRequestDto = { email: 'test@mail.com', password: 'password' };
      const mockAccessToken = 'token123';
      const mockUser = { id: 1, email: 'test@mail.com', name: 'Test', role: 'user' };
      const mockResult = {
        statusKey: StatusKey.SUCCESS,
        data: { accessToken: mockAccessToken, user: mockUser },
      };
      const authServiceLoginSpy = jest.spyOn(authService, 'login').mockResolvedValue(mockResult);
      await controller.login(dto);
      expect(authServiceLoginSpy).toHaveBeenCalledWith(dto);
    });

    it('should not set cookie if accessToken does not exist', async () => {
      const dto: LoginRequestDto = { email: 'test@mail.com', password: 'password' };
      const mockResult = {
        statusKey: StatusKey.SUCCESS,
        data: {
          accessToken: null as unknown as string,
          user: {
            id: 1,
            email: 'test@mail.com',
            name: 'Test',
            role: 'user',
          },
        },
      };
      const authServiceLoginSpy = jest.spyOn(authService, 'login').mockResolvedValue(mockResult);
      await controller.login(dto);
      expect(authServiceLoginSpy).toHaveBeenCalledWith(dto);
    });
    it('should handle null dto gracefully', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.validation.errors.validationError',
      };
      const authServiceLoginSpy = jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.login(null as unknown as LoginRequestDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.BAD_REQUEST);
      }
      expect(authServiceLoginSpy).toHaveBeenCalledWith(null as unknown as typeof LoginRequestDto);
    });
    it('should handle invalid dto (not match validation)', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.validation.errors.validationError',
      };
      const invalidDto = { email: 'not-an-email', password: '1' };
      const authServiceLoginSpy = jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.login(invalidDto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.BAD_REQUEST);
      }
      expect(authServiceLoginSpy).toHaveBeenCalledWith(invalidDto);
    });
  });
  describe('loginFacebook', () => {
    beforeEach(() => {});

    it('should handle /facebook route and redirect to Facebook auth', () => {
      const facebookLoginSpy = controller.facebookLogin();
      expect(facebookLoginSpy).toEqual({
        message: i18nService.translate('common.auth.action.login.facebook'),
      });
    });

    it('callback should return payload when facebook returns accessToken', () => {
      const mockAccessToken = 'fb-token';
      const mockUser = { id: 2, email: 'fb@mail.com', name: 'FB User', role: 'user' };
      const loginResult: BaseResponse<LoginResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: { accessToken: mockAccessToken, user: mockUser },
      };
      const req: Partial<Request> = { user: loginResult };
      const requestMock = req as Request;
      const result = controller.facebookCallback(requestMock);
      expect(result).toEqual({
        success: true,
        messsage: 'Login successfully',
        payload: loginResult.data,
      });
    });

    it('callback should still return payload when accessToken absent', () => {
      const loginResult: BaseResponse<LoginResponse> = {
        statusKey: StatusKey.SUCCESS,
        data: {
          accessToken: null as unknown as string,
          user: {
            id: 2,
            email: 'fb@mail.com',
            name: 'FB User',
            role: 'user',
          },
        },
      };
      const req: Partial<Request> = { user: loginResult };
      const requestMock = req as Request;
      const result = controller.facebookCallback(requestMock);
      expect(result).toEqual({
        success: true,
        messsage: 'Login successfully',
        payload: loginResult.data,
      });
    });
  });

  const profile = {
    twitterId: '123',
    userName: 'john_doe',
    name: 'John Doe',
  } as const;

  describe('twitterLogin', () => {
    it('should resolve to undefined', async () => {
      const result = controller.twitterLogin();
      expect(result).toBeUndefined();
    });
  });

  describe('twitterCallback', () => {
    it('should return data from service', async () => {
      const expected = {
        accessToken: 'tok',
        user: { id: 1, name: 'John', role: 'USER' },
      };
      (authService.twitterCallback as jest.Mock).mockResolvedValue(expected);

      const result = await controller.twitterCallback(profile);

      expect(result).toEqual(expected);
      expect(authService.twitterCallback as jest.Mock).toHaveBeenCalledWith(profile);
    });

    it('should propagate thrown error', async () => {
      const err = new Error('boom');
      (authService.twitterCallback as jest.Mock).mockRejectedValue(err);

      await expect(controller.twitterCallback(profile)).rejects.toThrow(err);
    });

    it('should handle undefined profile gracefully', async () => {
      (authService.twitterCallback as jest.Mock).mockResolvedValue({
        accessToken: null,
        user: null,
      });

      const result = await controller.twitterCallback(undefined as any);

      expect(result).toEqual({ accessToken: null, user: null });
      expect(authService.twitterCallback as jest.Mock).toHaveBeenCalledWith(undefined);
    });

    it('should handle undefined response object', async () => {
      const expected = { accessToken: 'tok', user: { id: 1, name: 'John' } };
      (authService.twitterCallback as jest.Mock).mockResolvedValue(expected);

      const result = await controller.twitterCallback(profile);

      expect(result).toEqual(expected);
      expect(authService.twitterCallback as jest.Mock).toHaveBeenCalledWith(profile);
    });
  });
});
