import { USER_SERVICE } from '@app/common/constant/service.constant';
import { LoginRequestDto } from '@app/common/dto/auth/requests/login.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import * as micro from '@app/common/helpers/microservices';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as classValidator from 'class-validator';
import { AuthProvider, Provider } from '../../user-service/generated/prisma';
import { AuthService } from '../src/auth-service.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('fake-jwt-token') },
        },
        {
          provide: USER_SERVICE,
          useValue: { send: jest.fn() },
        },
        {
          provide: CustomLogger,
          useValue: { error: jest.fn(), log: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(3600) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.spyOn(classValidator, 'validateOrReject').mockResolvedValue();
  });
  it('should login successfully with correct credentials', async () => {
    const dto: LoginRequestDto = { email: 'test@example.com', password: '123456' };
    const userByEmail: UserResponse = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: undefined,
      createdAt: new Date(),
      updatedAt: null,
      role: 'USER',
      authProviders: [
        { id: 1, provider: Provider.LOCAL, password: 'hashed-password' } as AuthProvider,
      ],
    };
    jest.spyOn(micro, 'callMicroservice').mockResolvedValue(userByEmail);
    jest.spyOn(service, 'comparePassword').mockResolvedValue(true);
    const result = await service.login(dto);
    expect(result.data?.accessToken).toBe('fake-jwt-token');
    expect(result.data?.user.email).toBe('test@example.com');
  });
  it('should throw unauthorized if user not found', async () => {
    const dto: LoginRequestDto = { email: 'notfound@example.com', password: '123456' };
    jest.spyOn(micro, 'callMicroservice').mockResolvedValue(null);
    await expect(service.login(dto)).rejects.toThrow(
      new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      }),
    );
  });

  it('should throw unauthorized if passwordLocal is missing', async () => {
    const dto: LoginRequestDto = { email: 'nopass@example.com', password: '123456' };
    const user: UserResponse = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: undefined,
      createdAt: new Date(),
      updatedAt: null,
      role: 'USER',
      authProviders: [],
    };
    jest.spyOn(micro, 'callMicroservice').mockResolvedValue(user);
    await expect(service.login(dto)).rejects.toThrow(
      new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      }),
    );
  });
  it('should throw unauthorized if password does not match', async () => {
    const dto: LoginRequestDto = { email: 'wrongpass@example.com', password: 'wrongpass' };
    const user: UserResponse = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: undefined,
      createdAt: new Date(),
      updatedAt: null,
      role: 'USER',
      authProviders: [
        { id: 1, provider: Provider.LOCAL, password: 'hashed-password' } as AuthProvider,
      ],
    };
    jest.spyOn(micro, 'callMicroservice').mockResolvedValue(user);
    jest.spyOn(service, 'comparePassword').mockResolvedValue(false);
    await expect(service.login(dto)).rejects.toThrow(
      new TypedRpcException({
        code: HTTP_ERROR_CODE.UNAUTHORIZED,
        message: 'common.auth.invalidCredentials',
      }),
    );
  });
  it('should throw internal server error if jwt signing fails', async () => {
    const dto: LoginRequestDto = { email: 'test@example.com', password: '123456' };
    const user: UserResponse = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: undefined,
      createdAt: new Date(),
      updatedAt: null,
      role: 'USER',
      authProviders: [
        { id: 1, provider: Provider.LOCAL, password: 'hashed-password' } as AuthProvider,
      ],
    };
    const rpcError = {
      code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
      message: 'common.errors.internalServerError',
    } as const;
    jest.spyOn(micro, 'callMicroservice').mockResolvedValue(user);
    jest.spyOn(service, 'comparePassword').mockResolvedValue(true);
    jest
      .spyOn(service['jwtService'], 'signAsync')
      .mockRejectedValue(new TypedRpcException(rpcError));
    try {
      await service.login(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(TypedRpcException);
      expect((error as TypedRpcException).getError()).toEqual(rpcError);
      expect((error as TypedRpcException).getError().code).toEqual(
        HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
      );
    }
  });

  it('should propagate validation error coming from UserService', async () => {
    const dto: LoginRequestDto = { email: 'invalid-email.com', password: '123' };
    jest.spyOn(classValidator, 'validateOrReject').mockResolvedValue();
    const rpcError = {
      code: HTTP_ERROR_CODE.BAD_REQUEST,
      message: 'common.errors.validationError',
    } as const;
    jest.spyOn(micro, 'callMicroservice').mockRejectedValueOnce(new TypedRpcException(rpcError));
    try {
      await service.login(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(TypedRpcException);
      expect((error as TypedRpcException).getError()).toEqual(rpcError);
      expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.BAD_REQUEST);
    }
  });

  describe('comparePassword', () => {
    it('should return true when bcrypt.compare resolves true', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
      const result = await service.comparePassword('plain', 'hashed');
      expect(result).toBe(true);
    });
    it('should return false when bcrypt.compare resolves false', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
      const result = await service.comparePassword('plain', 'hashed');
      expect(result).toBe(false);
    });
  });
});
