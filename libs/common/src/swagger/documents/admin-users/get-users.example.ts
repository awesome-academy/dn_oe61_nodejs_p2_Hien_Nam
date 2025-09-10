import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { SwaggerGetPaginatedResponse } from '../../decorators/swagger-response.decorator';
import { UserSummaryResponse } from '@app/common/dto/user/responses/user-summary.response';
import { ApiErrorConflict, ApiErrorInternal } from '../../decorators/swagger-error.decorator';

export function ApiResponseGetUsersV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get users - Required [JWT Token]',
      description: 'Get users',
    }),
    SwaggerGetPaginatedResponse(
      UserSummaryResponse,
      'Get users successfully',
      'Get users successfully',
    ),
    ApiErrorConflict('Failed to get users', 'Failed to get users'),
    ApiErrorInternal(),
  );
}
