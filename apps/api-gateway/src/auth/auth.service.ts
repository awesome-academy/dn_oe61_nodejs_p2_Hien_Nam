import { RETRIES_DEFAULT, TIMEOUT_MS_DEFAULT } from '@app/common/constant/rpc.constants';
import { AUTH_SERVICE, NOTIFICATION_SERVICE } from '@app/common/constant/service.constant';
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
import { CreateUserDto } from '@app/common/dto/user/create-user.dto';
import { CookieResponse } from '@app/common/interfaces/request-cookie.interface';
import { ConfigService } from '@nestjs/config';
import { Notifications } from '@app/common/enums/message-patterns/notification.pattern';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationClient: ClientProxy,
    private readonly i18Service: I18nService,
    private readonly configService: ConfigService,
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
        isActive: true,
        provider: ProviderName.TWITTER,
      };
      userExists = await firstValueFrom<UserResponse>(
        this.userClient.send({ cmd: UserMsgPattern.CREATE_OAUTH_USER }, payLoad),
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
      this.userClient.send<UserResponse>({ cmd: UserMsgPattern.CHECK_USER_EXISTS }, providerId),
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
        isActive: true,
        provider: ProviderName.GOOGLE,
      };

      userExists = await firstValueFrom<UserResponse>(
        this.userClient.send({ cmd: UserMsgPattern.CREATE_OAUTH_USER }, payLoad),
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
        this.i18Service.translate('common.errors.unauthorized.signToken.error'),
      );
    }

    return buildBaseResponse(StatusKey.SUCCESS, result);
  }

  async register(userInput: CreateUserDto): Promise<BaseResponse<UserResponse>> {
    if (!userInput || Object.values(userInput).length === 0) {
      throw new BadRequestException(
        this.i18Service.translate('common.error.registerUser.userNotFound'),
      );
    }

    const userResponse = await callMicroservice<BaseResponse<UserResponse>>(
      this.userClient.send(UserMsgPattern.USER_GET_BY_EMAIL, userInput),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (userResponse) {
      throw new BadRequestException(
        this.i18Service.translate('common.errors.registerUser.userExists'),
      );
    }

    const result = await callMicroservice<UserResponse>(
      this.userClient.send(UserMsgPattern.REGISTER_USER, userInput),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(this.i18Service.translate('common.errors.registerUser.error'));
    }

    const token = await this.generateActivationToken(result);
    await this.sendActivationEmail(result, token);

    return buildBaseResponse(StatusKey.SUCCESS, result);
  }

  private async generateActivationToken(user: UserResponse): Promise<string> {
    const token = await callMicroservice<string>(
      this.authClient.send(AuthMsgPattern.SIGN_JWT_TOKEN_USER_CREATE, user),
      AUTH_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!token) {
      throw new BadRequestException(
        this.i18Service.translate('common.errors.registerUser.notToken'),
      );
    }
    return token;
  }

  private async sendActivationEmail(user: UserResponse, token: string): Promise<void> {
    await callMicroservice<void>(
      this.notificationClient.send(Notifications.SEND_EMAIL_COMPLETE, { user, token }),
      NOTIFICATION_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );
  }

  async completeRegister(token: string): Promise<BaseResponse<UserResponse>> {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException(
        this.i18Service.translate('common.errors.registerUser.notToken'),
      );
    }

    const result = await callMicroservice<UserResponse>(
      this.authClient.send(AuthMsgPattern.VALIDATE_USER, { token: token }),
      AUTH_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    if (!result) {
      throw new BadRequestException(this.i18Service.translate('common.errors.signToken'));
    }

    const user = await callMicroservice<UserResponse>(
      this.userClient.send(UserMsgPattern.CHANGE_IS_ACTIVE, result),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: TIMEOUT_MS_DEFAULT,
        retries: RETRIES_DEFAULT,
      },
    );

    return buildBaseResponse(StatusKey.SUCCESS, user);
  }

  logout(res: CookieResponse) {
    res.clearCookie('token');
    return buildBaseResponse(StatusKey.SUCCESS, '');
  }
}
