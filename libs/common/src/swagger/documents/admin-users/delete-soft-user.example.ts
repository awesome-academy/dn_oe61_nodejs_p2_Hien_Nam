import { SoftDeleteUserResponse } from '@app/common/dto/user/responses/soft-delete-user.response';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorConflict,
  ApiErrorInternal,
  ApiErrorNotFound,
} from '../../decorators/swagger-error.decorator';
import { SwaggerGetResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseDeleteSoftUserV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete user - Required [JWT Token]',
      description: 'Allow Admin to delete a user',
    }),
    SwaggerGetResponse(
      SoftDeleteUserResponse,
      'User deleted successfully',
      'User deleted successfully',
    ),
    ApiErrorNotFound('User not found', 'User not found'),
    ApiErrorConflict('Failed to delete user', 'Failed to delete user'),
    ApiErrorInternal(),
  );
}
