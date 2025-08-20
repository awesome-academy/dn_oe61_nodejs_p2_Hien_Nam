import { UserCreationResponse } from '@app/common/dto/user/responses/user-creation.response';
import { Role } from '@app/common/enums/roles/users.enum';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorBadRequest,
  ApiErrorBadRequestValidation,
  ApiErrorConflict,
  ApiErrorInternal,
} from '../../decorators/swagger-error.decorator';
import { SwaggerCreatedResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseCreateUserV1() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create user - Required [JWT Token]',
      description: 'Allow Admin to create a user',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'User Creation Info with image upload',
      schema: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            description: 'User profile image',
          },
          name: {
            type: 'string',
            description: 'User full name',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'john.doe@example.com',
          },
          phone: {
            type: 'string',
            description: 'User phone number',
            example: '+1234567890',
          },
          password: {
            type: 'string',
            description: 'User password',
            example: 'SecurePassword123',
          },
          role: {
            type: 'string',
            enum: Object.values(Role),
            description: 'User role',
            example: Role.USER,
          },
        },
        required: ['image', 'name', 'email', 'password', 'role'],
      },
    }),
    SwaggerCreatedResponse(
      UserCreationResponse,
      'User Creation Successfully',
      'User Creation Successfully',
    ),
    ApiErrorBadRequestValidation('Invalid input create user', [
      { name: 'Name must be not empty' },
      { prices: 'Prices must be not empty' },
    ]),
    ApiErrorBadRequest('Email is required - Phone number exist', 'Invalid field dto create user'),
    ApiErrorConflict('Failed to create user', 'Failed to create user'),
    ApiErrorInternal(),
  );
}
