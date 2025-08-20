import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { map, Observable } from 'rxjs';
import { LoginResponse } from '../dto/auth/responses/login.response';
import { BaseResponse } from '../interfaces/data-type';

@Injectable()
export class SetAccessTokenInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService) {}
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = ctx.switchToHttp().getResponse<Response>();
    const cookieOptions: CookieOptions = {
      httpOnly: this.config.get<boolean>('cookie.httpOnly', true),
      secure: this.config.get<boolean>('cookie.secure', true),
      sameSite: this.config.get<'strict' | 'lax' | 'none'>('cookie.sameSite', 'strict'),
      maxAge: this.config.get<number>('cookie.accessTokenTTL', 3600) * 1000,
    };
    return next.handle().pipe(
      map((payload: BaseResponse<LoginResponse>) => {
        if (payload?.data?.accessToken)
          res.cookie('token', payload?.data?.accessToken, cookieOptions);
        return payload;
      }),
    );
  }
}
