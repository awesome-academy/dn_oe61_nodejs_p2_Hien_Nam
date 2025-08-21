import { ROLE_KEY } from '@app/common/decorators/metadata.decorator';
import { Role } from '@app/common/enums/roles/users.enum';
import { TRequestWithUser } from '@app/common/types/request-with-user.type';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18Service: I18nService,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    const roles: Role[] | undefined = this.reflector.getAllAndOverride<Role[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TRequestWithUser>();

    if (!request.user || !request.user.role) {
      throw new UnauthorizedException(this.i18Service.translate('common.guard.unauthorized'));
    }

    const role = request.user.role;

    if (!role || !Array.isArray(roles) || !roles.includes(role)) {
      throw new UnauthorizedException(this.i18Service.translate('common.guard.unauthorized'));
    }

    return true;
  }
}
