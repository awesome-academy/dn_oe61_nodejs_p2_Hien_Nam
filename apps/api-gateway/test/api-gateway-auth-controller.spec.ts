import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { BadRequestException, HttpException } from '@nestjs/common';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { login: jest.fn() },
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
  });

  describe('login', () => {
    it('should login and return service result', async () => {
      const dto: LoginRequestDto = { email: 'test@mail.com', password: 'password' };
      const mockAccessToken = 'token123';
      const mockUser = { id: 1, email: 'test@mail.com', name: 'Test', role: 'USER' };
      const mockResult = {
        statusKey: StatusKey.SUCCESS,
        data: { accessToken: mockAccessToken, user: mockUser },
      };
      const authServiceLoginSpy = jest.spyOn(authService, 'login').mockResolvedValue(mockResult);
      const result = await controller.login(dto);
      expect(authServiceLoginSpy).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });
    it('should throw BadRequestException with status 400 when dto is null', async () => {
      const authServiceLoginSpy = jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new BadRequestException('common.errors.validationError'));
      try {
        await controller.login(null as unknown as LoginRequestDto);
        fail('Expected BadRequestException was not thrown');
      } catch (err) {
        const error = err as HttpException;
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getStatus()).toBe(400);
        expect(error.message).toBe('common.errors.validationError');
      }
      expect(authServiceLoginSpy).toHaveBeenCalledWith(null as unknown as LoginRequestDto);
    });

    it('should return status 400 when dto validation fails', async () => {
      const invalidDto = { email: 'not-an-email', password: '1' };
      const authServiceLoginSpy = jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new BadRequestException('common.errors.validationError'));
      try {
        await controller.login(invalidDto);
        fail('Expected BadRequestException was not thrown');
      } catch (err) {
        const error = err as HttpException;
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getStatus()).toBe(400);
        expect(error.message).toBe('common.errors.validationError');
      }
      expect(authServiceLoginSpy).toHaveBeenCalledWith(invalidDto);
    });

    it('should propagate SERVICE_UNAVAILABLE TypedRpcException when auth service is down', async () => {
      const dto: LoginRequestDto = { email: 'test@mail.com', password: 'password' };
      const rpcError = {
        code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
        message: 'common.errors.unavailableService',
      } as const;
      const authServiceLoginSpy = jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.login(dto);
        fail('Expected TypedRpcException was not thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(TypedRpcException);
        expect((err as TypedRpcException).getError()).toEqual(rpcError);
      }
      expect(authServiceLoginSpy).toHaveBeenCalledWith(dto);
    });
    it('should propagate UNAUTHORIZED TypedRpcException when credentials are invalid', async () => {
      const dto: LoginRequestDto = { email: 'absent@mail.com', password: 'password' };
      const rpcError = {
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      } as const;
      const authServiceLoginSpy = jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new TypedRpcException(rpcError));
      try {
        await controller.login(dto);
        fail('Expected TypedRpcException was not thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(TypedRpcException);
        expect((err as TypedRpcException).getError()).toEqual(rpcError);
        expect((err as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.UNAUTHORIZED);
      }
      expect(authServiceLoginSpy).toHaveBeenCalledWith(dto);
    });
  });
});
