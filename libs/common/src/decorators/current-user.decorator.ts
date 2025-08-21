import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TRequestWithUser } from '../types/request-with-user.type';
import { TUserPayload } from '../types/user-payload.type';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TUserPayload => {
    const request = ctx.switchToHttp().getRequest<TRequestWithUser>();
    return request.user;
  },
);
