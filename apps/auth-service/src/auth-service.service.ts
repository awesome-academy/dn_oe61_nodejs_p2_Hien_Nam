import { USER_SERVICE } from '@app/common/constant/service.constant';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { LoginResponse } from '@app/common/dto/auth/responses/login.response';
import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { callMicroservice } from '@app/common/helpers/microservices';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { AccessTokenPayload } from '@app/common/interfaces/token-payload';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Provider } from 'apps/user-service/generated/prisma';
import * as bcrypt from 'bcrypt';
import { validateOrReject } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { TUserPayload } from '@app/common/types/user-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    private readonly loggerService: CustomLogger,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginRequestDto): Promise<BaseResponse<LoginResponse>> {
    await validateOrReject(dto);
    const getUserByEmailRequestDto: UserByEmailRequest = {
      email: dto.email,
    };
    const userByEmail = await callMicroservice(
      this.userClient.send<UserResponse | null>(
        UserMsgPattern.USER_GET_BY_EMAIL,
        getUserByEmailRequestDto,
      ),
      USER_SERVICE,
      this.loggerService,
      {
        timeoutMs: 3000,
        retries: 2,
      },
    );
    if (!userByEmail)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      });
    const passwordLocal = userByEmail.authProviders.find(
      (p) => p.provider === Provider.LOCAL,
    )?.password;
    if (!passwordLocal)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      });
    const hasMatchPassword = await this.comparePassword(dto.password, passwordLocal);
    if (!hasMatchPassword)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      });
    const accessToken = await this.generateAccessToken(userByEmail);
    const payload: LoginResponse = {
      accessToken,
      user: {
        id: userByEmail.id,
        email: userByEmail.email ?? '',
        name: userByEmail.name,
        role: userByEmail.role,
      },
    };
    return buildBaseResponse(StatusKey.SUCCESS, payload);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  async generateAccessToken(user: UserResponse): Promise<string> {
    const payload: AccessTokenPayload = {
      id: user.id,
      email: user?.email ?? '',
      role: user.role,
    };
    try {
      return await this.jwtService.signAsync(payload);
    } catch (error) {
      this.loggerService.error(
        '[SIGN ACCESS-TOKEN ERROR]',
        `details error:: ${(error as Error).stack}`,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async validateToken(token: string): Promise<TUserPayload> {
    try {
      return await this.jwtService.verifyAsync<TUserPayload>(token, {
        secret: this.configService.get<string>('jwt.secretKey'),
      });
    } catch (error) {
      if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
        throw new RpcException('common.guard.invalid_or_expired_token');
      }
      throw error;
    }
  }
}
