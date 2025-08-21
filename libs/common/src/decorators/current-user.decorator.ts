import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TRequestWithUser } from '../types/request-with-user.type';
import { TUserPayload } from '../types/user-payload.type';
import { NestResponse } from '../interfaces/request-cookie.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TUserPayload => {
    const request = ctx.switchToHttp().getRequest<TRequestWithUser>();
    return request.user;
  },
);

export const UserDecorator = createParamDecorator(
  (data: keyof TUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<TRequestWithUser>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export const ResponseDecorator = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): NestResponse => {
    return ctx.switchToHttp().getResponse();
  },
);
