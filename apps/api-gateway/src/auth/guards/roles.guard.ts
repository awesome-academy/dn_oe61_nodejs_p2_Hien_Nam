import { ROLE_KEY } from '@app/common/decorators/metadata.decorator';
import { Role } from '@app/common/enums/roles/users.enum';
import { TRequestWithUser } from '@app/common/types/request-with-user.type';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18Service: I18nService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const roles: Role[] | boolean | undefined = this.reflector.getAllAndOverride<Role[] | boolean>(
      ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles || (Array.isArray(roles) && roles.length === 0)) {
      return true;
    }

    // Handle public route (when roles is true)
    if (roles === true) {
      return true;
    }

    const request = this.getRequest<TRequestWithUser>(context);

    if (!request || !request.user || !request.user.role) {
      throw new UnauthorizedException(this.i18Service.translate('common.guard.unauthorized'));
    }

    const userRole = request.user.role;

    if (!Array.isArray(roles) || !roles.includes(userRole)) {
      throw new UnauthorizedException(this.i18Service.translate('common.guard.unauthorized'));
    }
    return true;
  }

  private getRequest<T = TRequestWithUser>(context: ExecutionContext): T {
    if (context.getType<string>() === 'graphql') {
      try {
        const gqlCtx = GqlExecutionContext.create(context);
        const ctx = gqlCtx.getContext<unknown>();
        if (ctx && typeof ctx === 'object' && 'req' in ctx) {
          return (ctx as { req: T }).req;
        }
      } catch {
        console.debug('Failed to get GraphQL context, fallback to HTTP request');
      }
    }

    return context.switchToHttp().getRequest<T>();
  }
}
