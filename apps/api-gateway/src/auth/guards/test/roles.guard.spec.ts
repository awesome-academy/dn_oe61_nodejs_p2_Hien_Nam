import { JwtAuthGuard } from '../jwt-auth.guard';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AUTH_SERVICE } from '@app/common/constant/service.constant';
import { I18nService } from 'nestjs-i18n';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { TestRequestJWT } from './guard.interface';

const mockedUser: TUserPayload = { id: 1, email: 'demo@example.com' } as TUserPayload;

function createExecutionContext(request: TestRequestJWT): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let clientProxy: jest.Mocked<ClientProxy>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let i18n: I18nService;

  beforeEach(async () => {
    clientProxy = {
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        Reflector,
        { provide: AUTH_SERVICE, useValue: clientProxy },
        {
          provide: I18nService,
          useValue: { translate: jest.fn().mockImplementation((key: string) => key) },
        },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
    reflector = module.get(Reflector);
    i18n = module.get(I18nService);
  });

  describe('canActivate', () => {
    it('should allow public route', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
      const ctx = createExecutionContext({});
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should validate token from Authorization header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of(mockedUser));
      const ctx = createExecutionContext({ headers: { authorization: 'Bearer abc' } });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(sendSpy).toHaveBeenCalledWith({ cmd: 'validate_user' }, { token: 'abc' });
    });

    it('should validate token from token header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of(mockedUser));
      const ctx = createExecutionContext({ headers: { token: 'xyz' } });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(expect.anything(), { token: 'xyz' });
    });

    it('should validate token from cookie', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of(mockedUser));
      const ctx = createExecutionContext({ cookies: { token: 'cookieToken' }, headers: {} });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(expect.anything(), { token: 'cookieToken' });
    });

    it('should prioritize Authorization header over other sources', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of(mockedUser));
      const request: TestRequestJWT = {
        headers: { authorization: 'Bearer primary', token: 'secondary' },
        cookies: { token: 'cookie' },
      };
      const ctx = createExecutionContext(request);

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(expect.anything(), { token: 'primary' });
      expect(request.user).toEqual(mockedUser);
    });

    it('should fallback to token header when Authorization is non-Bearer', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of(mockedUser));
      const ctx = createExecutionContext({
        headers: { authorization: 'Basic abc', token: 'fallback' },
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(expect.anything(), { token: 'fallback' });
    });

    it('should throw when Bearer token is empty', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createExecutionContext({ headers: { authorization: 'Bearer ' } });

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if token header is not a string', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createExecutionContext({ headers: { token: 12345 } });

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if cookie token is not a string', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createExecutionContext({ cookies: { token: 123 }, headers: {} });

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if token missing', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createExecutionContext({ headers: {} });

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if auth service returns null', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      clientProxy.send.mockReturnValue(of(null));
      const ctx = createExecutionContext({ headers: { authorization: 'Bearer invalid' } });

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw if auth service errors', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      clientProxy.send.mockReturnValue(throwError(() => new Error('boom')));
      const ctx = createExecutionContext({ headers: { authorization: 'Bearer err' } });

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
