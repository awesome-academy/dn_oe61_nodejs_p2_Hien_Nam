import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { I18nService } from 'nestjs-i18n';
import { map, Observable } from 'rxjs';
import { CustomLogger } from '../logger/custom-logger.service';
import { Reflector } from '@nestjs/core';
import { MESSAGE_RESOURCE_ACTION, MESSAGE_RESOURCE_KEY } from '../decorators/resource.decorator';
import { getResourceName } from '../helpers/resource-name.helper';
import { RESOURCE_ACTION_FALLBACK, RESOURCE_NAME_FALLBACK } from '../constant/reflector.constant';
import { getTranslatedMessage } from '../helpers/response.helper';

interface GraphQLResponse {
  success: boolean;
  message: string;
  data?: unknown;
  items?: unknown;
  pagination?: unknown;
}

interface PaginatedData {
  items?: unknown[];
  data?: unknown[];
  paginations?: unknown;
  pagination?: unknown;
}

@Injectable()
export class GraphQLTransformInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18nService: I18nService,
    private readonly loggerService: CustomLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<GraphQLResponse> {
    const gqlContext = GqlExecutionContext.create(context);
    if (gqlContext.getType() !== 'graphql') {
      return next.handle() as Observable<GraphQLResponse>;
    }

    let resourceName = RESOURCE_NAME_FALLBACK;
    let resourceAction = RESOURCE_ACTION_FALLBACK;

    try {
      resourceName =
        this.reflector.getAllAndOverride<string>(MESSAGE_RESOURCE_KEY, [context.getHandler()]) ||
        getResourceName(context).toLowerCase();
    } catch (err) {
      this.loggerService.error(
        `[GraphQL Get Resource Name Error]:: ${(err as Error).stack}`,
        `Fallback to ${RESOURCE_NAME_FALLBACK}`,
      );
    }

    try {
      resourceAction =
        this.reflector.getAllAndOverride<string>(MESSAGE_RESOURCE_ACTION, [context.getHandler()]) ||
        context.getHandler().name;
    } catch (err) {
      this.loggerService.error(
        `[GraphQL Get Resource Action Error]:: ${(err as Error).stack}`,
        `Fallback to ${RESOURCE_ACTION_FALLBACK}`,
      );
    }

    return next.handle().pipe(
      map((data: unknown): GraphQLResponse => {
        // Debug log
        this.loggerService.debug(
          'GraphQL Interceptor received data:',
          JSON.stringify(data, null, 2),
        );

        // If data is already structured (has success field), return as is
        if (this.isStructuredResponse(data)) {
          return data;
        }

        // Auto-wrap raw data with success/message structure
        const messageKey = `common.${resourceName}.action.${resourceAction}.success`;
        const message = getTranslatedMessage(
          this.i18nService,
          messageKey,
          'Operation completed successfully',
          this.loggerService,
        );

        // Handle different data types
        if (this.isPaginatedData(data)) {
          this.loggerService.debug('Data is paginated, mapping items and pagination');
          return {
            success: true,
            message,
            items: data.items || data.data || [],
            pagination: data.paginations || data.pagination,
          };
        }

        // Handle regular data
        this.loggerService.debug('Data is not paginated, returning as data field');
        return {
          success: true,
          message,
          data: data,
        };
      }),
    );
  }

  private isStructuredResponse(data: unknown): data is GraphQLResponse {
    return typeof data === 'object' && data !== null && 'success' in data && 'message' in data;
  }

  private isPaginatedData(data: unknown): data is PaginatedData {
    return (
      typeof data === 'object' &&
      data !== null &&
      (('items' in data && ('paginations' in data || 'pagination' in data)) ||
        ('data' in data && 'pagination' in data))
    );
  }
}
