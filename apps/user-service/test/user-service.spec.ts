/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { ProfileFacebookUser } from '@app/common/dto/user/requests/facebook-user-dto.request';
import { SoftDeleteUserRequest } from '@app/common/dto/user/requests/soft-delete-user.request';
import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserCreationRequest } from '@app/common/dto/user/requests/user-creation.request';
import { UserUpdateRoleRequest } from '@app/common/dto/user/requests/user-update-role.request';
import { UserUpdateStatusRequest } from '@app/common/dto/user/requests/user-update-status.request';
import { SoftDeleteUserResponse } from '@app/common/dto/user/responses/soft-delete-user.response';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { RoleEnum } from '@app/common/enums/role.enum';
import { Role as RoleUpdate } from '@app/common/enums/roles/users.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { UserStatus } from '@app/common/enums/user-status.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import * as prismaClientError from '@app/common/utils/prisma-client-error';
import { handlePrismaError } from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as classValidator from 'class-validator';
import { PrismaClient, Provider, Role } from '../generated/prisma';
import { ProductProducer } from '../src/producer/product.producer';
import { UserService } from '../src/user-service.service';
import { assertRpcException } from '@app/common/helpers/test.helper';
import { UpdateUserProfileRequest } from '@app/common/dto/user/requests/update-user-profile.request';
import { UpdatePasswordRequest } from '@app/common/dto/user/requests/update-password.request';
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));
jest.spyOn(classValidator, 'validateOrReject').mockImplementation(jest.fn());

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
                findMany: jest.fn(),
                updateMany: jest.fn(),
              },
              role: { findUnique: jest.fn() },
              userProfile: { findUnique: jest.fn(), findFirst: jest.fn() },
              authProvider: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
              },
              $transaction: jest.fn(),
            },
          },
        },
        {
          provide: CustomLogger,
          useValue: { error: jest.fn(), log: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('default-avatar.png') },
        },
        {
          provide: ProductProducer,
          useValue: { addJobSoftDeleteCart: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get<UserService>(UserService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should handle user with no auth providers', async () => {
    const dto: UserByEmailRequest = { email: 'test@example.com' };
    const userRecord = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: null,
      role: { name: 'USER' },
      authProviders: [],
    };
    const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
    (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(userRecord);
    const result = await service.getUserByEmail(dto);
    expect(result?.providerName).toBeUndefined();
  });

  it('should handle null imageUrl correctly', async () => {
    const dto: UserByEmailRequest = { email: 'test@example.com' };
    const userRecord = {
      id: 1,
      name: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: null,
      role: { name: 'USER' },
      authProviders: [],
    };
    const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
    (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(userRecord);
    const result = await service.getUserByEmail(dto);
    expect(result?.imageUrl).toBe('');
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

    it('should throw TypedRpcException when prisma fails', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.role.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));
      await expect(service.getRole()).rejects.toThrow(TypedRpcException);
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
      // Reset all mocks completely
      jest.restoreAllMocks();
      jest.spyOn(classValidator, 'validateOrReject').mockResolvedValue(undefined);
      jest.spyOn(service, 'checkUserExists').mockResolvedValue(existingUser);

      const expectedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.createUser.exists',
      });

      await expect(service.validateOAuthUserCreation(createDto)).rejects.toThrow(expectedError);
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
        status: 'ACTIVE',
        deletedAt: null,
        email: undefined,
      };
      jest.spyOn(service, 'getRole').mockResolvedValue(role);
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
      ).rejects.toThrow(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.errors.createUser.roleNotFound',
        }),
      );
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
        status: 'ACTIVE',
        deletedAt: null,
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

    it('should handle undefined email correctly', async () => {
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
        status: 'ACTIVE',
        deletedAt: null,

        email: undefined,
      };
      jest.spyOn(service, 'createUser').mockResolvedValue(createdUser);

      const result = await service.createUserWithPassword(
        dto as unknown as Parameters<UserService['createUserWithPassword']>[0],
      );

      expect(result?.email).toBeUndefined();
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

    it('should handle non-Error exception during user creation', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.create as jest.Mock).mockRejectedValue('DB Error String');
      await expect(service.createUser(createDto, roleId)).rejects.toThrow(RpcException);
    });

    it('should handle null email when creating user', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      const dbUser = {
        ...createDto,
        id: 11,
        email: null,
        role: { name: 'USER' },
        authProviders: [{ provider: 'LOCAL' }],
      };
      (_prismaMock.client.user.create as jest.Mock).mockResolvedValue(dbUser);
      const result = await service.createUser(createDto, roleId);
      expect(result?.email).toBe(undefined);
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

    it('should handle non-Error exception during user update', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValueOnce({ id: 1 });
      (prismaMock.client.user.update as jest.Mock).mockRejectedValueOnce('Update failed');
      await expect(service.changeIsActive(inactiveUser)).rejects.toThrow(TypedRpcException);
    });

    it('should handle null email when updating user', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      const dbUser = {
        id: inactiveUser.id,
        name: inactiveUser.name,
        userName: inactiveUser.userName,
        email: null,
        role: { name: 'USER' },
        authProviders: [],
      };
      (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValueOnce({ ...dbUser });
      (prismaMock.client.user.update as jest.Mock).mockResolvedValueOnce({
        ...dbUser,
        isActive: true,
      });

      const result = await service.changeIsActive(inactiveUser);

      expect(result?.email).toBe(undefined);
    });
  });

  describe('findOrCreateUserFromFacebook', () => {
    const profile: ProfileFacebookUser = {
      providerId: 'fb-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@facebook.com',
    };
    it('should return a mapped user with empty imageUrl if it is null', async () => {
      const authProviderRecord = {
        providerId: 'fb-123',
        provider: Provider.FACEBOOK,
        user: {
          id: 1,
          name: 'John Doe',
          userName: 'johndoe',
          email: 'john.doe@facebook.com',
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: null,
          role: { name: 'USER' },
          authProviders: [],
        },
      };

      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.authProvider.findUnique as jest.Mock).mockResolvedValue(
        authProviderRecord,
      );
      const result = await service.findOrCreateUserFromFacebook(profile);

      expect(result.imageUrl).toBe('');
      expect(result.email).toBe(profile.email);
    });
  });
  describe('adminCreateUser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    const baseDto: UserCreationRequest = {
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
      role: RoleEnum.USER,
    } as UserCreationRequest;
    it('should create user successfully', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(null);
      const fakeTransactionResult = {
        user: {
          id: 1,
          name: 'John',
          userName: 'john@abcd',
          email: null,
          imageUrl: 'default-avatar.png',
          role: { name: 'USER' },
          createdAt: new Date(),
        },
        profile: { phoneNumber: null, address: null, dob: null },
        authProvider: { id: 10 },
      };
      (_prismaMock.client.$transaction as jest.Mock).mockImplementation(
        async (cb: (tx: typeof _prismaMock.client) => Promise<unknown>) =>
          cb({
            user: { create: jest.fn().mockResolvedValue(fakeTransactionResult.user) },
            authProvider: {
              create: jest.fn().mockResolvedValue(fakeTransactionResult.authProvider),
            },
            userProfile: { create: jest.fn().mockResolvedValue(fakeTransactionResult.profile) },
          } as unknown as typeof _prismaMock.client),
      );
      const result = await service.create({ ...baseDto });
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(
        expect.objectContaining({
          id: 1,
          name: 'John',
          role: 'USER',
        }),
      );
      expect(_prismaMock.client.$transaction).toHaveBeenCalled();
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
    it('should throw conflict error when phone exists', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      jest.restoreAllMocks();
      jest.spyOn(classValidator, 'validateOrReject').mockResolvedValue(undefined);
      (_prismaMock.client.userProfile.findUnique as jest.Mock).mockResolvedValue({ id: 99 });
      const completeDto = {
        ...baseDto,
        phone: '0123456789',
      };
      await expect(service.create(completeDto)).rejects.toThrow(TypedRpcException);
    });
    it('should throw conflict error when email exists', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue({ id: 100 });
      await expect(service.create({ ...baseDto, email: 'exist@mail.com' })).rejects.toThrow(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.CONFLICT,
          message: 'common.user.emailExist',
        }),
      );
    });

    it('should throw TypedRpcException when prisma error occurs', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      jest.spyOn(classValidator, 'validateOrReject').mockResolvedValue(undefined);
      (_prismaMock.client.userProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (_prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(null);
      const prismaError = new Error('db');
      (_prismaMock.client.$transaction as jest.Mock).mockRejectedValue(prismaError);
      const mappedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
      jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementation(() => {
        throw mappedError;
      });
      await expect(service.create({ ...baseDto })).rejects.toBe(mappedError);
      expect(handlePrismaError).toHaveBeenCalledWith(
        prismaError,
        'UserService',
        'create',
        expect.anything(),
      );
    });
    it('should throw validation error when dto is invalid', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      } as const;
      jest
        .spyOn(classValidator, 'validateOrReject')
        .mockRejectedValueOnce(new TypedRpcException(rpcError));
      try {
        await service.create({} as unknown as UserCreationRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
      }
    });
  });
  describe('update Roles', () => {
    const dto: UserUpdateRoleRequest = {
      users: [
        { userId: 1, role: RoleUpdate.ADMIN },
        { userId: 2, role: RoleUpdate.USER },
      ],
    };
    afterEach(() => {
      (classValidator.validateOrReject as jest.Mock).mockResolvedValue(undefined);
    });
    it('should validate dto, update roles and return mapped response', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, role: 'USER' },
        { id: 2, role: 'ADMIN' },
      ]);
      const updatedUsers = [
        {
          id: 1,
          name: 'User A',
          userName: 'usera',
          email: 'a@mail.com',
          isActive: true,
          imageUrl: null,
          status: 'ACTIVE',
          role: { name: 'ADMIN' },
          profile: null,
        },
        {
          id: 2,
          name: 'User B',
          userName: 'userb',
          email: 'b@mail.com',
          isActive: false,
          imageUrl: null,
          status: 'INACTIVE',
          role: { name: 'USER' },
          profile: { phoneNumber: null, address: null },
        },
      ];
      (_prismaMock.client.$transaction as jest.Mock).mockResolvedValueOnce(updatedUsers);
      const result = await service.updateRoles(dto);
      expect(_prismaMock.client.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        select: { id: true, role: { select: { name: true } } },
      });
      expect(_prismaMock.client.$transaction).toHaveBeenCalled();
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, role: 'ADMIN' }),
          expect.objectContaining({ id: 2, role: 'USER' }),
        ]),
      );
    });

    it('should propagate validation error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      } as const;
      jest
        .spyOn(classValidator, 'validateOrReject')
        .mockRejectedValueOnce(new TypedRpcException(rpcError));
      try {
        await service.updateRoles(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.BAD_REQUEST);
      }
    });

    it('should throw NOT_FOUND when some users not exist', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
      await expect(service.updateRoles(dto)).rejects.toThrow(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.user.someUserNotExist',
          args: { missingIds: '2' },
        }),
      );
    });

    it('should propagate prisma error via handlePrismaError', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, role: 'USER' },
        { id: 2, role: 'ADMIN' },
      ]);
      const prismaError = new Error('db fail');
      (_prismaMock.client.$transaction as jest.Mock).mockRejectedValueOnce(prismaError);
      const mappedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.uniqueConstraint',
      });
      jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementationOnce(() => {
        throw mappedError;
      });
      await expect(service.updateRoles(dto)).rejects.toBe(mappedError);
      expect(prismaClientError.handlePrismaError).toHaveBeenCalledWith(
        prismaError,
        'UserService',
        'updateRoles',
        expect.anything(),
      );
    });

    it('should return UNCHANGED when no user roles require updating', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      // Mock DB roles that already match incoming dto
      (prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, role: { name: 'ADMIN' } },
        { id: 2, role: { name: 'USER' } },
      ]);

      const result = await service.updateRoles(dto);

      expect(result).toEqual({ statusKey: StatusKey.UNCHANGED, data: [] });
      expect(prismaMock.client.$transaction).not.toHaveBeenCalled();
    });
  });
  describe('update statuses', () => {
    const dto: UserUpdateStatusRequest = {
      users: [
        { userId: 1, status: UserStatus.ACTIVE },
        { userId: 2, status: UserStatus.INACTIVE },
      ],
    };
    beforeEach(() => {
      jest.clearAllMocks();
      (classValidator.validateOrReject as jest.Mock).mockResolvedValue(undefined);
    });
    it('should validate dto, update statuses and return mapped response', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, status: 'INACTIVE' },
        { id: 2, status: 'ACTIVE' },
      ]);
      const updatedUsers = [
        {
          id: 1,
          name: 'User A',
          userName: 'usera',
          email: 'a@mail.com',
          isActive: true,
          imageUrl: null,
          status: 'ACTIVE',
          role: { name: 'USER' },
          profile: null,
        },
        {
          id: 2,
          name: 'User B',
          userName: 'userb',
          email: 'b@mail.com',
          isActive: false,
          imageUrl: null,
          status: 'INACTIVE',
          role: { name: 'ADMIN' },
          profile: { phoneNumber: null, address: null },
        },
      ];
      (_prismaMock.client.$transaction as jest.Mock).mockResolvedValueOnce(updatedUsers);
      const result = await service.updateStatuses(dto);
      expect(_prismaMock.client.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        select: { id: true, status: true },
      });
      expect(_prismaMock.client.$transaction).toHaveBeenCalled();
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, status: 'ACTIVE' }),
          expect.objectContaining({ id: 2, status: 'INACTIVE' }),
        ]),
      );
    });

    it('should propagate validation error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      } as const;
      jest
        .spyOn(classValidator, 'validateOrReject')
        .mockRejectedValueOnce(new TypedRpcException(rpcError));
      try {
        await service.updateStatuses(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.BAD_REQUEST);
      }
    });

    it('should throw NOT_FOUND when some users do not exist', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
      await expect(service.updateStatuses(dto)).rejects.toThrow(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.user.someUserNotExist',
          args: { missingIds: '2' },
        }),
      );
    });

    it('should propagate prisma error via handlePrismaError', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, status: 'INACTIVE' },
        { id: 2, status: 'ACTIVE' },
      ]);
      const prismaError = new Error('db fail');
      (_prismaMock.client.$transaction as jest.Mock).mockRejectedValueOnce(prismaError);
      const mappedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.rowNotFound',
      });
      jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementationOnce(() => {
        throw mappedError;
      });
      await expect(service.updateStatuses(dto)).rejects.toBe(mappedError);
      expect(prismaClientError.handlePrismaError).toHaveBeenCalledWith(
        prismaError,
        'UserService',
        'updateStatuses',
        expect.anything(),
      );
    });

    it('should return status unchanged if no users had their status changed', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, status: 'ACTIVE' },
        { id: 2, status: 'INACTIVE' },
      ]);
      const unchangedUsers = [
        {
          id: 1,
          name: 'User A',
          userName: 'usera',
          email: 'a@mail.com',
          isActive: true,
          imageUrl: null,
          status: 'ACTIVE',
          role: { name: 'USER' },
          profile: null,
        },
        {
          id: 2,
          name: 'User B',
          userName: 'userb',
          email: 'b@mail.com',
          isActive: false,
          imageUrl: null,
          status: 'INACTIVE',
          role: { name: 'ADMIN' },
          profile: { phoneNumber: null, address: null },
        },
      ];
      (_prismaMock.client.$transaction as jest.Mock).mockResolvedValueOnce(unchangedUsers);
      const result = await service.updateStatuses(dto);
      expect(result.statusKey).toBe(StatusKey.UNCHANGED);
      expect(result.data).toEqual([]);
    });
  });
  describe('soft delete user', () => {
    const dto: SoftDeleteUserRequest = { userId: 1 } as SoftDeleteUserRequest;
    let prismaMock: PrismaService<PrismaClient>;
    let productProducerMock: jest.Mocked<ProductProducer>;

    beforeEach(() => {
      jest.clearAllMocks();
      (classValidator.validateOrReject as jest.Mock).mockResolvedValue(undefined);
      prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      productProducerMock = moduleRef.get(ProductProducer);
    });

    it('should propagate validation error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.user.notFound',
      } as const;
      (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      try {
        await service.softdeleteUser(dto);
      } catch (error) {
        assertRpcException(error, rpcError.code, rpcError);
      }
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.softdeleteUser(dto)).rejects.toThrow(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.user.notFound',
        }),
      );
    });

    it('should return UNCHANGED when user already deleted', async () => {
      const deletedUser = { id: 1, deletedAt: new Date() };
      (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(deletedUser);
      const result = await service.softdeleteUser(dto);
      expect(result.statusKey).toBe(StatusKey.UNCHANGED);
      expect(prismaMock.client.user.update).not.toHaveBeenCalled();
      expect(productProducerMock.addJobSoftDeleteCart).not.toHaveBeenCalled();
    });

    it('should soft delete user and enqueue cart deletion job', async () => {
      const foundUser = { id: 1, deletedAt: null };
      const updatedUser = { id: 1, deletedAt: new Date() };
      (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(foundUser);
      (prismaMock.client.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          return await callback({
            user: {
              update: jest.fn().mockResolvedValue(updatedUser),
            },
            userProfile: {
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          });
        },
      );

      const result = await service.softdeleteUser(dto);

      expect(productProducerMock.addJobSoftDeleteCart).toHaveBeenCalledWith({
        userId: updatedUser.id,
      });
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      const payload = result.data as SoftDeleteUserResponse;
      expect(payload.userId).toBe(dto.userId);
      expect(payload.deletedAt).toBeInstanceOf(Date);
    });

    it('should propagate prisma error via handlePrismaError', async () => {
      const foundUser = { id: 1, deletedAt: null };
      (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce(foundUser);
      const prismaError = new Error('db error');
      (prismaMock.client.$transaction as jest.Mock).mockRejectedValue(prismaError);
      jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementation(() => {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'common.errors.internalServerError',
        });
      });
      await expect(service.softdeleteUser(dto)).rejects.toThrow();
      expect(prismaClientError.handlePrismaError).toHaveBeenCalledWith(
        prismaError,
        'UserService',
        'softdeleteUser',
        expect.anything(),
      );
    });

    it('should soft delete userProfile when profile exists', async () => {
      const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      const productProducerMock = moduleRef.get(ProductProducer);

      (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: dto.userId,
        deletedAt: null,
      });

      const mockUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

      (prismaMock.client.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            user: {
              update: jest.fn().mockResolvedValue({
                id: dto.userId,
                deletedAt: new Date(),
              }),
            },
            userProfile: {
              updateMany: mockUpdateMany,
            },
          }),
      );

      const result = await service.softdeleteUser(dto);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { userId: dto.userId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(productProducerMock.addJobSoftDeleteCart).toHaveBeenCalledWith({
        userId: dto.userId,
      });
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
    });
  });
  describe('update statuses', () => {
    const dto: UserUpdateStatusRequest = {
      users: [
        { userId: 1, status: UserStatus.ACTIVE },
        { userId: 2, status: UserStatus.INACTIVE },
      ],
    };
    beforeEach(() => {
      jest.clearAllMocks();
      (classValidator.validateOrReject as jest.Mock).mockResolvedValue(undefined);
    });
    // afterEach(() => {
    //   (classValidator.validateOrReject as jest.Mock).mockResolvedValue(undefined);
    // });
    it('should validate dto, update statuses and return mapped response', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, status: 'INACTIVE' },
        { id: 2, status: 'ACTIVE' },
      ]);
      const updatedUsers = [
        {
          id: 1,
          name: 'User A',
          userName: 'usera',
          email: 'a@mail.com',
          isActive: true,
          imageUrl: null,
          status: 'ACTIVE',
          role: { name: 'USER' },
          profile: null,
        },
        {
          id: 2,
          name: 'User B',
          userName: 'userb',
          email: 'b@mail.com',
          isActive: false,
          imageUrl: null,
          status: 'INACTIVE',
          role: { name: 'ADMIN' },
          profile: { phoneNumber: null, address: null },
        },
      ];
      (_prismaMock.client.$transaction as jest.Mock).mockResolvedValueOnce(updatedUsers);
      const result = await service.updateStatuses(dto);
      expect(_prismaMock.client.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        select: { id: true, status: true },
      });
      expect(_prismaMock.client.$transaction).toHaveBeenCalled();
      expect(result.statusKey).toBe(StatusKey.SUCCESS);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, status: 'ACTIVE' }),
          expect.objectContaining({ id: 2, status: 'INACTIVE' }),
        ]),
      );
    });

    it('should propagate validation error', async () => {
      const rpcError = {
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.validationError',
      } as const;
      jest
        .spyOn(classValidator, 'validateOrReject')
        .mockRejectedValueOnce(new TypedRpcException(rpcError));
      try {
        await service.updateStatuses(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        expect((error as TypedRpcException).getError()).toEqual(rpcError);
        expect((error as TypedRpcException).getError().code).toEqual(HTTP_ERROR_CODE.BAD_REQUEST);
      }
    });

    it('should throw NOT_FOUND when some users do not exist', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
      await expect(service.updateStatuses(dto)).rejects.toEqual(
        new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.user.someUserNotExist',
          args: { missingIds: '2' },
        }),
      );
    });

    it('should propagate prisma error via handlePrismaError', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, status: 'INACTIVE' },
        { id: 2, status: 'ACTIVE' },
      ]);
      const prismaError = new Error('db fail');
      (_prismaMock.client.$transaction as jest.Mock).mockRejectedValueOnce(prismaError);
      const mappedError = new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.rowNotFound',
      });
      jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementationOnce(() => {
        throw mappedError;
      });
      await expect(service.updateStatuses(dto)).rejects.toBe(mappedError);
      expect(prismaClientError.handlePrismaError).toHaveBeenCalledWith(
        prismaError,
        'UserService',
        'updateStatuses',
        expect.anything(),
      );
    });

    it('should return status unchanged if no users had their status changed', async () => {
      const _prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
      (_prismaMock.client.user.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, status: 'ACTIVE' },
        { id: 2, status: 'INACTIVE' },
      ]);
      const unchangedUsers = [
        {
          id: 1,
          name: 'User A',
          userName: 'usera',
          email: 'a@mail.com',
          isActive: true,
          imageUrl: null,
          status: 'ACTIVE',
          role: { name: 'USER' },
          profile: null,
        },
        {
          id: 2,
          name: 'User B',
          userName: 'userb',
          email: 'b@mail.com',
          isActive: false,
          imageUrl: null,
          status: 'INACTIVE',
          role: { name: 'ADMIN' },
          profile: { phoneNumber: null, address: null },
        },
      ];
      (_prismaMock.client.$transaction as jest.Mock).mockResolvedValueOnce(unchangedUsers);
      const result = await service.updateStatuses(dto);
      expect(result.statusKey).toBe(StatusKey.UNCHANGED);
      expect(result.data).toEqual([]);
    });
  });
  describe('getUserProfile', () => {
    const mockGetUserProfileRequest = {
      userId: 1,
    };

    const mockUserWithProfile = {
      id: 1,
      name: 'John Doe',
      userName: 'johndoe',
      email: 'john@example.com',
      imageUrl: 'https://example.com/avatar.jpg',
      isActive: true,
      status: 'ACTIVE',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: new Date('2023-01-02T00:00:00.000Z'),
      deletedAt: null,
      role: {
        id: 1,
        name: 'USER',
      },
      profile: {
        id: 1,
        address: '123 Main St',
        phoneNumber: '+1234567890',
        dob: new Date('1990-01-01T00:00:00.000Z'),
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z'),
      },
      authProviders: [
        {
          id: 1,
          provider: 'LOCAL',
          providerId: 'local-123',
          password: 'hashed-password',
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
        },
        {
          id: 2,
          provider: 'GOOGLE',
          providerId: 'google-456',
          password: null,
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
        },
      ],
    };

    const mockUserWithoutProfile = {
      id: 2,
      name: 'Jane Smith',
      userName: 'janesmith',
      email: null,
      imageUrl: null,
      isActive: false,
      status: 'INACTIVE',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
      updatedAt: null,
      deletedAt: null,
      role: {
        id: 2,
        name: 'ADMIN',
      },
      profile: null,
      authProviders: [
        {
          id: 3,
          provider: 'FACEBOOK',
          providerId: 'facebook-789',
          password: null,
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
        },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(classValidator, 'validateOrReject').mockResolvedValue(undefined);
    });

    describe('Successful scenarios', () => {
      it('should successfully return user profile with complete profile data', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProfile);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(prismaMock.client.user.findUnique).toHaveBeenCalledWith({
          where: {
            id: mockGetUserProfileRequest.userId,
            deletedAt: null,
          },
          include: {
            role: true,
            profile: true,
            authProviders: {
              select: {
                id: true,
                provider: true,
                providerId: true,
                password: true,
                createdAt: true,
              },
            },
          },
        });

        expect(result).toEqual({
          id: mockUserWithProfile.id,
          name: mockUserWithProfile.name,
          userName: mockUserWithProfile.userName,
          email: mockUserWithProfile.email,
          imageUrl: mockUserWithProfile.imageUrl,
          isActive: mockUserWithProfile.isActive,
          status: mockUserWithProfile.status,
          createdAt: mockUserWithProfile.createdAt,
          updatedAt: mockUserWithProfile.updatedAt,
          role: {
            id: mockUserWithProfile.role.id,
            name: mockUserWithProfile.role.name,
          },
          profile: {
            id: mockUserWithProfile.profile.id,
            address: mockUserWithProfile.profile.address,
            phoneNumber: mockUserWithProfile.profile.phoneNumber,
            dateOfBirth: mockUserWithProfile.profile.dob,
            createdAt: mockUserWithProfile.profile.createdAt,
            updatedAt: mockUserWithProfile.profile.updatedAt,
          },
          authProviders: [
            {
              id: mockUserWithProfile.authProviders[0].id,
              provider: mockUserWithProfile.authProviders[0].provider,
              providerId: mockUserWithProfile.authProviders[0].providerId,
              hasPassword: true,
              createdAt: mockUserWithProfile.authProviders[0].createdAt,
            },
            {
              id: mockUserWithProfile.authProviders[1].id,
              provider: mockUserWithProfile.authProviders[1].provider,
              providerId: mockUserWithProfile.authProviders[1].providerId,
              hasPassword: false,
              createdAt: mockUserWithProfile.authProviders[1].createdAt,
            },
          ],
        });
      });

      it('should successfully return user profile without profile data (null profile)', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithoutProfile);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(result).toEqual({
          id: mockUserWithoutProfile.id,
          name: mockUserWithoutProfile.name,
          userName: mockUserWithoutProfile.userName,
          email: mockUserWithoutProfile.email,
          imageUrl: mockUserWithoutProfile.imageUrl,
          isActive: mockUserWithoutProfile.isActive,
          status: mockUserWithoutProfile.status,
          createdAt: mockUserWithoutProfile.createdAt,
          updatedAt: mockUserWithoutProfile.updatedAt,
          role: {
            id: mockUserWithoutProfile.role.id,
            name: mockUserWithoutProfile.role.name,
          },
          profile: null,
          authProviders: [
            {
              id: mockUserWithoutProfile.authProviders[0].id,
              provider: mockUserWithoutProfile.authProviders[0].provider,
              providerId: mockUserWithoutProfile.authProviders[0].providerId,
              hasPassword: false,
              createdAt: mockUserWithoutProfile.authProviders[0].createdAt,
            },
          ],
        });
      });

      it('should handle user with empty authProviders array', async () => {
        const userWithNoAuthProviders = {
          ...mockUserWithProfile,
          authProviders: [],
        };
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithNoAuthProviders);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(result.authProviders).toEqual([]);
      });

      it('should correctly map hasPassword field based on password presence', async () => {
        const userWithMixedPasswords = {
          ...mockUserWithProfile,
          authProviders: [
            {
              id: 1,
              provider: 'LOCAL',
              providerId: 'local-123',
              password: 'hashed-password',
              createdAt: new Date('2023-01-01T00:00:00.000Z'),
            },
            {
              id: 2,
              provider: 'GOOGLE',
              providerId: 'google-456',
              password: null,
              createdAt: new Date('2023-01-01T00:00:00.000Z'),
            },
            {
              id: 3,
              provider: 'FACEBOOK',
              providerId: 'facebook-789',
              password: '',
              createdAt: new Date('2023-01-01T00:00:00.000Z'),
            },
          ],
        };
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithMixedPasswords);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(result.authProviders).toEqual([
          expect.objectContaining({ hasPassword: true }), // 'hashed-password'
          expect.objectContaining({ hasPassword: false }), // null
          expect.objectContaining({ hasPassword: false }), // ''
        ]);
      });

      it('should handle different user ID types correctly', async () => {
        const requestWithStringId = { userId: 999 };
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProfile);

        await service.getUserProfile(requestWithStringId);

        expect(prismaMock.client.user.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: 999,
            }),
          }),
        );
      });
    });

    describe('Validation scenarios', () => {
      it('should throw validation error when DTO validation fails', async () => {
        const validationError = new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.errors.validationError',
        });
        (classValidator.validateOrReject as jest.Mock).mockRejectedValue(validationError);

        await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
          validationError,
        );

        expect(classValidator.validateOrReject).toHaveBeenCalledWith(
          expect.objectContaining(mockGetUserProfileRequest),
        );
      });

      it('should validate DTO with correct class instance', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProfile);

        await service.getUserProfile(mockGetUserProfileRequest);

        expect(classValidator.validateOrReject).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockGetUserProfileRequest.userId,
          }),
        );
      });

      it('should handle multiple validation errors', async () => {
        const multipleValidationErrors = [
          { property: 'userId', constraints: { isNotEmpty: 'userId should not be empty' } },
          { property: 'userId', constraints: { isNumber: 'userId must be a number' } },
        ];
        (classValidator.validateOrReject as jest.Mock).mockRejectedValue(
          new Error(JSON.stringify(multipleValidationErrors)),
        );

        await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow();
      });
    });

    describe('Error scenarios', () => {
      beforeEach(() => {
        // Reset validateOrReject mock to resolve by default for error scenarios
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should throw TypedRpcException when user not found', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(null);

        // Business logic errors (like NOT_FOUND) are re-thrown as-is
        await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
          new TypedRpcException({
            code: HTTP_ERROR_CODE.NOT_FOUND,
            message: 'common.user.notFound',
          }),
        );
      });

      it('should handle database connection errors', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        const dbError = new Error('Database connection failed');
        (prismaMock.client.user.findUnique as jest.Mock).mockRejectedValue(dbError);

        await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.getUserProfile(mockGetUserProfileRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(
            HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          );
          expect((error as TypedRpcException).getError().message).toBe(
            'common.errors.internalServerError',
          );
        }
      });

      it('should handle Prisma unique constraint errors', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        const constraintError = new Error('Unique constraint failed');
        constraintError.name = 'PrismaClientKnownRequestError';
        (prismaMock.client.user.findUnique as jest.Mock).mockRejectedValue(constraintError);

        await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.getUserProfile(mockGetUserProfileRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(
            HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          );
          expect((error as TypedRpcException).getError().message).toBe(
            'common.errors.internalServerError',
          );
        }
      });

      it('should handle timeout errors', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        const timeoutError = new Error('Query timeout');
        (prismaMock.client.user.findUnique as jest.Mock).mockRejectedValue(timeoutError);

        const mappedError = new TypedRpcException({
          code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'common.errors.internalServerError',
        });
        jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementation(() => {
          throw mappedError;
        });

        await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
          mappedError,
        );
      });

      it('should handle non-Error exceptions', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockRejectedValue('String error');

        const mappedError = new TypedRpcException({
          code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'common.errors.internalServerError',
        });
        jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementation(() => {
          throw mappedError;
        });

        await expect(service.getUserProfile(mockGetUserProfileRequest)).rejects.toThrow(
          mappedError,
        );
      });
    });

    describe('Edge cases and data mapping', () => {
      it('should handle user with null email correctly', async () => {
        const userWithNullEmail = {
          ...mockUserWithProfile,
          email: null,
        };
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithNullEmail);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(result.email).toBeNull();
      });

      it('should handle user with null imageUrl correctly', async () => {
        const userWithNullImage = {
          ...mockUserWithProfile,
          imageUrl: null,
        };
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithNullImage);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(result.imageUrl).toBeNull();
      });

      it('should handle user with null updatedAt correctly', async () => {
        const userWithNullUpdatedAt = {
          ...mockUserWithProfile,
          updatedAt: null,
        };
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithNullUpdatedAt);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(result.updatedAt).toBeNull();
      });

      it('should handle profile with null fields correctly', async () => {
        const userWithNullProfileFields = {
          ...mockUserWithProfile,
          profile: {
            id: 1,
            address: null,
            phoneNumber: null,
            dob: null,
            createdAt: new Date('2023-01-01T00:00:00.000Z'),
            updatedAt: null,
          },
        };
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(
          userWithNullProfileFields,
        );

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(result.profile).toEqual({
          id: 1,
          address: null,
          phoneNumber: null,
          dateOfBirth: null,
          createdAt: new Date('2023-01-01T00:00:00.000Z'),
          updatedAt: null,
        });
      });

      it('should handle authProvider with null providerId correctly', async () => {
        const userWithNullProviderId = {
          ...mockUserWithProfile,
          authProviders: [
            {
              id: 1,
              provider: 'LOCAL',
              providerId: null,
              password: 'hashed-password',
              createdAt: new Date('2023-01-01T00:00:00.000Z'),
            },
          ],
        };
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithNullProviderId);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(result.authProviders[0].providerId).toBeNull();
      });

      it('should handle large user ID values', async () => {
        const largeIdRequest = { userId: 2147483647 }; // Max 32-bit integer
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProfile);

        await service.getUserProfile(largeIdRequest);

        expect(prismaMock.client.user.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: 2147483647,
            }),
          }),
        );
      });

      it('should verify correct Prisma query structure', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProfile);

        await service.getUserProfile(mockGetUserProfileRequest);

        expect(prismaMock.client.user.findUnique).toHaveBeenCalledWith({
          where: {
            id: mockGetUserProfileRequest.userId,
            deletedAt: null,
          },
          include: {
            role: true,
            profile: true,
            authProviders: {
              select: {
                id: true,
                provider: true,
                providerId: true,
                password: true,
                createdAt: true,
              },
            },
          },
        });
      });

      it('should handle concurrent requests correctly', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProfile);

        const requests = [
          service.getUserProfile({ userId: 1 }),
          service.getUserProfile({ userId: 2 }),
          service.getUserProfile({ userId: 3 }),
        ];

        await Promise.all(requests);

        expect(prismaMock.client.user.findUnique).toHaveBeenCalledTimes(3);
      });
    });

    describe('Method signature and return type verification', () => {
      it('should return correct type structure', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProfile);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        expect(typeof result.id).toBe('number');
        expect(typeof result.name).toBe('string');
        expect(typeof result.userName).toBe('string');
        expect(result.email === null || typeof result.email === 'string').toBe(true);
        expect(result.imageUrl === null || typeof result.imageUrl === 'string').toBe(true);
        expect(typeof result.isActive).toBe('boolean');
        expect(typeof result.status).toBe('string');
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt === null || result.updatedAt instanceof Date).toBe(true);
        expect(typeof result.role.id).toBe('number');
        expect(typeof result.role.name).toBe('string');
        expect(result.profile === null || typeof result.profile === 'object').toBe(true);
        expect(Array.isArray(result.authProviders)).toBe(true);
      });

      it('should ensure authProviders array contains correct structure', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithProfile);

        const result = await service.getUserProfile(mockGetUserProfileRequest);

        result.authProviders.forEach((provider) => {
          expect(typeof provider.id).toBe('number');
          expect(typeof provider.provider).toBe('string');
          expect(provider.providerId === null || typeof provider.providerId === 'string').toBe(
            true,
          );
          expect(typeof provider.hasPassword).toBe('boolean');
          expect(provider.createdAt).toBeInstanceOf(Date);
        });
      });
    });
  });

  describe('updateUserProfile', () => {
    const mockUpdateUserProfileRequest = {
      userId: 1,
      name: 'Updated Name',
      userName: 'updateduser',
      email: 'updated@example.com',
      imageUrl: 'https://example.com/updated-image.jpg',
      address: 'Updated Address',
      phoneNumber: '+84901234567',
      dateOfBirth: '1990-01-01',
    };

    const mockExistingUser = {
      id: 1,
      name: 'Original Name',
      userName: 'originaluser',
      email: 'original@example.com',
      imageUrl: 'https://example.com/original-image.jpg',
      updatedAt: new Date('2023-01-01T00:00:00Z'),
      profile: {
        id: 1,
        userId: 1,
        address: 'Original Address',
        phoneNumber: '+84987654321',
        dob: new Date('1985-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
        deletedAt: null,
      },
    };

    const mockUpdatedUser = {
      id: 1,
      name: 'Updated Name',
      userName: 'updateduser',
      email: 'updated@example.com',
      imageUrl: 'https://example.com/updated-image.jpg',
      updatedAt: new Date('2023-12-01T00:00:00Z'),
    };

    const mockUpdatedProfile = {
      id: 1,
      userId: 1,
      address: 'Updated Address',
      phoneNumber: '+84901234567',
      dob: new Date('1990-01-01T00:00:00Z'),
      updatedAt: new Date('2023-12-01T00:00:00Z'),
      deletedAt: null,
    };

    describe('Successful scenarios', () => {
      beforeEach(() => {
        // Reset validateOrReject mock to resolve by default for successful scenarios
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should successfully update user and profile fields', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: mockUpdatedUser,
          profile: mockUpdatedProfile,
        });

        const result = await service.updateUserProfile(mockUpdateUserProfileRequest);

        expect(result).toBeDefined();
        expect(typeof result.id).toBe('number');
        expect(typeof result.name).toBe('string');
        expect(typeof result.userName).toBe('string');
        expect(result.email === null || typeof result.email === 'string').toBe(true);
        expect(result.imageUrl === null || typeof result.imageUrl === 'string').toBe(true);
        expect(result.updatedAt === null || result.updatedAt instanceof Date).toBe(true);
        expect(result.profile).toBeDefined();
        expect(result.profile!.id).toBe(mockUpdatedProfile.id);
        expect(result.profile!.address).toBe(mockUpdatedProfile.address);
        expect(result.profile!.phoneNumber).toBe(mockUpdatedProfile.phoneNumber);
        expect(result.profile!.dateOfBirth).toEqual(mockUpdatedProfile.dob);
      });

      it('should successfully update only user fields without profile', async () => {
        const userOnlyRequest = {
          userId: 1,
          name: 'Updated Name Only',
          email: 'newemail@example.com',
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: { ...mockUpdatedUser, name: 'Updated Name Only', email: 'newemail@example.com' },
          profile: mockExistingUser.profile,
        });

        const result = await service.updateUserProfile(userOnlyRequest);

        expect(result).toBeDefined();
        expect(result.name).toBe('Updated Name Only');
        expect(result.email).toBe('newemail@example.com');
        expect(result.profile).toBeDefined();
        expect(result.profile!.address).toBe(mockExistingUser.profile.address);
      });

      it('should successfully update only profile fields', async () => {
        const profileOnlyRequest = {
          userId: 1,
          address: 'New Address Only',
          phoneNumber: '+84123456789',
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: mockExistingUser,
          profile: {
            ...mockUpdatedProfile,
            address: 'New Address Only',
            phoneNumber: '+84123456789',
          },
        });

        const result = await service.updateUserProfile(profileOnlyRequest);

        expect(result).toBeDefined();
        expect(result.name).toBe(mockExistingUser.name);
        expect(result.profile!.address).toBe('New Address Only');
        expect(result.profile!.phoneNumber).toBe('+84123456789');
      });

      it('should handle user without existing profile (create new profile)', async () => {
        const userWithoutProfile = { ...mockExistingUser, profile: null };
        const createProfileRequest = {
          userId: 1,
          address: 'New Address',
          phoneNumber: '+84111222333',
          dateOfBirth: '1995-05-05',
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithoutProfile);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: userWithoutProfile,
          profile: {
            id: 2,
            userId: 1,
            address: 'New Address',
            phoneNumber: '+84111222333',
            dob: new Date('1995-05-05T00:00:00Z'),
            updatedAt: new Date(),
          },
        });

        const result = await service.updateUserProfile(createProfileRequest);

        expect(result).toBeDefined();
        expect(result.profile).toBeDefined();
        expect(result.profile!.address).toBe('New Address');
        expect(result.profile!.phoneNumber).toBe('+84111222333');
      });

      it('should handle null values correctly', async () => {
        const nullValuesRequest = {
          userId: 1,
          name: undefined,
          email: undefined,
          imageUrl: undefined,
          address: undefined,
          phoneNumber: undefined,
          dateOfBirth: undefined,
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: { ...mockUpdatedUser, name: null, email: null, imageUrl: null },
          profile: { ...mockUpdatedProfile, address: null, phoneNumber: null, dob: null },
        });

        const result = await service.updateUserProfile(nullValuesRequest);

        expect(result).toBeDefined();
        expect(result.name).toBeNull();
        expect(result.email).toBeNull();
        expect(result.imageUrl).toBeNull();
        expect(result.profile!.address).toBeNull();
        expect(result.profile!.phoneNumber).toBeNull();
        expect(result.profile!.dateOfBirth).toBeNull();
      });
    });

    describe('Validation scenarios', () => {
      it('should throw validation error when DTO validation fails', async () => {
        const invalidRequest = { userId: 'invalid' };
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockRejectedValue([
          { property: 'userId', constraints: { isNumber: 'userId must be a number' } },
        ]);

        await expect(
          service.updateUserProfile(invalidRequest as unknown as UpdateUserProfileRequest),
        ).rejects.toEqual([
          { property: 'userId', constraints: { isNumber: 'userId must be a number' } },
        ]);

        expect(mockValidateOrReject).toHaveBeenCalledWith(expect.objectContaining(invalidRequest));
      });

      it('should throw conflict error when email already exists', async () => {
        // Reset mock to resolve for this test
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
        const emailConflictRequest = { userId: 1, email: 'existing@example.com' };
        const existingEmailUser = { id: 2, email: 'existing@example.com' };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(existingEmailUser);
        try {
          await service.updateUserProfile(emailConflictRequest);
          fail('Expected TypedRpcException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          // Business logic errors (like CONFLICT) are re-thrown as-is
          expect((error as TypedRpcException).getError().code).toBe(HTTP_ERROR_CODE.CONFLICT);
          expect((error as TypedRpcException).getError().message).toBe('common.user.emailExist');
        }
      });

      it('should throw conflict error when userName already exists', async () => {
        // Reset mock to resolve for this test
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
        const userNameConflictRequest = { userId: 1, userName: 'existinguser' };
        const existingUserNameUser = { id: 2, userName: 'existinguser' };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(existingUserNameUser);

        try {
          await service.updateUserProfile(userNameConflictRequest);
          fail('Expected TypedRpcException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          // Business logic errors (like CONFLICT) are re-thrown as-is
          expect((error as TypedRpcException).getError().code).toBe(HTTP_ERROR_CODE.CONFLICT);
          expect((error as TypedRpcException).getError().message).toBe('common.user.userNameExist');
        }
      });

      it('should throw conflict error when phoneNumber already exists', async () => {
        // Reset mock to resolve for this test
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
        const phoneConflictRequest = { userId: 1, phoneNumber: '+84999888777' };
        const existingPhoneProfile = { userId: 2, phoneNumber: '+84999888777' };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(
          existingPhoneProfile,
        );

        try {
          await service.updateUserProfile(phoneConflictRequest);
          fail('Expected TypedRpcException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          // Business logic errors (like CONFLICT) are re-thrown as-is
          expect((error as TypedRpcException).getError().code).toBe(HTTP_ERROR_CODE.CONFLICT);
          expect((error as TypedRpcException).getError().message).toBe(
            'common.user.phoneNumberExist',
          );
        }
      });

      it('should allow same email/userName/phoneNumber for same user', async () => {
        // Reset mock to resolve for this test
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
        const sameDataRequest = {
          userId: 1,
          email: mockExistingUser.email,
          userName: mockExistingUser.userName,
          phoneNumber: mockExistingUser.profile.phoneNumber,
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: mockExistingUser,
          profile: mockExistingUser.profile,
        });

        const result = await service.updateUserProfile(sameDataRequest);

        expect(result).toBeDefined();
        expect(result.email).toBe(mockExistingUser.email);
        expect(result.userName).toBe(mockExistingUser.userName);
      });
    });

    describe('Error scenarios', () => {
      it('should throw NOT_FOUND error when user does not exist', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(service.updateUserProfile(mockUpdateUserProfileRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.updateUserProfile(mockUpdateUserProfileRequest);
          fail('Expected TypedRpcException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          // Business logic errors (like NOT_FOUND) are re-thrown as-is
          expect((error as TypedRpcException).getError().code).toBe(HTTP_ERROR_CODE.NOT_FOUND);
          expect((error as TypedRpcException).getError().message).toBe('common.user.notFound');
        }
      });

      it('should handle database connection errors', async () => {
        // Reset mock to resolve for this test
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockReset();
        mockValidateOrReject.mockResolvedValue(undefined);

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        const dbError = new Error('Database connection failed');
        (prismaMock.client.user.findUnique as jest.Mock).mockRejectedValue(dbError);

        await expect(service.updateUserProfile(mockUpdateUserProfileRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.updateUserProfile(mockUpdateUserProfileRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(
            HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          );
          expect((error as TypedRpcException).getError().message).toBe(
            'common.errors.internalServerError',
          );
        }
      });

      it('should handle transaction failures', async () => {
        // Reset mock to resolve for this test
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockReset();
        mockValidateOrReject.mockResolvedValue(undefined);
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);

        const transactionError = new Error('Transaction failed');
        (prismaMock.client.$transaction as jest.Mock).mockRejectedValue(transactionError);

        await expect(service.updateUserProfile(mockUpdateUserProfileRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.updateUserProfile(mockUpdateUserProfileRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(
            HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          );
          expect((error as TypedRpcException).getError().message).toBe(
            'common.errors.internalServerError',
          );
        }
      });

      it('should handle Prisma unique constraint errors', async () => {
        // Reset mock to resolve for this test
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockReset();
        mockValidateOrReject.mockResolvedValue(undefined);
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);

        const prismaError = {
          code: 'P2002',
          meta: { target: ['email'] },
          message: 'Unique constraint failed',
        };
        (prismaMock.client.$transaction as jest.Mock).mockRejectedValue(prismaError);

        await expect(service.updateUserProfile(mockUpdateUserProfileRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.updateUserProfile(mockUpdateUserProfileRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(
            HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          );
          expect((error as TypedRpcException).getError().message).toBe(
            'common.errors.internalServerError',
          );
        }
      });

      it('should handle non-Error exceptions', async () => {
        // Reset mock to resolve for this test
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockReset();
        mockValidateOrReject.mockResolvedValue(undefined);

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);

        const nonErrorException = 'String exception';
        (prismaMock.client.$transaction as jest.Mock).mockRejectedValue(nonErrorException);

        const mappedError = new TypedRpcException({
          code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'common.errors.internalServerError',
        });
        jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementation(() => {
          throw mappedError;
        });

        await expect(service.updateUserProfile(mockUpdateUserProfileRequest)).rejects.toThrow(
          new TypedRpcException({
            code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
            message: 'common.errors.internalServerError',
          }),
        );
      });
    });

    describe('Edge cases and transaction handling', () => {
      beforeEach(() => {
        // Reset validateOrReject mock to resolve by default for edge cases
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should handle undefined fields correctly (not update them)', async () => {
        const partialRequest = {
          userId: 1,
          name: 'Only Name Updated',
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.$transaction as jest.Mock).mockImplementation((callback) => {
          const mockTx = {
            user: {
              update: jest.fn().mockResolvedValue({
                ...mockExistingUser,
                name: 'Only Name Updated',
              }),
            },
            userProfile: {
              upsert: jest.fn().mockResolvedValue(mockUpdatedProfile),
            },
          };
          return Promise.resolve(callback(mockTx));
        });

        const result = await service.updateUserProfile(partialRequest);

        expect(result).toBeDefined();
        expect(result.name).toBe('Only Name Updated');
      });

      it('should verify correct transaction structure for user update', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);

        let transactionCallback: ((tx: unknown) => Promise<unknown>) | undefined;
        (prismaMock.client.$transaction as jest.Mock).mockImplementation((callback) => {
          transactionCallback = callback;
          const mockTx = {
            user: {
              update: jest.fn().mockResolvedValue(mockUpdatedUser),
            },
            userProfile: {
              upsert: jest.fn().mockResolvedValue(mockUpdatedProfile),
            },
          };
          return Promise.resolve(callback(mockTx));
        });

        await service.updateUserProfile(mockUpdateUserProfileRequest);

        expect(prismaMock.client.$transaction).toHaveBeenCalledTimes(1);
        const mockTransaction = prismaMock.client.$transaction as jest.Mock;
        const firstCall = mockTransaction.mock.calls[0] as unknown[];
        expect(typeof firstCall[0]).toBe('function');
        expect(transactionCallback).toBeDefined();
      });

      it('should handle large user ID values', async () => {
        const largeIdRequest = { ...mockUpdateUserProfileRequest, userId: 2147483647 };
        const userWithLargeId = { ...mockExistingUser, id: 2147483647 };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithLargeId);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: { ...mockUpdatedUser, id: 2147483647 },
          profile: mockUpdatedProfile,
        });

        const result = await service.updateUserProfile(largeIdRequest);

        expect(result).toBeDefined();
        expect(result.id).toBe(2147483647);
      });

      it('should handle concurrent update requests', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: mockUpdatedUser,
          profile: mockUpdatedProfile,
        });

        const promises = [
          service.updateUserProfile({ ...mockUpdateUserProfileRequest, name: 'Name 1' }),
          service.updateUserProfile({ ...mockUpdateUserProfileRequest, name: 'Name 2' }),
          service.updateUserProfile({ ...mockUpdateUserProfileRequest, name: 'Name 3' }),
        ];

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result).toBeDefined();
          expect(typeof result.id).toBe('number');
        });
      });
    });

    describe('Method signature and return type verification', () => {
      beforeEach(() => {
        // Reset validateOrReject mock to resolve by default for method verification
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should return correct UpdateUserProfileResponse structure', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: mockUpdatedUser,
          profile: mockUpdatedProfile,
        });

        const result = await service.updateUserProfile(mockUpdateUserProfileRequest);

        // Verify main user fields
        expect(typeof result.id).toBe('number');
        expect(typeof result.name).toBe('string');
        expect(typeof result.userName).toBe('string');
        expect(result.email === null || typeof result.email === 'string').toBe(true);
        expect(result.imageUrl === null || typeof result.imageUrl === 'string').toBe(true);
        expect(result.updatedAt === null || result.updatedAt instanceof Date).toBe(true);

        // Verify profile structure
        expect(result.profile).toBeDefined();
        expect(typeof result.profile!.id).toBe('number');
        expect(
          result.profile!.address === null || typeof result.profile!.address === 'string',
        ).toBe(true);
        expect(
          result.profile!.phoneNumber === null || typeof result.profile!.phoneNumber === 'string',
        ).toBe(true);
        expect(
          result.profile!.dateOfBirth === null || result.profile!.dateOfBirth instanceof Date,
        ).toBe(true);
        expect(
          result.profile!.updatedAt === null || result.profile!.updatedAt instanceof Date,
        ).toBe(true);
      });

      it('should verify method accepts UpdateUserProfileRequest and returns Promise<UpdateUserProfileResponse>', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockExistingUser);
        (prismaMock.client.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.userProfile.findFirst as jest.Mock).mockResolvedValue(null);
        (prismaMock.client.$transaction as jest.Mock).mockResolvedValue({
          user: mockUpdatedUser,
          profile: mockUpdatedProfile,
        });

        const methodResult = service.updateUserProfile(mockUpdateUserProfileRequest);

        expect(methodResult).toBeInstanceOf(Promise);
        const result = await methodResult;
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });
  });

  describe('updatePassword', () => {
    const mockUpdatePasswordRequest: UpdatePasswordRequest = {
      userId: 1,
      currentPassword: 'currentPassword123',
      newPassword: 'newPassword456',
      confirmPassword: 'newPassword456',
    };

    const mockUserWithLocalAuth = {
      id: 1,
      userName: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      imageUrl: null,
      status: 'ACTIVE',
      deletedAt: null,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      roleId: 1,
      authProviders: [
        {
          id: 1,
          userId: 1,
          provider: Provider.LOCAL,
          providerId: null,
          password: 'hashedCurrentPassword',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
      ],
    };

    const mockUpdatedUser = {
      id: 1,
      userName: 'testuser',
      email: 'test@example.com',
      updatedAt: new Date('2023-01-02'),
    };

    describe('Successful scenarios', () => {
      beforeEach(() => {
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should successfully update password', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithLocalAuth);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prismaMock.client.authProvider.update as jest.Mock).mockResolvedValue({});
        (prismaMock.client.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

        const result = await service.updatePassword(mockUpdatePasswordRequest);

        expect(result).toEqual({
          id: mockUpdatedUser.id,
          userName: mockUpdatedUser.userName,
          email: mockUpdatedUser.email,
          updatedAt: mockUpdatedUser.updatedAt,
          message: 'common.user.passwordUpdatedSuccessfully',
        });

        expect(prismaMock.client.user.findUnique).toHaveBeenCalledWith({
          where: { id: 1, deletedAt: null },
          include: { authProviders: { where: { provider: Provider.LOCAL } } },
        });
        expect(bcrypt.compare).toHaveBeenCalledWith('currentPassword123', 'hashedCurrentPassword');
        expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 10);
        expect(prismaMock.client.authProvider.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { password: 'hashedNewPassword' },
        });
      });

      it('should handle user with multiple auth providers', async () => {
        const userWithMultipleProviders = {
          ...mockUserWithLocalAuth,
          authProviders: [
            ...mockUserWithLocalAuth.authProviders,
            {
              id: 2,
              userId: 1,
              provider: Provider.FACEBOOK,
              providerId: 'facebook123',
              password: null,
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-01-01'),
            },
          ],
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(
          userWithMultipleProviders,
        );
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prismaMock.client.authProvider.update as jest.Mock).mockResolvedValue({});
        (prismaMock.client.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

        const result = await service.updatePassword(mockUpdatePasswordRequest);

        expect(result.id).toBe(1);
        expect(result.message).toBe('common.user.passwordUpdatedSuccessfully');
      });
    });

    describe('Validation scenarios', () => {
      it('should throw validation error when DTO validation fails', async () => {
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        const validationError = new Error('Validation failed');
        mockValidateOrReject.mockRejectedValue(validationError);

        await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
          validationError,
        );
      });

      it('should throw BAD_REQUEST when passwords do not match', async () => {
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);

        const mismatchRequest = {
          ...mockUpdatePasswordRequest,
          confirmPassword: 'differentPassword',
        };

        try {
          await service.updatePassword(mismatchRequest);
          fail('Expected TypedRpcException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(HTTP_ERROR_CODE.BAD_REQUEST);
          expect((error as TypedRpcException).getError().message).toBe(
            'common.validation.passwordMismatch',
          );
        }
      });
    });

    describe('Error scenarios', () => {
      beforeEach(() => {
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should throw NOT_FOUND when user does not exist', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.updatePassword(mockUpdatePasswordRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(HTTP_ERROR_CODE.NOT_FOUND);
          expect((error as TypedRpcException).getError().message).toBe('common.user.notFound');
        }
      });

      it('should throw BAD_REQUEST when user has no local auth provider', async () => {
        const userWithoutLocal = {
          ...mockUserWithLocalAuth,
          authProviders: [],
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithoutLocal);

        const expectedError = new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.user.noLocalPassword',
        });
        jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementation(() => {
          throw expectedError;
        });

        await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
          new TypedRpcException({
            code: HTTP_ERROR_CODE.BAD_REQUEST,
            message: 'common.user.noLocalPassword',
          }),
        );
      });

      it('should throw BAD_REQUEST when local auth provider has no password', async () => {
        const userWithNullPassword = {
          ...mockUserWithLocalAuth,
          authProviders: [
            {
              ...mockUserWithLocalAuth.authProviders[0],
              password: null,
            },
          ],
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithNullPassword);

        await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
          new TypedRpcException({
            code: HTTP_ERROR_CODE.BAD_REQUEST,
            message: 'common.user.noLocalPassword',
          }),
        );
      });

      it('should throw UNAUTHORIZED when current password is invalid', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithLocalAuth);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.updatePassword(mockUpdatePasswordRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(HTTP_ERROR_CODE.UNAUTHORIZED);
          expect((error as TypedRpcException).getError().message).toBe(
            'common.user.invalidCurrentPassword',
          );
        }
      });

      it('should handle database connection errors', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        const dbError = new Error('Database connection failed');
        (prismaMock.client.user.findUnique as jest.Mock).mockRejectedValue(dbError);

        await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
          TypedRpcException,
        );

        try {
          await service.updatePassword(mockUpdatePasswordRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(TypedRpcException);
          expect((error as TypedRpcException).getError().code).toBe(
            HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          );
          expect((error as TypedRpcException).getError().message).toBe(
            'common.errors.internalServerError',
          );
        }
      });

      it('should handle bcrypt errors', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithLocalAuth);
        const bcryptError = new Error('Bcrypt error');
        (bcrypt.compare as jest.Mock).mockRejectedValue(bcryptError);

        const mappedError = new TypedRpcException({
          code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'common.errors.internalServerError',
        });
        jest.spyOn(prismaClientError, 'handlePrismaError').mockImplementation(() => {
          throw mappedError;
        });

        await expect(service.updatePassword(mockUpdatePasswordRequest)).rejects.toThrow(
          TypedRpcException,
        );
      });
    });

    describe('Edge cases and business logic', () => {
      beforeEach(() => {
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should handle null email correctly', async () => {
        const userWithNullEmail = {
          ...mockUserWithLocalAuth,
          email: null,
        };
        const updatedUserWithNullEmail = {
          ...mockUpdatedUser,
          email: null,
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithNullEmail);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prismaMock.client.authProvider.update as jest.Mock).mockResolvedValue({});
        (prismaMock.client.user.update as jest.Mock).mockResolvedValue(updatedUserWithNullEmail);

        const result = await service.updatePassword(mockUpdatePasswordRequest);

        expect(result.email).toBeNull();
        expect(result.id).toBe(1);
      });

      it('should handle different user ID types correctly', async () => {
        const largeUserId = 2147483647; // Max 32-bit integer
        const requestWithLargeId = {
          ...mockUpdatePasswordRequest,
          userId: largeUserId,
        };
        const userWithLargeId = {
          ...mockUserWithLocalAuth,
          id: largeUserId,
        };

        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(userWithLargeId);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prismaMock.client.authProvider.update as jest.Mock).mockResolvedValue({});
        (prismaMock.client.user.update as jest.Mock).mockResolvedValue({
          ...mockUpdatedUser,
          id: largeUserId,
        });

        const result = await service.updatePassword(requestWithLargeId);

        expect(result.id).toBe(largeUserId);
        expect(prismaMock.client.user.findUnique).toHaveBeenCalledWith({
          where: { id: largeUserId, deletedAt: null },
          include: { authProviders: { where: { provider: Provider.LOCAL } } },
        });
      });

      it('should verify correct salt rounds for bcrypt', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithLocalAuth);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prismaMock.client.authProvider.update as jest.Mock).mockResolvedValue({});
        (prismaMock.client.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

        await service.updatePassword(mockUpdatePasswordRequest);

        expect(bcrypt.hash).toHaveBeenCalledWith('newPassword456', 10);
      });

      it('should handle concurrent password update requests', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithLocalAuth);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prismaMock.client.authProvider.update as jest.Mock).mockResolvedValue({});
        (prismaMock.client.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

        const promises = [
          service.updatePassword({ ...mockUpdatePasswordRequest, userId: 1 }),
          service.updatePassword({ ...mockUpdatePasswordRequest, userId: 2 }),
          service.updatePassword({ ...mockUpdatePasswordRequest, userId: 3 }),
        ];

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result).toBeDefined();
          expect(typeof result.id).toBe('number');
          expect(result.message).toBe('common.user.passwordUpdatedSuccessfully');
        });
      });
    });

    describe('Method signature and return type verification', () => {
      beforeEach(() => {
        const mockValidateOrReject = classValidator.validateOrReject as jest.Mock;
        mockValidateOrReject.mockResolvedValue(undefined);
      });

      it('should return correct UpdatePasswordResponse structure', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithLocalAuth);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prismaMock.client.authProvider.update as jest.Mock).mockResolvedValue({});
        (prismaMock.client.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

        const result = await service.updatePassword(mockUpdatePasswordRequest);

        expect(typeof result.id).toBe('number');
        expect(typeof result.userName).toBe('string');
        expect(result.email === null || typeof result.email === 'string').toBe(true);
        expect(result.updatedAt === null || result.updatedAt instanceof Date).toBe(true);
        expect(typeof result.message).toBe('string');
      });

      it('should verify method accepts UpdatePasswordRequest and returns Promise<UpdatePasswordResponse>', async () => {
        const prismaMock = moduleRef.get<PrismaService<PrismaClient>>(PrismaService);
        (prismaMock.client.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithLocalAuth);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
        (prismaMock.client.authProvider.update as jest.Mock).mockResolvedValue({});
        (prismaMock.client.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

        const methodResult = service.updatePassword(mockUpdatePasswordRequest);

        expect(methodResult).toBeInstanceOf(Promise);
        const result = await methodResult;
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });
    });
  });

  describe('cleanupInactiveUsers', () => {
    const mockNow = new Date('2024-01-15T10:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockNow);
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should successfully cleanup inactive users', async () => {
      // Arrange
      const mockInactiveUsers = [
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          createdAt: new Date('2024-01-12T10:00:00.000Z'),
        },
        {
          id: 2,
          name: 'User 2',
          email: 'user2@example.com',
          createdAt: new Date('2024-01-11T10:00:00.000Z'),
        },
      ];

      const mockDeleteResult = { count: 2 };

      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue(mockInactiveUsers);
      mockClient.user.updateMany.mockResolvedValue(mockDeleteResult);

      const loggerService = moduleRef.get(CustomLogger);
      const logSpy = jest.spyOn(loggerService, 'log');

      // Act
      const result = await service.cleanupInactiveUsers();

      // Assert
      expect(result).toEqual({
        deletedCount: 2,
        message:
          'Đã xóa 2 user hết hạn khỏi bảng. Chi tiết: ID: 1, Email: user1@example.com, Tạo lúc: 2024-01-12T10:00:00.000Z; ID: 2, Email: user2@example.com, Tạo lúc: 2024-01-11T10:00:00.000Z',
      });

      expect(mockClient.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: false,
          createdAt: {
            lt: expect.any(Date),
          },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      expect(mockClient.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1, 2],
          },
        },
        data: {
          deletedAt: mockNow,
        },
      });

      expect(logSpy).toHaveBeenCalledWith(
        '🔄 Cleanup inactive users bắt đầu chạy lúc: ' + mockNow.toISOString(),
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Đã xóa 2 user hết hạn khỏi bảng. Chi tiết: ID: 1, Email: user1@example.com, Tạo lúc: 2024-01-12T10:00:00.000Z; ID: 2, Email: user2@example.com, Tạo lúc: 2024-01-11T10:00:00.000Z',
      );
    });

    it('should handle case when no inactive users found', async () => {
      // Arrange
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue([]);

      const loggerService = moduleRef.get(CustomLogger);
      const logSpy = jest.spyOn(loggerService, 'log');

      // Act
      const result = await service.cleanupInactiveUsers();

      // Assert
      expect(result).toEqual({
        deletedCount: 0,
        message: 'Không có user nào cần xóa.',
      });

      expect(mockClient.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: false,
          createdAt: {
            lt: expect.any(Date),
          },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      expect(mockClient.user.updateMany).not.toHaveBeenCalled();

      expect(logSpy).toHaveBeenCalledWith(
        '🔄 Cleanup inactive users bắt đầu chạy lúc: ' + mockNow.toISOString(),
      );
      expect(logSpy).toHaveBeenCalledWith('Không có user nào cần xóa.');
    });

    it('should handle users with null email', async () => {
      // Arrange
      const mockInactiveUsers = [
        {
          id: 1,
          name: 'User 1',
          email: null,
          createdAt: new Date('2024-01-12T10:00:00.000Z'),
        },
        {
          id: 2,
          name: 'User 2',
          email: 'user2@example.com',
          createdAt: new Date('2024-01-11T10:00:00.000Z'),
        },
      ];

      const mockDeleteResult = { count: 2 };

      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue(mockInactiveUsers);
      mockClient.user.updateMany.mockResolvedValue(mockDeleteResult);

      const loggerService = moduleRef.get(CustomLogger);
      const logSpy = jest.spyOn(loggerService, 'log');

      // Act
      const result = await service.cleanupInactiveUsers();

      // Assert
      expect(result).toEqual({
        deletedCount: 2,
        message:
          'Đã xóa 2 user hết hạn khỏi bảng. Chi tiết: ID: 1, Email: N/A, Tạo lúc: 2024-01-12T10:00:00.000Z; ID: 2, Email: user2@example.com, Tạo lúc: 2024-01-11T10:00:00.000Z',
      });

      expect(logSpy).toHaveBeenCalledWith(
        'Đã xóa 2 user hết hạn khỏi bảng. Chi tiết: ID: 1, Email: N/A, Tạo lúc: 2024-01-12T10:00:00.000Z; ID: 2, Email: user2@example.com, Tạo lúc: 2024-01-11T10:00:00.000Z',
      );
    });

    it('should handle single user cleanup', async () => {
      // Arrange
      const mockInactiveUsers = [
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          createdAt: new Date('2024-01-12T10:00:00.000Z'),
        },
      ];

      const mockDeleteResult = { count: 1 };

      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue(mockInactiveUsers);
      mockClient.user.updateMany.mockResolvedValue(mockDeleteResult);

      const loggerService = moduleRef.get(CustomLogger);
      const logSpy = jest.spyOn(loggerService, 'log');

      // Act
      const result = await service.cleanupInactiveUsers();

      // Assert
      expect(result).toEqual({
        deletedCount: 1,
        message:
          'Đã xóa 1 user hết hạn khỏi bảng. Chi tiết: ID: 1, Email: user1@example.com, Tạo lúc: 2024-01-12T10:00:00.000Z',
      });

      expect(mockClient.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1],
          },
        },
        data: {
          deletedAt: mockNow,
        },
      });

      expect(logSpy).toHaveBeenCalledWith(
        'Đã xóa 1 user hết hạn khỏi bảng. Chi tiết: ID: 1, Email: user1@example.com, Tạo lúc: 2024-01-12T10:00:00.000Z',
      );
    });

    it('should handle large number of users', async () => {
      // Arrange
      const mockInactiveUsers = Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        name: `User ${index + 1}`,
        email: `user${index + 1}@example.com`,
        createdAt: new Date('2024-01-12T10:00:00.000Z'),
      }));

      const mockDeleteResult = { count: 100 };

      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue(mockInactiveUsers);
      mockClient.user.updateMany.mockResolvedValue(mockDeleteResult);

      // Act
      const result = await service.cleanupInactiveUsers();

      // Assert
      expect(result.deletedCount).toBe(100);
      expect(result.message).toContain('Đã xóa 100 user hết hạn khỏi bảng');

      const expectedUserIds = Array.from({ length: 100 }, (_, index) => index + 1);
      expect(mockClient.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: expectedUserIds,
          },
        },
        data: {
          deletedAt: mockNow,
        },
      });
    });

    it('should handle database error during findMany', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockRejectedValue(mockError);

      const loggerService = moduleRef.get(CustomLogger);
      const errorSpy = jest.spyOn(loggerService, 'error');

      // Act & Assert
      await expect(service.cleanupInactiveUsers()).rejects.toThrow(TypedRpcException);

      expect(errorSpy).toHaveBeenCalledWith(
        'Lỗi khi xóa user hết hạn:',
        'Error: Database connection failed',
      );

      try {
        await service.cleanupInactiveUsers();
      } catch (error) {
        expect(error).toBeInstanceOf(TypedRpcException);
        const rpcError = error as TypedRpcException;
        expect(rpcError.getError()).toEqual({
          code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
          message: 'common.errors.internalServerError',
        });
      }
    });

    it('should handle database error during updateMany', async () => {
      // Arrange
      const mockInactiveUsers = [
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          createdAt: new Date('2024-01-12T10:00:00.000Z'),
        },
      ];

      const mockError = new Error('Update operation failed');
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue(mockInactiveUsers);
      mockClient.user.updateMany.mockRejectedValue(mockError);

      const loggerService = moduleRef.get(CustomLogger);
      const errorSpy = jest.spyOn(loggerService, 'error');

      // Act & Assert
      await expect(service.cleanupInactiveUsers()).rejects.toThrow(TypedRpcException);

      expect(errorSpy).toHaveBeenCalledWith(
        'Lỗi khi xóa user hết hạn:',
        'Error: Update operation failed',
      );
    });

    it('should handle non-Error exception', async () => {
      // Arrange
      const mockError = 'String error message';
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockRejectedValue(mockError);

      const loggerService = moduleRef.get(CustomLogger);
      const errorSpy = jest.spyOn(loggerService, 'error');

      // Act & Assert
      await expect(service.cleanupInactiveUsers()).rejects.toThrow(TypedRpcException);

      expect(errorSpy).toHaveBeenCalledWith('Lỗi khi xóa user hết hạn:', 'String error message');
    });

    it('should handle null error', async () => {
      // Arrange
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockRejectedValue(null);

      const loggerService = moduleRef.get(CustomLogger);
      const errorSpy = jest.spyOn(loggerService, 'error');

      // Act & Assert
      await expect(service.cleanupInactiveUsers()).rejects.toThrow(TypedRpcException);

      expect(errorSpy).toHaveBeenCalledWith('Lỗi khi xóa user hết hạn:', 'null');
    });

    it('should handle undefined error', async () => {
      // Arrange
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockRejectedValue(undefined);

      const loggerService = moduleRef.get(CustomLogger);
      const errorSpy = jest.spyOn(loggerService, 'error');

      // Act & Assert
      await expect(service.cleanupInactiveUsers()).rejects.toThrow(TypedRpcException);

      expect(errorSpy).toHaveBeenCalledWith('Lỗi khi xóa user hết hạn:', 'undefined');
    });

    it('should use correct date calculation for two days ago', async () => {
      // Arrange
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue([]);

      // Act
      await service.cleanupInactiveUsers();

      // Assert
      const expectedTwoDaysAgo = new Date(mockNow.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(mockClient.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: false,
          createdAt: {
            lt: expectedTwoDaysAgo,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });
    });

    it('should handle users with different creation dates', async () => {
      // Arrange
      const mockInactiveUsers = [
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          createdAt: new Date('2024-01-10T08:30:15.123Z'),
        },
        {
          id: 2,
          name: 'User 2',
          email: 'user2@example.com',
          createdAt: new Date('2024-01-09T23:59:59.999Z'),
        },
      ];

      const mockDeleteResult = { count: 2 };

      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue(mockInactiveUsers);
      mockClient.user.updateMany.mockResolvedValue(mockDeleteResult);

      // Act
      const result = await service.cleanupInactiveUsers();

      // Assert
      expect(result.message).toContain(
        'ID: 1, Email: user1@example.com, Tạo lúc: 2024-01-10T08:30:15.123Z',
      );
      expect(result.message).toContain(
        'ID: 2, Email: user2@example.com, Tạo lúc: 2024-01-09T23:59:59.999Z',
      );
    });

    it('should verify return type structure', async () => {
      // Arrange
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.cleanupInactiveUsers();

      // Assert
      expect(result).toHaveProperty('deletedCount');
      expect(result).toHaveProperty('message');
      expect(typeof result.deletedCount).toBe('number');
      expect(typeof result.message).toBe('string');
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('should handle concurrent cleanup operations', async () => {
      // Arrange
      const mockInactiveUsers = [
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          createdAt: new Date('2024-01-12T10:00:00.000Z'),
        },
      ];

      const mockDeleteResult = { count: 1 };

      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue(mockInactiveUsers);
      mockClient.user.updateMany.mockResolvedValue(mockDeleteResult);

      // Act - Run multiple cleanup operations concurrently
      const promises = [
        service.cleanupInactiveUsers(),
        service.cleanupInactiveUsers(),
        service.cleanupInactiveUsers(),
      ];

      const results = await Promise.all(promises);

      // Assert
      results.forEach((result) => {
        expect(result).toEqual({
          deletedCount: 1,
          message:
            'Đã xóa 1 user hết hạn khỏi bảng. Chi tiết: ID: 1, Email: user1@example.com, Tạo lúc: 2024-01-12T10:00:00.000Z',
        });
      });

      expect(mockClient.user.findMany).toHaveBeenCalledTimes(3);
      expect(mockClient.user.updateMany).toHaveBeenCalledTimes(3);
    });

    it('should verify method signature and return type', async () => {
      // Arrange
      const mockPrismaService = moduleRef.get(PrismaService);
      const mockClient = mockPrismaService.client as any;
      mockClient.user.findMany.mockResolvedValue([]);

      // Act
      const methodResult = service.cleanupInactiveUsers();

      // Assert
      expect(methodResult).toBeInstanceOf(Promise);

      const result = await methodResult;
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('deletedCount');
      expect(result).toHaveProperty('message');
    });
  });
});
