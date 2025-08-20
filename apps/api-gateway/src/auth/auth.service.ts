import { AuthMsgPattern } from '@app/common';
import { AUTH_SERVICE } from '@app/common/constant/service.constant';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly loggerService: CustomLogger,
  ) {}
  async login(dto: LoginRequestDto) {
    return await callMicroservice<BaseResponse<LoginResponse>>(
      this.authClient.send(AuthMsgPattern.AUTH_LOGIN, dto),
      AUTH_SERVICE,
      this.loggerService,
      {
        timeoutMs: 2000,
        retries: 2,
      },
    );
  }
}
