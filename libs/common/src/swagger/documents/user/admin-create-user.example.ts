import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import {
  ApiErrorBadRequestValidation,
  ApiErrorInternal,
  ApiErrorUnauthorized,
} from '../../decorators/swagger-error.decorator';
import { SwaggerCreatedResponse } from '../../decorators/swagger-response.decorator';

export function ApiResponseUserLogin() {
  return applyDecorators(
    ApiOperation({
      summary: 'UserLogin',
      description: 'Allow user login',
    }),
    ApiBody({
      description: 'User info',
      type: LoginRequestDto,
    }),
    SwaggerCreatedResponse(LoginResponse, 'Login successfully', 'Login successfully'),
    ApiErrorBadRequestValidation('Invalid input create user', [
      { email: 'email must be not empty' },
      { password: 'Password must be at least 6' },
    ]),
    ApiErrorUnauthorized('Unauthorized', 'Invalid credentials'),
    ApiErrorInternal(),
  );
}
