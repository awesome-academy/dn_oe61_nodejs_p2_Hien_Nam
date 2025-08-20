import { AuthMsgPattern } from '@app/common';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth-service.service';

@Controller()
export class AuthServiceController {
  constructor(private readonly authService: AuthService) {}
  @MessagePattern(AuthMsgPattern.AUTH_LOGIN)
  async login(data: LoginRequestDto) {
    return this.authService.login(data);
  }
}
