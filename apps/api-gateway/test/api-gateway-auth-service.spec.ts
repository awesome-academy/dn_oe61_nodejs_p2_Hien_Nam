import { AUTH_SERVICE } from '@app/common/constant/service.constant';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import * as micro from '@app/common/helpers/microservices';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';

afterEach(() => {
  jest.clearAllMocks();
});
describe('ApiGateway AuthService', () => {
  let service: AuthService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AUTH_SERVICE,
          useValue: { send: jest.fn() },
        },
        {
          provide: CustomLogger,
          useValue: { error: jest.fn(), log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should login successfully', async () => {
    const dto: LoginRequestDto = { email: 'test@example.com', password: '123456' };
    const response = {
      status: 200,
      data: {
        accessToken: 'token',
        user: { id: 1, email: 'test@example.com', name: 'Test', role: 'USER' },
      },
    };
    jest.spyOn(micro, 'callMicroservice').mockResolvedValue(response);
    const result = await service.login(dto);
    expect(result).toEqual(response);
    expect(micro.callMicroservice).toHaveBeenCalled();
  });
  it('should propagate error from AuthService microservice', async () => {
    const dto: LoginRequestDto = { email: 'test@example.com', password: '123456' };
    jest.spyOn(micro, 'callMicroservice').mockRejectedValueOnce(
      new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      }),
    );
    await expect(service.login(dto)).rejects.toThrow(TypedRpcException);
  });
  it('should propagate error from AuthService microservice down', async () => {
    const dto: LoginRequestDto = { email: 'test@example.com', password: '123456' };
    const rpcError = {
      code: HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
      message: 'common.errors.unavailableService',
    } as const;
    jest.spyOn(micro, 'callMicroservice').mockRejectedValueOnce(new TypedRpcException(rpcError));
    try {
      await service.login(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(TypedRpcException);
      expect((error as TypedRpcException).getError()).toEqual(rpcError);
      expect((error as TypedRpcException).getError().code).toEqual(
        HTTP_ERROR_CODE.SERVICE_UNAVAILABLE,
      );
    }
  });
});
