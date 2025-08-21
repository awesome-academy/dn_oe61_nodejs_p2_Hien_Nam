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
import { GoogleProfileDto } from '@app/common/dto/google-profile.dro';
import { ProviderName } from '@app/common/enums/provider.enum';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { StatusKey } from '@app/common/enums/status-key.enum';

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

  async twitterCallback(user: TwitterProfileDto): Promise<BaseResponse<LoginResponse>> {
    if (!user) {
      throw new BadRequestException(this.i18Service.translate('common.auth.action.twitter.error'));
    }

    let userExists: UserResponse | null = await this.checkUserExists(user.twitterId);

    if (!userExists || Object.keys(userExists).length === 0) {
      const payLoad = {
        userName: user.userName,
        name: user.name,
        providerId: user.twitterId,
        provider: ProviderName.TWITTER,
      };
      userExists = await firstValueFrom<UserResponse>(
        this.userClient.send({ cmd: UserMsgPattern.CREATE_USER }, payLoad),
      );
    }

    const payLoad = {
      id: userExists?.id,
      name: userExists?.name,
      role: userExists?.role,
      email: userExists?.email ?? undefined,
    };

    const result: LoginResponse = await firstValueFrom(
      this.authClient.send<LoginResponse>({ cmd: AuthMsgPattern.SIGN_JWT_TOKEN }, payLoad),
    );

    if (!result) {
      throw new BadRequestException(
        this.i18Service.translate('common.auth.action.signToken.error'),
      );
    }

    return buildBaseResponse(StatusKey.SUCCESS, result);
  }

  private async checkUserExists(providerId: string): Promise<UserResponse | null> {
    return await firstValueFrom(
      this.userClient.send<UserResponse>({ cmd: UserMsgPattern.CHECK_USERE_EXISTS }, providerId),
    );
  }

  async googleCallback(user: GoogleProfileDto): Promise<BaseResponse<LoginResponse>> {
    if (!user) {
      throw new BadRequestException(this.i18Service.translate('common.auth.action.twitter.error'));
    }

    let userExists = await this.checkUserExists(user.googleId);

    if (!userExists || Object.keys(userExists).length === 0) {
      const payLoad = {
        name: user.name,
        userName: user.userName,
        email: user.email,
        providerId: user.googleId,
        provider: ProviderName.GOOGLE,
      };
      userExists = await firstValueFrom<UserResponse>(
        this.userClient.send({ cmd: UserMsgPattern.CREATE_USER }, payLoad),
      );
    }

    const payLoad = {
      id: userExists?.id,
      name: userExists?.name,
      role: userExists?.role,
      email: userExists?.email ?? undefined,
    };

    const result: LoginResponse = await firstValueFrom(
      this.authClient.send({ cmd: AuthMsgPattern.SIGN_JWT_TOKEN }, payLoad),
    );

    if (!result) {
      throw new BadRequestException(
        this.i18Service.translate('common.auth.action.signToken.error'),
      );
    }

    return buildBaseResponse(StatusKey.SUCCESS, result);
  }
}
