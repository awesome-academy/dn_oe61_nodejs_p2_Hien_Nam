import { UserUpdateRoleRequest } from '@app/common/dto/user/requests/user-update-role.request';
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

export function ApiResponseUpdateRolesV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update User - Required [JWT Token]',
      description: 'Allow users to update a user',
    }),
    ApiBody({
      description: 'User Update Info',
      type: UserUpdateRoleRequest,
    }),
    SwaggerUpdatedArrayResponse(
      UserSummaryResponse,
      'User updated successfully',
      'User updated successfully',
    ),
    SwaggerNoContentResponse('No change'),
    ApiErrorBadRequest('Validaion Erros', 'Role must one of [ADMIN, USER]'),
    ApiErrorConflict('Failed to update role user', 'Failed to update user'),
    ApiErrorInternal(),
  );
}
