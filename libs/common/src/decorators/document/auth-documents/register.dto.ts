import { RegisterDto } from '@app/common/dto/document/auth-documents/register.dto';
import { CreateUserDto } from '@app/common/dto/user/create-user.dto';
import { ApiCommonErrorResponses } from '@app/common/decorators/document/common-errors.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { ApiPublicEndpoint } from '../auth-decorators.decorator';

export function ApiResponseRegister() {
  return applyDecorators(
    ApiPublicEndpoint('Đăng ký người dùng', 'Cho phép đăng ký người dùng với các thông tin'),

    ApiBody({
      type: CreateUserDto,
      description: 'Thông tin đăng ký người dùng',
      examples: {
        example1: {
          value: {
            name: 'Hoai Admin',
            userName: 'nam123',
            email: 'nam123@gmail.com',
            password: '123456',
          },
        },
      },
    }),

    ApiResponse({
      status: 200,
      description: 'Đăng ký thành công',
      type: RegisterDto,
    }),

    ApiCommonErrorResponses(),
  );
}
