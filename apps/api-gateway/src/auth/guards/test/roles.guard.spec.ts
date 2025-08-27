import { RolesGuard } from '../roles.guard';
import { Role } from '@app/common/enums/roles/users.enum';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { Test, TestingModule } from '@nestjs/testing';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { TestRequestJWT } from './guard.interface';

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

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
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
});
