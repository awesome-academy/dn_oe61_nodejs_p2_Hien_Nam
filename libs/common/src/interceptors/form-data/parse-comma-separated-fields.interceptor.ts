import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class ParseCommaSeparatedFieldsInterceptor implements NestInterceptor {
  constructor(private readonly fields: string[]) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as Record<string, unknown>;

    for (const field of this.fields) {
      const value = body[field];

      if (!value) {
        continue;
      }

      if (typeof value === 'string') {
        if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
          try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
              body[field] = parsed
                .map((item) => parseInt(String(item), 10))
                .filter((item) => !isNaN(item));
            } else {
              body[field] = [];
            }
          } catch {
            body[field] = [];
          }
        } else {
          body[field] = value
            .split(',')
            .map((item) => parseInt(item.trim(), 10))
            .filter((item) => !isNaN(item));
        }
      } else if (Array.isArray(value)) {
        body[field] = value
          .map((item) => parseInt(String(item), 10))
          .filter((item) => !isNaN(item));
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        body[field] = [Number(value)];
      }
    }

    return next.handle();
  }
}
