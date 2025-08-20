import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { USER_SERVICE } from '@app/common/constant/service.constant';
import { UserCreationRequest } from '@app/common/dto/user/requests/user-creation.request';
import { UserCreationResponse } from '@app/common/dto/user/responses/user-creation.response';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { validateOrReject } from 'class-validator';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    private readonly loggerService: CustomLogger,
  ) {}
  async create(dto: UserCreationRequest): Promise<BaseResponse<UserCreationResponse>> {
    await validateOrReject(dto);
    return await callMicroservice(
      this.userClient.send<BaseResponse<UserCreationResponse>>(
        UserMsgPattern.ADMIN_CREATE_USER,
        dto,
      ),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }
}
