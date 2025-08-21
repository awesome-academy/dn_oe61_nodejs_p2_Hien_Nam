import { RolesGuard } from '../roles.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@app/common/enums/roles/users.enum';
import { TestRequestRole } from './guard.interface';

function createExecutionContext(request: TestRequestRole): ExecutionContext {
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
  let i18n: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        Reflector,
        {
          provide: I18nService,
          useValue: { translate: jest.fn().mockImplementation((key: string) => key) },
        },
      ],
    }).compile();

    guard = module.get(RolesGuard);
    reflector = module.get(Reflector);
    i18n = module.get(I18nService);
  });

  describe('canActivate', () => {
    it('should allow access when no roles metadata', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = createExecutionContext({});
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should allow access when roles metadata empty array', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const ctx = createExecutionContext({});
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should allow access when user role matches', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const ctx = createExecutionContext({ user: { id: 1, role: Role.ADMIN } });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should forbid when user role does not match', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const ctx = createExecutionContext({ user: { id: 1, role: Role.USER } });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should forbid when user role undefined', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const ctx = createExecutionContext({ user: { id: 1 } });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should allow access when user role matches one of multiple roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.USER]);
      const ctx = createExecutionContext({ user: { id: 2, role: Role.USER } });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should forbid when user role not in multiple roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.USER]);
      const ctx = createExecutionContext({ user: { id: 3, role: 'GUEST' } });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should forbid when request has no user', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
      const ctx = createExecutionContext({});
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });
});
