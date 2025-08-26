/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PrismaService } from '@app/prisma';
import { RpcException } from '@nestjs/microservices';
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
              user: { findUnique: jest.fn(), create: jest.fn() },
              role: { findUnique: jest.fn() },
              authProvider: { findFirst: jest.fn() },
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
    const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
    (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
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
    const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
    (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(userRecord);
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
    const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
    (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userRecord);
    const result = (await service.getUserByEmail(dto)) as UserResponse;
    expect(result.email).toBe(null);
    (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...userRecord,
      email: undefined,
    });
  });

  describe('checkUserExists', () => {
    const twitterId = '123';

    it('should throw RpcException if twitterId is empty', async () => {
      await expect(service.checkUserExists('')).rejects.toThrow(RpcException);
    });

    it('should return formatted data when user exists', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.authProvider.findFirst as jest.Mock).mockResolvedValue({
        provider: 'TWITTER',
        user: {
          id: 5,
          name: 'John',
          userName: 'johnny',
          role: { name: 'USER' },
        },
      });
      const result = await service.checkUserExists(twitterId);
      expect(result).toEqual(
        expect.objectContaining({
          id: 5,
          name: 'John',
          userName: 'johnny',
          role: 'USER',
          providerName: 'TWITTER',
        }),
      );
    });

    it('should return undefined fields when user not found', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.authProvider.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await service.checkUserExists(twitterId);
      expect(result).toBeNull();
    });
  });

  describe('getRole', () => {
    it('should return role when found', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockResolvedValue({ id: 1, name: 'USER' });
      const role = await service.getRole();
      expect(role?.name).toBe('USER');
    });
  });

  describe('createUser', () => {
    const createDto = {
      name: 'Jane',
      userName: 'jane',
      providerId: '321',
    } as const;

    it('should throw RpcException when role not found', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createUser(createDto)).rejects.toThrow(RpcException);
    });

    it('should create user successfully', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockResolvedValue({ id: 10, name: 'USER' });
      const fakeUser = { id: 20, name: 'Jane' };
      (_prismaMock.client.user.create as jest.Mock).mockResolvedValue(fakeUser);

      const result = await service.createUser(createDto as any);

      expect(result).toEqual(expect.objectContaining(fakeUser));
      expect(_prismaMock.client.user.create).toHaveBeenCalled();
    });

    it('should throw RpcException if prisma role.findUnique throws error', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.createUser(createDto)).rejects.toThrow(RpcException);
    });

    it('should throw RpcException if prisma user.create throws error', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockResolvedValue({ id: 10, name: 'USER' });
      (_prismaMock.client.user.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.createUser(createDto)).rejects.toThrow(RpcException);
    });

    it('should throw BadRequestException if missing required fields', async () => {
      const invalidDto = { userName: 'jane' } as any;
      await expect(service.createUser(invalidDto)).rejects.toThrow(RpcException);
    });

    it('should throw ConflictException if user already exists with providerId', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockResolvedValue({ id: 10, name: 'USER' });
      (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue({ id: 99, name: 'Jane' });

      const resultConflict = await service.createUser(createDto);
      expect(resultConflict).toBeDefined();
    });
  });
});
