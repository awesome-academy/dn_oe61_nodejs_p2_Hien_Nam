import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PrismaService } from '@app/prisma';
import { Test, TestingModule } from '@nestjs/testing';
import * as classValidator from 'class-validator';
import { PrismaClient, Provider } from '../generated/prisma';
import { UserService } from '../src/user-service.service';

describe('UserService', () => {
  let service: UserService;
  let moduleRef: TestingModule;
  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              user: {
                findUnique: jest.fn(),
              },
            },
          },
        },
        {
          provide: CustomLogger,
          useValue: { error: jest.fn(), log: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get<UserService>(UserService);
    jest.spyOn(classValidator, 'validateOrReject').mockResolvedValue();
  });

  it('should throw validation error if dto is invalid', async () => {
    const invalidDto: UserByEmailRequest = { email: 'invalid-email' } as UserByEmailRequest;
    const rpcError = {
      code: HTTP_ERROR_CODE.BAD_REQUEST,
      message: 'common.errors.validationError',
    } as const;
    jest
      .spyOn(classValidator, 'validateOrReject')
      .mockRejectedValueOnce(new TypedRpcException(rpcError));
    try {
      await service.getUserByEmail(invalidDto);
    } catch (error) {
      expect(error).toBeInstanceOf(TypedRpcException);
      expect((error as TypedRpcException).getError()).toEqual(rpcError);
    }
  });

  it('should return null if user not found', async () => {
    const dto: UserByEmailRequest = { email: 'notfound@example.com' } as UserByEmailRequest;
    const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
    (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const result = await service.getUserByEmail(dto);
    expect(result).toBeNull();
  });

  it('should return user when found', async () => {
    const dto: UserByEmailRequest = { email: 'test@example.com' } as UserByEmailRequest;
    const userRecord = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: null,
      role: { name: 'USER' },
      authProviders: [{ id: 1, provider: Provider.LOCAL, password: 'hashed-pass' }],
    };
    const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
    (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(userRecord);
    const result = (await service.getUserByEmail(dto)) as UserResponse;
    expect(result.email).toBe('test@example.com');
    expect(result.role).toBe('USER');
  });
  it('should return empty string if email is null', async () => {
    const dto: UserByEmailRequest = { email: 'abc@gmail.com' };
    const userRecord = {
      id: 2,
      name: 'No Email User',
      userName: 'nouser',
      email: null,
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: null,
      role: { name: 'USER' },
      authProviders: [],
    };
    const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
    (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userRecord);
    const result = (await service.getUserByEmail(dto)) as UserResponse;
    expect(result.email).toBe(null);
    (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...userRecord,
      email: undefined,
    });
  });
});
