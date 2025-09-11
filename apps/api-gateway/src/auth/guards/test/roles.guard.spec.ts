import { RolesGuard } from '../roles.guard';
import { Role } from '@app/common/enums/roles/users.enum';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { Test, TestingModule } from '@nestjs/testing';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { TestRequestJWT } from './guard.interface';
import { GqlExecutionContext } from '@nestjs/graphql';

function createExecutionContext(
  request: TestRequestJWT,
  contextType: string = 'http',
): ExecutionContext {
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
    getType: jest.fn().mockReturnValue(contextType),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        CustomLogger,
        Reflector,
        {
          provide: I18nService,
          useValue: { translate: jest.fn().mockImplementation((key: string) => key) },
        },
      ],
    }).compile();

    guard = module.get(RolesGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow when no roles required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = createExecutionContext({
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should allow when user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const ctx = createExecutionContext({
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should throw when user missing or without role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.USER]);
      const ctx = createExecutionContext({});
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should throw when role not authorized', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.USER]);
      const ctx = createExecutionContext({
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should allow public route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const ctx = createExecutionContext({});
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('GraphQL Context Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock GqlExecutionContext.create to return null context by default
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req: null }),
        getInfo: jest.fn(),
        getArgs: jest.fn(),
        getRoot: jest.fn(),
      } as unknown as GqlExecutionContext);
    });

    it('should handle GraphQL context with valid request', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const request: TestRequestJWT = {
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      };

      // Mock GraphQL context with req
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req: request }),
        getInfo: jest.fn(),
        getArgs: jest.fn(),
        getRoot: jest.fn(),
      } as unknown as GqlExecutionContext);

      const ctx = createExecutionContext(request, 'graphql');

      expect(guard.canActivate(ctx)).toBe(true);
      expect(jest.mocked(GqlExecutionContext).create).toHaveBeenCalledWith(ctx);
    });

    it('should handle GraphQL context without request object', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      // Mock GraphQL context without req
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({}),
        getInfo: jest.fn(),
        getArgs: jest.fn(),
        getRoot: jest.fn(),
      } as unknown as GqlExecutionContext);

      const request: TestRequestJWT = {
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      };
      const ctx = createExecutionContext(request, 'graphql');

      expect(guard.canActivate(ctx)).toBe(true);
      expect(jest.mocked(GqlExecutionContext).create).toHaveBeenCalledWith(ctx);
    });

    it('should throw UnauthorizedException when GraphQL context has null req', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      // Mock GraphQL context with null req
      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req: null }),
        getInfo: jest.fn(),
        getArgs: jest.fn(),
        getRoot: jest.fn(),
      } as unknown as GqlExecutionContext);

      const request: TestRequestJWT = {
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      };
      const ctx = createExecutionContext(request, 'graphql');

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
      expect(jest.mocked(GqlExecutionContext).create).toHaveBeenCalledWith(ctx);
    });

    it('should skip GraphQL logic and use HTTP when context type is not graphql', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const request: TestRequestJWT = {
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      };
      const ctx = createExecutionContext(request, 'http');

      expect(guard.canActivate(ctx)).toBe(true);
      // Should not call GqlExecutionContext.create when context type is not 'graphql'
      expect(jest.mocked(GqlExecutionContext).create).not.toHaveBeenCalled();
    });

    it('should handle GraphQL context error and fallback to HTTP', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      // Mock GqlExecutionContext.create to throw error
      jest.spyOn(GqlExecutionContext, 'create').mockImplementation(() => {
        throw new Error('GraphQL error');
      });

      const request: TestRequestJWT = {
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      };
      const ctx = createExecutionContext(request, 'graphql');

      expect(guard.canActivate(ctx)).toBe(true);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Failed to get GraphQL context, fallback to HTTP request',
      );
    });

    it('should reject when GraphQL context error and user lacks permission', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.USER]);

      // Mock GqlExecutionContext.create to throw error
      jest.spyOn(GqlExecutionContext, 'create').mockImplementation(() => {
        throw new Error('GraphQL error');
      });

      const request: TestRequestJWT = {
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      };
      const ctx = createExecutionContext(request, 'graphql');

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Failed to get GraphQL context, fallback to HTTP request',
      );
    });
  });

  describe('Method Verification', () => {
    it('should verify getRequest method returns correct type', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const request: TestRequestJWT = {
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      };
      const ctx = createExecutionContext(request);

      expect(guard.canActivate(ctx)).toBe(true);
      expect(typeof guard.canActivate(ctx)).toBe('boolean');
    });

    it('should verify reflector metadata check', () => {
      const getAllAndOverrideSpy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(undefined);

      const ctx = createExecutionContext({
        user: { id: 1, role: Role.ADMIN, name: 'test', userName: 'test' } as TUserPayload,
      });

      expect(guard.canActivate(ctx)).toBe(true);
      expect(getAllAndOverrideSpy).toHaveBeenCalledWith('roles', [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
    });
  });
});
