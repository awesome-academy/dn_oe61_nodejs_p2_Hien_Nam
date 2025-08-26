import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { AUTH_SERVICE } from '@app/common/constant/service.constant';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/common/constant/service.constant';
import { TwitterProfileDto } from '@app/common/dto/twitter-profile.dto';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { firstValueFrom } from 'rxjs';
import { AuthMsgPattern } from '@app/common/enums/message-patterns/auth.pattern';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    private readonly i18Service: I18nService,
  ) {}
  async login(dto: LoginRequestDto) {
    return await callMicroservice<BaseResponse<LoginResponse>>(
      this.authClient.send(AuthMsgPattern.AUTH_LOGIN, dto),
      AUTH_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }

  async twitterCallback(user: TwitterProfileDto): Promise<LoginResponse> {
    if (!user) {
      throw new BadRequestException(this.i18Service.translate('common.auth.action.twitter.error'));
    }

    let userExists: UserResponse | null = await this.checkUserExists(user);

    if (!userExists || Object.keys(userExists).length === 0) {
      const payLoad = {
        userName: user.userName,
        name: user.name,
        providerId: user.twitterId,
      };
      userExists = await firstValueFrom<UserResponse>(
        this.userClient.send({ cmd: UserMsgPattern.CREATE_USER_TWITTER }, payLoad),
      );
    }

    const payLoad = {
      id: userExists?.id,
      name: userExists?.name,
      userName: userExists?.userName,
      role: userExists?.role,
      email: userExists?.email ?? undefined,
    };

    const accessToken: string = await firstValueFrom(
      this.userClient.send<string>({ cmd: AuthMsgPattern.SIGN_JWT_TOKEN }, payLoad),
    );

    if (!accessToken) {
      throw new BadRequestException(
        this.i18Service.translate('common.auth.action.signToken.error'),
      );
    }

    return {
      accessToken,
      user: {
        id: userExists.id,
        email: userExists.email ?? undefined,
        name: userExists.name,
        role: userExists.role,
      },
    };
  }

  private async checkUserExists(user: TwitterProfileDto): Promise<UserResponse | null> {
    return await firstValueFrom(
      this.userClient.send<UserResponse>(
        { cmd: UserMsgPattern.CHECK_USERE_EXISTS },
        user.twitterId,
      ),
    );
  }
}
