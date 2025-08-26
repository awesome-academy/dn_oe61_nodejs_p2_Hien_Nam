/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PrismaService } from '@app/prisma';
import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import * as classValidator from 'class-validator';
import * as bcrypt from 'bcrypt';
import { PrismaClient, Provider, Role } from '../generated/prisma';
import { UserService } from '../src/user-service.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-password') }));

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
                create: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
              },
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
    const providerId = '123';

    it('should throw RpcException if providerId is empty', async () => {
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
      const result = await service.checkUserExists(providerId);
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

    it('should handle user with no role gracefully', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.authProvider.findFirst as jest.Mock).mockResolvedValue({
        provider: 'GOOGLE',
        user: {
          id: 10,
          name: 'Alice',
          userName: 'alice01',
          role: null,
          authProviders: [],
        },
      });

      const result = await service.checkUserExists(providerId);
      expect(result).toEqual(
        expect.objectContaining({
          id: 10,
          role: undefined,
          providerName: 'GOOGLE',
        }),
      );
    });

    it('should return undefined fields when user not found', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.authProvider.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await service.checkUserExists(providerId);
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

  describe('validateOAuthUserCreation', () => {
    const createDto = {
      name: 'Jane',
      userName: 'jane',
      providerId: '321',
      provider: Provider.GOOGLE,
    } as const;

    beforeEach(() => {
      jest.spyOn(service, 'checkUserExists').mockResolvedValue(null);
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = { id: 1, email: 'test@example.com' } as UserResponse;
      jest.spyOn(service, 'checkUserExists').mockResolvedValue(existingUser);

      await expect(service.validateOAuthUserCreation(createDto)).rejects.toThrow(
        'common.errors.createUser.exists',
      );
    });

    it('should throw RpcException when role not found', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.validateOAuthUserCreation(createDto)).rejects.toThrow(
        new RpcException('common.errors.createUser.roleNotFound'),
      );
    });

    it('should call createUser and return its result on successful validation', async () => {
      const role: Role = { id: 1, name: 'USER', createdAt: new Date(), updatedAt: null };
      const createdUser: UserResponse = {
        id: 1,
        name: 'Jane',
        userName: 'jane',
        role: 'USER',
        email: undefined,
      };
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockResolvedValue(role);

      const createUserSpy = jest.spyOn(service, 'createUser').mockResolvedValue(createdUser);

      const result = await service.validateOAuthUserCreation(
        createDto as unknown as Parameters<UserService['validateOAuthUserCreation']>[0],
      );

      expect(createUserSpy).toHaveBeenCalledWith(createDto, role.id);
      expect(result).toEqual(createdUser);
    });
  });

  describe('createUserWithPassword', () => {
    const dto = {
      name: 'John',
      userName: 'johnny',
      email: 'john@mail.com',
      password: 'plain-pass',
      provider: Provider.LOCAL,
      providerId: 'local-id',
    } as const;

    it('should throw validation error', async () => {
      jest.spyOn(classValidator, 'validateOrReject').mockRejectedValueOnce(new Error('validation'));
      await expect(
        service.createUserWithPassword(
          dto as unknown as Parameters<UserService['createUserWithPassword']>[0],
        ),
      ).rejects.toThrow('validation');
    });

    it('should throw RpcException when role not found', async () => {
      jest.spyOn(classValidator, 'validateOrReject').mockResolvedValue();
      jest.spyOn(service, 'getRole').mockResolvedValueOnce(null);
      await expect(
        service.createUserWithPassword(
          dto as unknown as Parameters<UserService['createUserWithPassword']>[0],
        ),
      ).rejects.toThrow(new RpcException('common.errors.createUser.roleNotFound'));
    });

    it('should throw RpcException when createUser returns null', async () => {
      jest.spyOn(service, 'getRole').mockResolvedValue({
        id: 1,
        name: 'USER',
        createdAt: new Date(),
        updatedAt: null,
      } as unknown as Role);
      jest.spyOn(service, 'createUser').mockResolvedValue(null);
      await expect(
        service.createUserWithPassword(
          dto as unknown as Parameters<UserService['createUserWithPassword']>[0],
        ),
      ).rejects.toThrow(new RpcException('common.errors.createUser.error'));
    });

    it('should hash password, call createUser and return formatted user', async () => {
      jest.spyOn(service, 'getRole').mockResolvedValue({
        id: 1,
        name: 'USER',
        createdAt: new Date(),
        updatedAt: null,
      } as unknown as Role);
      const createdUser: UserResponse = {
        id: 1,
        name: dto.name,
        userName: dto.userName,
        role: 'USER',
        email: dto.email,
      };
      const createUserSpy = jest.spyOn(service, 'createUser').mockResolvedValue(createdUser);

      const result = await service.createUserWithPassword(
        dto as unknown as Parameters<UserService['createUserWithPassword']>[0],
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(createUserSpy).toHaveBeenCalled();
      expect(result).toEqual(createdUser);
    });
  });

  describe('createUser', () => {
    const createDto = {
      name: 'Jane',
      userName: 'jane',
      providerId: '321',
      provider: Provider.LOCAL,
      email: 'jane@test.com',
      password: 'password',
    } as const;
    const roleId = 1;

    it('should create and return a new user successfully', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      const dbUser = {
        ...createDto,
        id: 10,
        role: { name: 'USER' },
        authProviders: [{ provider: 'LOCAL' }],
      };
      (_prismaMock.client.user.create as jest.Mock).mockResolvedValue(dbUser);

      const result = await service.createUser(createDto, roleId);

      expect(_prismaMock.client.user.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          userName: createDto.userName,
          email: createDto.email,
          isActive: false,
          role: {
            connect: { id: roleId },
          },
          authProviders: {
            create: [
              {
                provider: createDto.provider,
                providerId: createDto.providerId,
                password: createDto.password,
              },
            ],
          },
          profile: {
            create: {},
          },
        },
        include: {
          authProviders: true,
          role: true,
          profile: true,
        },
      });

      expect(result).toEqual({
        id: dbUser.id,
        name: dbUser.name,
        userName: dbUser.userName,
        role: 'USER',
        email: dbUser.email,
        providerName: createDto.provider,
      });
    });

    it('should throw RpcException if prisma user.create throws an error', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(service.createUser(createDto, roleId)).rejects.toThrow(
        new RpcException('common.errors.internalServerError'),
      );
    });
  });

  describe('checkUserIsActive (private)', () => {
    const targetEmail = 'inactive@mail.com';
    const userDto: UserResponse = {
      id: 1,
      name: 'abc',
      userName: 'abc',
      email: targetEmail,
      role: 'USER',
    } as unknown as UserResponse;

    it('should call prisma findFirst with correct args and return user', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      const dbUser = { id: 1 };
      (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValueOnce(dbUser);

      const checkFn = (
        service as unknown as {
          checkUserIsActive: (u: UserResponse) => Promise<unknown>;
        }
      ).checkUserIsActive.bind(service);
      const result = await checkFn(userDto);

      expect(prismaMock.client.user.findFirst).toHaveBeenCalledWith({
        where: { email: targetEmail, isActive: false },
        include: { role: true, authProviders: true },
      });
      expect(result).toBe(dbUser);
    });

    it('should return null when no matching user', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const checkFn = (
        service as unknown as {
          checkUserIsActive: (u: UserResponse) => Promise<unknown>;
        }
      ).checkUserIsActive.bind(service);
      const result = await checkFn(userDto);
      expect(result).toBeNull();
    });
  });

  describe('changeIsActive', () => {
    const inactiveUser: UserResponse = {
      id: 99,
      name: 'Inactive',
      userName: 'inactive',
      email: 'inactive@mail.com',
      role: 'USER',
    } as unknown as UserResponse;

    it('should throw BAD_REQUEST when payload invalid', async () => {
      await expect(service.changeIsActive(null as unknown as UserResponse)).rejects.toThrow(
        TypedRpcException,
      );
      await expect(
        service.changeIsActive({ id: 1, name: 'A', userName: 'a' } as unknown as UserResponse),
      ).rejects.toThrow(TypedRpcException);
    });

    it('should throw alreadyActive when user already active', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.changeIsActive(inactiveUser)).rejects.toThrow(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.errors.changeIsActive.alreadyActive',
        }),
      );
    });

    it('should update user and return formatted data', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      const dbUser = {
        id: inactiveUser.id,
        name: inactiveUser.name,
        userName: inactiveUser.userName,
        email: inactiveUser.email,
        role: { name: 'USER' },
        authProviders: [],
      };
      (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValueOnce({ ...dbUser });
      (prismaMock.client.user.update as jest.Mock).mockResolvedValueOnce({
        ...dbUser,
        isActive: true,
      });

      const result = await service.changeIsActive(inactiveUser);

      expect(result).toEqual({
        id: dbUser.id,
        name: dbUser.name,
        userName: dbUser.userName,
        email: dbUser.email,
        role: 'USER',
        authProviders: [],
      });
      expect(prismaMock.client.user.update).toHaveBeenCalledWith({
        where: { id: dbUser.id },
        data: { isActive: true },
        include: { role: true, authProviders: true },
      });
    });

    it('should throw internalServerError when prisma update fails', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
      (prismaMock.client.user.update as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(service.changeIsActive(inactiveUser)).rejects.toThrow(TypedRpcException);
    });
  });
});
