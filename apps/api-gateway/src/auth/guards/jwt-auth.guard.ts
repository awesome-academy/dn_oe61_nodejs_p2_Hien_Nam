import { AUTH_SERVICE } from '@app/common/constant/service.constant';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { IS_PUBLIC_KEY } from '@app/common/decorators/metadata.decorator';
import { AuthMsgPattern } from '@app/common';
import { TRequestWithUser } from '@app/common/types/request-with-user.type';
import { TUserPayload } from '@app/common/types/user-payload.type';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_SERVICE) private authService: ClientProxy,
    private readonly i18nService: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<TRequestWithUser>();
    const token = this.checkTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(this.i18nService.translate('common.guard.token_missing'));
    }

    try {
      const user = await firstValueFrom(
        this.authService.send<TUserPayload>(
          { cmd: AuthMsgPattern.VALIDATE_USER },
          { token: token },
        ),
      );

      if (!user) {
        throw new UnauthorizedException(
          this.i18nService.translate('common.guard.invalid_or_expired_token'),
        );
      }

      request.user = user;
    } catch {
      throw new UnauthorizedException(
        this.i18nService.translate('common.guard.invalid_or_expired_token'),
      );
    }

    return true;
  }

  private checkTokenFromHeader(request: TRequestWithUser): string | undefined {
    const headerToken = request.headers?.['authorization'];
    if (headerToken?.startsWith('Bearer ')) {
      return headerToken.substring(7);
    }

    if (typeof request.headers?.['token'] === 'string') {
      return request.headers['token'];
    }

    const cookieToken = request?.cookies?.['token'] as string;
    return typeof cookieToken === 'string' ? cookieToken : undefined;
  }
}
