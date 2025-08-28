import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class ParseJsonFieldsInterceptor implements NestInterceptor {
  constructor(private readonly fields: string[]) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as Record<string, unknown>;

    for (const field of this.fields) {
      if (body[field] && typeof body[field] === 'string') {
        body[field] = JSON.parse(body[field]);
      }
    }

    return next.handle();
  }
}
