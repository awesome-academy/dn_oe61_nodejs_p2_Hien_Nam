import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from './common-errors.decorator';

export function ApiAdminOperation(summary: string, description?: string) {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: `[ADMIN] ${summary} (Created by Nam)`,
      description: description,
    }),
  );
}

export function ApiUserOperation(summary: string, description?: string) {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: `[USER] ${summary} (Created by Nam)`,
      description: description,
    }),
  );
}

export function ApiPublicOperation(summary: string, description?: string) {
  return applyDecorators(
    ApiOperation({
      summary: `[PUBLIC] ${summary} (Created by Nam)`,
      description: description,
    }),
  );
}

export function ApiAdminEndpoint(summary: string, description?: string) {
  return applyDecorators(ApiAdminOperation(summary, description), ApiCommonErrorResponses());
}
export function ApiUserEndpoint(summary: string, description?: string) {
  return applyDecorators(ApiUserOperation(summary, description), ApiCommonErrorResponses());
}
export function ApiPublicEndpoint(summary: string, description?: string) {
  return applyDecorators(ApiPublicOperation(summary, description), ApiCommonErrorResponses());
}
