import { UserUpdateStatusRequest } from '@app/common/dto/user/requests/user-update-status.request';
import { UserSummaryResponse } from '@app/common/dto/user/responses/user-summary.response';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorBadRequest,
  ApiErrorConflict,
  ApiErrorInternal,
} from '../../decorators/swagger-error.decorator';
import {
  SwaggerNoContentResponse,
  SwaggerUpdatedArrayResponse,
} from '../../decorators/swagger-response.decorator';

export function ApiResponseUpdateStatusV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update Status User - Required [JWT Token]',
      description: 'Allow users to update a user',
    }),
    ApiBody({
      description: 'User Update Info',
      type: UserUpdateStatusRequest,
    }),
    SwaggerUpdatedArrayResponse(
      UserSummaryResponse,
      'User updated successfully',
      'User updated successfully',
    ),
    SwaggerNoContentResponse('No change'),
    ApiErrorBadRequest('Validaion Erros', 'Status must one of [ACTIVE, INACTIVE]'),
    ApiErrorConflict('Failed to update status user', 'Failed to update user'),
    ApiErrorInternal(),
  );
}
