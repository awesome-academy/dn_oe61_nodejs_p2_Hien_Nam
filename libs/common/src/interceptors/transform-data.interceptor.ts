import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { I18nService } from 'nestjs-i18n';
import { map, Observable } from 'rxjs';
import { MESSAGE_RESOURCE_ACTION, MESSAGE_RESOURCE_KEY } from '../decorators/resource.decorator';
import { getResourceName } from '../helpers/resource-name.helper';
import { isBaseResponse, normalizePayload, parseStatusKey } from '../utils/data.util';
import { StatusKey } from '../enums/status-key.enum';
import { getTranslatedMessage, resolveSuccess } from '../helpers/response.helper';
import { MESSAGE_ACTION_PREFIX } from '../constant/transform-data.constant';
import { CustomLogger } from '../logger/custom-logger.service';
import { Response } from 'express';
import { RESOURCE_ACTION_FALLBACK, RESOURCE_NAME_FALLBACK } from '../constant/reflector.constant';

@Injectable()
export class TransformDataInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18nService: I18nService,
    private readonly loggerService: CustomLogger,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (GqlExecutionContext.create(context).getType() === 'graphql') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    let resourceName = RESOURCE_NAME_FALLBACK;
    let resourceAction = RESOURCE_ACTION_FALLBACK;
    try {
      resourceName =
        this.reflector.getAllAndOverride<string>(MESSAGE_RESOURCE_KEY, [context.getHandler()]) ||
        getResourceName(context).toLowerCase();
    } catch (err) {
      this.loggerService.error(
        `[Get Resource Name Error]:: ${(err as Error).stack}`,
        `Fallback to ${RESOURCE_NAME_FALLBACK}`,
      );
    }
    try {
      resourceAction =
        this.reflector.getAllAndOverride<string>(MESSAGE_RESOURCE_ACTION, [context.getHandler()]) ||
        context.getHandler().name;
    } catch (err) {
      this.loggerService.error(
        `[Get Resource Action Error]:: ${(err as Error).stack}`,
        `Fallback to ${RESOURCE_ACTION_FALLBACK}`,
      );
    }
    return next.handle().pipe(
      map((data) => {
        let statusCode = response.statusCode;
        const isResponse = isBaseResponse(data);
        const statusKey = parseStatusKey(isResponse ? data.statusKey : undefined, statusCode);
        if (statusKey == StatusKey.UNCHANGED) {
          statusCode = HttpStatus.NO_CONTENT;
        }
        let messageActionPrefix = MESSAGE_ACTION_PREFIX;
        if (!messageActionPrefix) {
          messageActionPrefix = 'action';
          this.loggerService.warn("MESSAGE_ACTION_PREFIX is undefined - fallback to 'action'");
        }
        const messageKey = `common.${resourceName}.${messageActionPrefix}.${resourceAction}.${statusKey}`;
        this.loggerService.debug(
          this.i18nService.translate(messageKey) instanceof Promise ? 'Promise' : 'Non-Promise',
        );
        const message = getTranslatedMessage(
          this.i18nService,
          messageKey,
          'Operation completed',
          this.loggerService,
        );
        let payload = isResponse ? normalizePayload(data.data) : normalizePayload(data);
        if (
          payload == null ||
          (!Array.isArray(payload) &&
            typeof payload === 'object' &&
            Object.keys(payload).length === 0)
        ) {
          this.loggerService.debug(
            `[TransformDataInterceptor] Empty payload (${typeof payload}) for ${resourceName}.${resourceAction}`,
          );
          payload = {};
        }
        return {
          success: resolveSuccess(statusCode, statusKey),
          statusCode: statusCode,
          message,
          payload,
        };
      }),
    );
  }
}
