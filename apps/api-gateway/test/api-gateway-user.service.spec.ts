import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../src/user/user.service';
import { ClientProxy } from '@nestjs/microservices';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { callMicroservice as callMicroserviceHelper } from '@app/common/helpers/microservices';
import { UserCreationRequest } from '@app/common/dto/user/requests/user-creation.request';
import { RoleEnum } from '@app/common/enums/role.enum';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { UserCreationResponse } from '@app/common/dto/user/responses/user-creation.response';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { validateOrReject } from 'class-validator';
import { Observable } from 'rxjs';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';

jest.mock('@app/common/helpers/microservices');
jest.mock('class-validator', () => ({
  validateOrReject: jest.fn().mockResolvedValue(undefined),
}));
function createMockClientProxy(): jest.Mocked<ClientProxy> {
  return {
    send: jest.fn(),
  } as unknown as jest.Mocked<ClientProxy>;
}

function createMockLogger(): jest.Mocked<CustomLogger> {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as unknown as jest.Mocked<CustomLogger>;
}

describe('UserService', () => {
  let service: UserService;
  let clientProxy: jest.Mocked<ClientProxy>;
  let logger: jest.Mocked<CustomLogger>;

  beforeEach(async () => {
    clientProxy = createMockClientProxy();
    logger = createMockLogger();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: 'user-service', useValue: clientProxy },
        { provide: CustomLogger, useValue: logger },
      ],
    }).compile();
    service = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should validate dto, send message and return response', async () => {
    const dto: UserCreationRequest = {
      name: 'John',
      email: 'john@mail.com',
      password: 'password123',
      role: RoleEnum.USER,
    } as UserCreationRequest;

    const microserviceResponse: BaseResponse<UserCreationResponse> = {
      statusKey: StatusKey.SUCCESS,
      data: {
        id: 1,
        name: 'John',
        userName: 'john123',
        email: 'john@mail.com',
        imageUrl: null,
        phone: null,
        address: null,
        dateOfBirth: null,
        role: 'USER',
        createdAt: new Date(),
      },
    } as BaseResponse<UserCreationResponse>;
    (callMicroserviceHelper as jest.Mock).mockResolvedValue(microserviceResponse);
    const clientProxySpy = clientProxy.send.mockReturnValue(
      {} as unknown as Observable<BaseResponse<UserCreationResponse>>,
    );
    const result = await service.create(dto);
    expect(validateOrReject).toHaveBeenCalled();
    expect(clientProxySpy).toHaveBeenCalled();
    expect(callMicroserviceHelper).toHaveBeenCalled();
    expect(result).toEqual(microserviceResponse);
  });
  it('should propagate phoneNumberExist error from microservice', async () => {
    const dto: UserCreationRequest = {
      name: 'John',
      email: 'john@mail.com',
      password: 'password123',
      role: RoleEnum.USER,
      phone: '0938123123',
    } as UserCreationRequest;
    const rpcError = {
      code: HTTP_ERROR_CODE.CONFLICT,
      message: 'common.user.phoneNumberExist',
    };
    (callMicroserviceHelper as jest.Mock).mockRejectedValue(new TypedRpcException(rpcError));
    try {
      await service.create(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(TypedRpcException);
      expect((error as TypedRpcException).getError()).toEqual(rpcError);
      expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.CONFLICT);
    }
  });
  it('should propagate emailExist error from microservice', async () => {
    const dto: UserCreationRequest = {
      name: 'John',
      email: 'john@mail.com',
      password: 'password123',
      role: RoleEnum.USER,
    } as UserCreationRequest;
    const rpcError = {
      code: HTTP_ERROR_CODE.CONFLICT,
      message: 'common.user.emailExist',
    };
    (callMicroserviceHelper as jest.Mock).mockRejectedValue(new TypedRpcException(rpcError));
    try {
      await service.create(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(TypedRpcException);
      expect((error as TypedRpcException).getError()).toEqual(rpcError);
      expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.CONFLICT);
    }
  });
  it('should propagate ConflictError (PrismaClient error) from microservice', async () => {
    const dto: UserCreationRequest = {
      name: 'John',
      email: 'john@mail.com',
      password: 'password123',
      role: RoleEnum.USER,
    } as UserCreationRequest;
    const rpcError = {
      code: HTTP_ERROR_CODE.CONFLICT,
      message: 'common.user.emailExistcommon.errors.uniqueConstraint',
    };
    (callMicroserviceHelper as jest.Mock).mockResolvedValue(new TypedRpcException(rpcError));
    try {
      await service.create(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(TypedRpcException);
      expect((error as TypedRpcException).getError()).toEqual(rpcError);
      expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.CONFLICT);
    }
  });
});
