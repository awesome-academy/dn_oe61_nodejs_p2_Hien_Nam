import { JwtAuthGuard } from '../jwt-auth.guard';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AUTH_SERVICE } from '@app/common/constant/service.constant';
import { I18nService } from 'nestjs-i18n';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthMsgPattern } from '@app/common';
import * as microserviceHelpers from '@app/common/helpers/microservices';
import { TestRequestJWT } from './guard.interface';

const mockedUser: TUserPayload = {
  id: 1,
  email: 'demo@example.com',
  role: 'USER',
  username: 'testuser',
  name: 'Test User',
  userName: 'testuser',
} as TUserPayload;

// Mock callMicroservice helper
jest.mock('@app/common/helpers/microservices', () => ({
  callMicroservice: jest.fn(),
}));

const mockCallMicroservice = microserviceHelpers.callMicroservice as jest.MockedFunction<
  typeof microserviceHelpers.callMicroservice
>;

function createExecutionContext(request: TestRequestJWT, isGraphQL = false): ExecutionContext {
  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    getType: jest.fn().mockReturnValue(isGraphQL ? 'graphql' : 'http'),
  } as unknown as ExecutionContext;

  return mockContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let clientProxy: jest.Mocked<ClientProxy>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let i18n: I18nService;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockCallMicroservice.mockReset();

    // Mock GqlExecutionContext.create to return null context by default
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: null }),
      getInfo: jest.fn(),
      getArgs: jest.fn(),
      getRoot: jest.fn(),
    } as unknown as GqlExecutionContext);

    clientProxy = {
      send: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomLogger,
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
    it('should allow public route without token validation', async () => {
      const sendSpy = jest.spyOn(clientProxy, 'send');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const ctx = createExecutionContext({});

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(sendSpy).not.toHaveBeenCalled();
      expect(mockCallMicroservice).not.toHaveBeenCalled();
    });

    it('should validate token from Authorization header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
      mockCallMicroservice.mockResolvedValue(mockedUser);

      const request: TestRequestJWT = { headers: { authorization: 'Bearer abc' } };
      const ctx = createExecutionContext(request);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: 'abc' });
      expect(mockCallMicroservice).toHaveBeenCalledWith(
        expect.anything(),
        AUTH_SERVICE,
        expect.anything(),
        {
          timeoutMs: 3000,
          retries: 2,
        },
      );
      expect(request.user).toEqual(mockedUser);
    });

    it('should validate token from token header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
      mockCallMicroservice.mockResolvedValue(mockedUser);

      const request: TestRequestJWT = { headers: { token: 'xyz' } };
      const ctx = createExecutionContext(request);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: 'xyz' });
      expect(request.user).toEqual(mockedUser);
    });

    it('should validate token from cookie', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
      mockCallMicroservice.mockResolvedValue(mockedUser);

      const request: TestRequestJWT = { cookies: { token: 'cookieToken' }, headers: {} };
      const ctx = createExecutionContext(request);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: 'cookieToken' });
      expect(request.user).toEqual(mockedUser);
    });

    it('should prioritize Authorization header over other sources', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
      mockCallMicroservice.mockResolvedValue(mockedUser);

      const request: TestRequestJWT = {
        headers: { authorization: 'Bearer primary', token: 'secondary' },
        cookies: { token: 'cookie' },
      };
      const ctx = createExecutionContext(request);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: 'primary' });
      expect(request.user).toEqual(mockedUser);
    });

    it('should fallback to token header when Authorization is non-Bearer', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
      mockCallMicroservice.mockResolvedValue(mockedUser);

      const request: TestRequestJWT = {
        headers: { authorization: 'Basic abc', token: 'fallback' },
      };
      const ctx = createExecutionContext(request);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: 'fallback' });
      expect(request.user).toEqual(mockedUser);
    });

    it('should throw when Bearer token is empty', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createExecutionContext({ headers: { authorization: 'Bearer ' } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
    });

    it('should throw if token header is not a string', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createExecutionContext({ headers: { token: 12345 } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
    });

    it('should throw if cookie token is not a string', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createExecutionContext({ cookies: { token: 123 }, headers: {} });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
    });

    it('should throw if token missing', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createExecutionContext({ headers: {} });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
    });

    it('should throw if auth service returns null', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
      mockCallMicroservice.mockResolvedValue(null);

      const ctx = createExecutionContext({ headers: { authorization: 'Bearer invalid' } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.invalid_or_expired_token');
      expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: 'invalid' });
    });

    it('should throw if auth service errors', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
      mockCallMicroservice.mockRejectedValue(new Error('boom'));

      const ctx = createExecutionContext({ headers: { authorization: 'Bearer err' } });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.invalid_or_expired_token');
      expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: 'err' });
    });

    // GraphQL Context Tests
    describe('GraphQL Context', () => {
      it('should handle GraphQL context with valid token', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
        mockCallMicroservice.mockResolvedValue(mockedUser);

        const request: TestRequestJWT = { headers: { authorization: 'Bearer graphql-token' } };
        const ctx = createExecutionContext(request, true);

        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, {
          token: 'graphql-token',
        });
        expect(request.user).toEqual(mockedUser);
        expect(jest.mocked(GqlExecutionContext).create).toHaveBeenCalledWith(ctx);
      });

      it('should handle GraphQL context without request object', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

        // Mock GraphQL context without req
        jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
          getContext: () => ({}),
          getInfo: jest.fn(),
          getArgs: jest.fn(),
          getRoot: jest.fn(),
        } as unknown as GqlExecutionContext);

        const request: TestRequestJWT = { headers: {} };
        const ctx = createExecutionContext(request, true);

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
      });

      it('should fallback to HTTP context when GraphQL context has no req', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
        mockCallMicroservice.mockResolvedValue(mockedUser);

        // Mock GraphQL context with null req
        jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
          getContext: () => ({ req: null }),
          getInfo: jest.fn(),
          getArgs: jest.fn(),
          getRoot: jest.fn(),
        } as unknown as GqlExecutionContext);

        const request: TestRequestJWT = { headers: { authorization: 'Bearer fallback-token' } };
        const ctx = createExecutionContext(request, true);

        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, {
          token: 'fallback-token',
        });
        expect(request.user).toEqual(mockedUser);
      });
    });

    // Edge Cases and Additional Scenarios
    describe('Edge Cases', () => {
      it('should handle Bearer token with extra spaces', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
        mockCallMicroservice.mockRejectedValue(new Error('Invalid token'));

        const ctx = createExecutionContext({ headers: { authorization: 'Bearer   ' } });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow(
          'common.guard.invalid_or_expired_token',
        );
        expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: '  ' });
      });

      it('should handle malformed Authorization header', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const ctx = createExecutionContext({
          headers: { authorization: 'InvalidFormat token123' },
        });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
      });

      it('should handle undefined headers', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const ctx = createExecutionContext({});

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
      });

      it('should handle undefined cookies', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const ctx = createExecutionContext({ headers: {}, cookies: undefined });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
      });

      it('should handle empty string token in cookie', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const ctx = createExecutionContext({ headers: {}, cookies: { token: '' } });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
      });

      it('should handle array token header', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const ctx = createExecutionContext({ headers: { token: ['token1', 'token2'] } });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
      });

      it('should handle null authorization header', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const ctx = createExecutionContext({ headers: { authorization: null } });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('common.guard.token_missing');
      });

      it('should handle microservice timeout', async () => {
        jest.clearAllMocks();
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
        mockCallMicroservice.mockRejectedValue(new Error('Timeout'));

        const ctx = createExecutionContext({ headers: { authorization: 'Bearer timeout-token' } });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow(
          'common.guard.invalid_or_expired_token',
        );
        expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, {
          token: 'timeout-token',
        });
      });

      it('should handle undefined user from microservice', async () => {
        jest.clearAllMocks();
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
        mockCallMicroservice.mockResolvedValue(undefined);

        const ctx = createExecutionContext({ headers: { authorization: 'Bearer undefined-user' } });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow(
          'common.guard.invalid_or_expired_token',
        );
        expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, {
          token: 'undefined-user',
        });
      });

      it('should handle false user from microservice', async () => {
        jest.clearAllMocks();
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
        mockCallMicroservice.mockResolvedValue(false);

        const ctx = createExecutionContext({ headers: { authorization: 'Bearer false-user' } });

        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow(
          'common.guard.invalid_or_expired_token',
        );
        expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, { token: 'false-user' });
      });
    });

    // Method Verification Tests
    describe('Method Verification', () => {
      it('should verify getRequest method returns correct type', async () => {
        jest.clearAllMocks();
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
        mockCallMicroservice.mockResolvedValue(mockedUser);

        const request: TestRequestJWT = { headers: { authorization: 'Bearer verify-token' } };
        const ctx = createExecutionContext(request);

        await guard.canActivate(ctx);

        expect(typeof request.user).toBe('object');
        expect(request.user).toHaveProperty('id');
        expect(request.user).toHaveProperty('email');
        expect(request.user).toHaveProperty('role');
      });

      it('should verify checkTokenFromHeader method priority', async () => {
        jest.clearAllMocks();
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const sendSpy = jest.spyOn(clientProxy, 'send').mockReturnValue(of({}));
        mockCallMicroservice.mockResolvedValue(mockedUser);

        // Test priority: Bearer > token header > cookie
        const request: TestRequestJWT = {
          headers: { authorization: 'Bearer priority-test', token: 'should-not-use' },
          cookies: { token: 'should-not-use-either' },
        };
        const ctx = createExecutionContext(request);

        await guard.canActivate(ctx);

        expect(sendSpy).toHaveBeenCalledWith(AuthMsgPattern.VALIDATE_USER, {
          token: 'priority-test',
        });
      });

      it('should verify reflector metadata check', async () => {
        const reflectorSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
        const ctx = createExecutionContext({});

        await guard.canActivate(ctx);

        expect(reflectorSpy).toHaveBeenCalledWith('isPublic', [ctx.getHandler(), ctx.getClass()]);
      });
    });
  });
});
