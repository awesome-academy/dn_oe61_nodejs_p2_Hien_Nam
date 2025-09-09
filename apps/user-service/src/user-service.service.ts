import { CreateUserDto } from '@app/common/dto/user/create-user.dto';
import { ProfileFacebookUser } from '@app/common/dto/user/requests/facebook-user-dto.request';
import { GetUserProfileRequest } from '@app/common/dto/user/requests/get-user-profile.request';
import { UpdatePasswordRequest } from '@app/common/dto/user/requests/update-password.request';
import { UpdateUserProfileRequest } from '@app/common/dto/user/requests/update-user-profile.request';
import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserCreationRequest } from '@app/common/dto/user/requests/user-creation.request';
import { UserUpdateRoleRequest } from '@app/common/dto/user/requests/user-update-role.request';
import { UserUpdateStatusRequest } from '@app/common/dto/user/requests/user-update-status.request';
import { UpdatePasswordResponse } from '@app/common/dto/user/responses/update-password.response';
import { UpdateUserProfileResponse } from '@app/common/dto/user/responses/update-user-profile.response';
import { UserCreationResponse } from '@app/common/dto/user/responses/user-creation.response';
import { UserProfileResponse } from '@app/common/dto/user/responses/user-profile.response';
import { UserSummaryResponse } from '@app/common/dto/user/responses/user-summary.response';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';
import { RoleEnum } from '@app/common/enums/role.enum';
import { StatusKey } from '@app/common/enums/status-key.enum';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { BaseResponse } from '@app/common/interfaces/data-type';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { handlePrismaError } from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { randomUUID } from 'crypto';
import {
  AuthProvider,
  Prisma,
  PrismaClient,
  Provider,
  Role,
  User,
  UserProfile,
} from '../generated/prisma';
import { INCLUDE_AUTH_PROVIDER_USER } from './constants/include-auth-user';
import { SoftDeleteUserRequest } from '@app/common/dto/user/requests/soft-delete-user.request';
import { SoftDeleteUserResponse } from '@app/common/dto/user/responses/soft-delete-user.response';
import { buildBaseResponse } from '@app/common/utils/data.util';
import { DeleteSoftCartRequest } from '@app/common/dto/product/requests/delete-soft-cart.request';
import { ProductProducer } from './producer/product.producer';
import { validateDto } from '@app/common/helpers/validation.helper';
import { AdminInfoResponse } from '@app/common/dto/user/responses/admin-info.response';
@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService<PrismaClient>,
    private readonly loggerService: CustomLogger,
    private readonly configService: ConfigService,
    private readonly productProducer: ProductProducer,
  ) {}
  async getUserByEmail(dto: UserByEmailRequest): Promise<UserResponse | null> {
    const userFindByEmail = await this.prismaService.client.user.findUnique({
      where: { email: dto.email },
      include: {
        role: true,
        authProviders: true,
      },
    });
    if (!userFindByEmail) {
      return null;
    }
    return {
      id: userFindByEmail.id,
      name: userFindByEmail.name,
      userName: userFindByEmail.userName,
      email: userFindByEmail.email,
      imageUrl: userFindByEmail.imageUrl ?? '',
      createdAt: userFindByEmail.createdAt,
      updatedAt: userFindByEmail.updatedAt,
      deletedAt: userFindByEmail.deletedAt,
      role: userFindByEmail.role.name,
      status: userFindByEmail.status,
      authProviders: userFindByEmail.authProviders,
    };
  }
  async findOrCreateUserFromFacebook(profile: ProfileFacebookUser): Promise<UserResponse> {
    await validateDto(ProfileFacebookUser, profile);
    const hasEmail = !!profile.email;
    let userByEmail: UserResponse | null = null;
    const providerDetail = await this.prismaService.client.authProvider.findUnique({
      where: { providerId: profile.providerId, provider: Provider.FACEBOOK },
      include: INCLUDE_AUTH_PROVIDER_USER,
    });
    if (providerDetail) {
      return this.mapUserFromAuthProvider(providerDetail);
    }
    if (hasEmail) {
      const emailRequest: UserByEmailRequest = {
        email: profile?.email ?? '',
      };
      userByEmail = await this.getUserByEmail(emailRequest);
    }
    if (!userByEmail) {
      const fullName = `${profile.firstName} ${profile.lastName}`;
      const userName = this.generateUserName(
        profile.lastName || profile.firstName || profile.providerId,
      );
      const userData: Prisma.UserCreateInput = {
        name: fullName,
        userName,
        email: profile.email,
        imageUrl: '',
        role: {
          connect: {
            name: RoleEnum.USER,
          },
        },
      };
      try {
        const authProviderCreated = await this.prismaService.client.$transaction(async (tx) => {
          const userCreated = await tx.user.create({
            data: userData,
          });
          return tx.authProvider.create({
            data: {
              provider: Provider.FACEBOOK,
              providerId: profile.providerId,
              user: {
                connect: {
                  id: userCreated.id,
                },
              },
            },
            include: INCLUDE_AUTH_PROVIDER_USER,
          });
        });
        return this.mapUserFromAuthProvider(authProviderCreated);
      } catch (error) {
        return handlePrismaError(
          error,
          UserService.name,
          'findOrCreateUserFromFacebook',
          this.loggerService,
        );
      }
    }
    const facebookProvider = userByEmail.authProviders?.find(
      (p) => p.provider === Provider.FACEBOOK,
    );
    if (!facebookProvider) {
      const authProviderFacebookData: Prisma.AuthProviderCreateInput = {
        provider: Provider.FACEBOOK,
        providerId: profile.providerId,
        user: {
          connect: {
            id: userByEmail.id,
          },
        },
      };
      try {
        const authProviderFacebookCreated = await this.prismaService.client.authProvider.create({
          data: authProviderFacebookData,
          include: INCLUDE_AUTH_PROVIDER_USER,
        });
        return this.mapUserFromAuthProvider(authProviderFacebookCreated);
      } catch (error) {
        return handlePrismaError(
          error,
          UserService.name,
          'findOrCreateUserFromFacebook',
          this.loggerService,
        );
      }
    }
    return userByEmail;
  }
  async create(dto: UserCreationRequest): Promise<BaseResponse<UserCreationResponse>> {
    await validateOrReject(Object.assign(new UserCreationRequest(), dto));
    if (dto?.phone) {
      const userByPhone = await this.prismaService.client.userProfile.findFirst({
        where: {
          phoneNumber: dto.phone,
        },
      });
      if (userByPhone) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.CONFLICT,
          message: 'common.user.phoneNumberExist',
        });
      }
    }
    if (dto?.email) {
      const userByEmail = await this.prismaService.client.user.findUnique({
        where: {
          email: dto.email,
        },
      });
      if (userByEmail) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.CONFLICT,
          message: 'common.user.emailExist',
        });
      }
    }
    const userName = this.generateUserName(dto.name);
    if (!dto?.imageUrl) {
      dto.imageUrl = this.configService.get<string>('user.avatarDefault');
    }
    const userData: Prisma.UserCreateInput = {
      name: dto.name,
      userName: userName,
      email: dto.email,
      imageUrl: dto.imageUrl,
      role: {
        connect: {
          name: dto.role,
        },
      },
    };
    try {
      const created = await this.prismaService.client.$transaction(async (tx) => {
        const userCreated = await tx.user.create({
          data: userData,
          include: {
            role: true,
          },
        });
        const authProviderCreated = await tx.authProvider.create({
          data: {
            provider: Provider.LOCAL,
            providerId: null,
            user: {
              connect: {
                id: userCreated.id,
              },
            },
            password: await this.hashPassword(dto.password),
          },
        });
        const profileCreated = await tx.userProfile.create({
          data: {
            userId: userCreated.id,
            ...(dto.phone && { phoneNumber: dto.phone }),
            ...(dto.address && { address: dto.address }),
            ...(dto.dateOfBirth && { dob: dto.dateOfBirth }),
          },
        });
        return { user: userCreated, authProvider: authProviderCreated, profile: profileCreated };
      });
      return {
        statusKey: StatusKey.SUCCESS,
        data: {
          id: created.user.id,
          name: created.user.name,
          userName: created.user.userName,
          email: created.user.email,
          imageUrl: created.user.imageUrl,
          phone: created.profile.phoneNumber,
          address: created.profile.address,
          dateOfBirth: created.profile.dob,
          role: created.user.role.name,
          createdAt: created.user.createdAt,
        },
      };
    } catch (error) {
      return handlePrismaError(error, UserService.name, 'create', this.loggerService);
    }
  }
  private mapUserFromAuthProvider(
    authProvider: AuthProvider & { user: User & { role: Role; authProviders?: AuthProvider[] } },
  ): UserResponse {
    return {
      id: authProvider.user.id,
      name: authProvider.user.name,
      userName: authProvider.user.userName,
      email: authProvider.user.email,
      imageUrl: authProvider.user.imageUrl ?? '',
      createdAt: authProvider.user.createdAt,
      updatedAt: authProvider.user.updatedAt,
      deletedAt: authProvider.user.deletedAt,
      role: authProvider.user.role.name,
      status: authProvider.user.status,
      authProviders: authProvider.user.authProviders,
    };
  }
  private generateUserName(name: string) {
    const normalizeName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const shortId = randomUUID().replace(/-/g, '').slice(0, 4);
    const userName = `${normalizeName}@${shortId}`;
    return userName;
  }

  async checkUserExists(providerId: string): Promise<UserResponse | null> {
    if (!providerId) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.auth.action.checkUserExists.error',
      });
    }

    const authProvider = await this.prismaService.client.authProvider.findFirst({
      where: { providerId: providerId },
      include: {
        user: {
          include: {
            role: true,
            authProviders: true,
          },
        },
      },
    });

    if (!authProvider || !authProvider.user) {
      return null;
    }

    const { user } = authProvider;

    const formatData: UserResponse = {
      id: user.id,
      name: user.name,
      userName: user.userName,
      email: user.email ?? undefined,
      providerName: authProvider.provider,
      imageUrl: user.imageUrl ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt ?? undefined,
      deletedAt: user.deletedAt,
      role: user.role?.name,
      status: user.status,
      authProviders: user.authProviders || undefined,
    };

    return formatData;
  }

  async getRole() {
    try {
      const role = await this.prismaService.client.role.findUnique({
        where: { name: RoleEnum.USER },
      });
      return role;
    } catch {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async validateOAuthUserCreation(data: CreateUserDto): Promise<UserResponse | null> {
    const dto = plainToInstance(CreateUserDto, data);
    await validateOrReject(dto);
    const existingUser = await this.checkUserExists(data.providerId as string);
    if (existingUser) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.CONFLICT,
        message: 'common.errors.createUser.exists',
      });
    }

    const role = await this.getRole();
    if (!role) {
      throw new RpcException('common.errors.createUser.roleNotFound');
    }

    return await this.createUser(data, role.id);
  }

  async createUser(data: CreateUserDto, role: number): Promise<UserResponse | null> {
    try {
      const dataUser = await this.prismaService.client.user.create({
        data: {
          name: data.name,
          userName: data.userName,
          email: data.email,
          isActive: data.isActive ?? false,
          role: {
            connect: { id: role },
          },
          authProviders: {
            create: [
              {
                provider: data.provider as Provider,
                providerId: data.providerId,
                password: data.password,
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

      const result: UserResponse = {
        id: dataUser.id,
        name: dataUser.name,
        userName: dataUser.userName,
        role: (dataUser.role as { name: string }).name,
        status: dataUser.status,
        email: dataUser.email ?? undefined,
        providerName: data.provider,
        deletedAt: dataUser.deletedAt,
      };

      return result;
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }

      this.loggerService.error(
        'createUser',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async createUserWithPassword(data: CreateUserDto): Promise<UserResponse | null> {
    const dto = plainToInstance(CreateUserDto, data);
    await validateOrReject(dto);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    const role = await this.getRole();
    if (!role) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.createUser.roleNotFound',
      });
    }
    const result = await this.createUser(dto, role.id);
    if (!result) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.createUser.error',
      });
    }

    const dataUser: UserResponse = {
      id: result.id,
      name: result.name,
      userName: result.userName,
      status: result.status,
      email: result.email ?? undefined,
      deletedAt: result.deletedAt,
      role: result.role,
    };

    return dataUser;
  }

  private async checkUserIsActive(user: UserResponse) {
    return await this.prismaService.client.user.findFirst({
      where: { email: user.email, isActive: false },
      include: { role: true, authProviders: true },
    });
  }

  async changeIsActive(user: UserResponse): Promise<UserResponse | null> {
    if (!user || !user.email) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.changeIsActive.invalidPayload',
      });
    }

    const existingUser = await this.checkUserIsActive(user);
    if (!existingUser) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.errors.changeIsActive.alreadyActive',
      });
    }

    try {
      const updated = await this.prismaService.client.user.update({
        where: { id: existingUser.id },
        data: { isActive: true },
        include: { role: true, authProviders: true },
      });

      const result: UserResponse = {
        id: updated.id,
        name: updated.name,
        userName: updated.userName,
        email: updated.email ?? undefined,
        role: updated.role.name,
        status: updated.status,
        deletedAt: updated.deletedAt,
        authProviders: updated.authProviders,
      };

      return result;
    } catch (error) {
      this.loggerService.error(
        'ChangeIsActive',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }
  async hashPassword(rawPassword: string, saltRound: number = 10): Promise<string> {
    return await bcrypt.hash(rawPassword, saltRound);
  }
  async updateRoles(dto: UserUpdateRoleRequest): Promise<BaseResponse<UserSummaryResponse[] | []>> {
    const dtoInstance = plainToInstance(UserUpdateRoleRequest, dto);
    await validateOrReject(dtoInstance);
    const userIds = dto.users.map((user) => user.userId);
    const existingUsers = await this.prismaService.client.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });
    const existingIds = existingUsers.map((u) => u.id);
    const notFoundIds = userIds.filter((id) => !existingIds.includes(id));
    if (notFoundIds.length > 0) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.user.someUserNotExist',
        args: {
          missingIds: notFoundIds.join(', '),
        },
      });
    }
    const usersToUpdate = dto.users.filter((user) => {
      const found = existingUsers.find((u) => u.id === user.userId);
      return found && found.role.name !== user.role.toString();
    });
    if (usersToUpdate.length === 0) {
      return {
        statusKey: StatusKey.UNCHANGED,
        data: [],
      };
    }
    try {
      const updateRolesPromise = dto.users.map((user) =>
        this.prismaService.client.user.update({
          where: { id: user.userId },
          data: { role: { connect: { name: user.role } } },
          include: {
            role: true,
            profile: true,
          },
        }),
      );
      const updatedUsers = await this.prismaService.client.$transaction(updateRolesPromise);
      const mappedUsers = updatedUsers.map((user) => this.mapToUserSummaryResponse(user));
      return {
        statusKey: StatusKey.SUCCESS,
        data: mappedUsers,
      };
    } catch (error) {
      return handlePrismaError(error, UserService.name, 'updateRoles', this.loggerService);
    }
  }
  async updateStatuses(
    dto: UserUpdateStatusRequest,
  ): Promise<BaseResponse<UserSummaryResponse[] | []>> {
    const dtoInstance = plainToInstance(UserUpdateStatusRequest, dto);
    await validateOrReject(dtoInstance);
    const userIds = dto.users.map((user) => user.userId);
    const existingUsers = await this.prismaService.client.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, status: true },
    });
    const existingIds = existingUsers.map((u) => u.id);
    const notFoundIds = userIds.filter((id) => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.user.someUserNotExist',
        args: { missingIds: notFoundIds.join(', ') },
      });
    }
    const usersToUpdate = dto.users.filter((user) => {
      const found = existingUsers.find((u) => u.id === user.userId);
      return found && found.status !== user.status;
    });

    if (usersToUpdate.length === 0) {
      return {
        statusKey: StatusKey.UNCHANGED,
        data: [],
      };
    }
    try {
      const updatePromises = usersToUpdate.map((user) =>
        this.prismaService.client.user.update({
          where: { id: user.userId },
          data: { status: user.status },
          include: {
            role: true,
            profile: true,
          },
        }),
      );
      const updatedUsers = await this.prismaService.client.$transaction(updatePromises);
      const mappedUsers = updatedUsers.map((user) => this.mapToUserSummaryResponse(user));
      return {
        statusKey: StatusKey.SUCCESS,
        data: mappedUsers,
      };
    } catch (error) {
      return handlePrismaError(error, UserService.name, 'updateStatuses', this.loggerService);
    }
  }
  async softdeleteUser(dto: SoftDeleteUserRequest): Promise<BaseResponse<SoftDeleteUserResponse>> {
    const userById = await this.prismaService.client.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        deletedAt: true,
      },
    });
    if (!userById)
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.NOT_FOUND,
        message: 'common.user.notFound',
      });

    if (userById.deletedAt) {
      const payload: SoftDeleteUserResponse = {
        userId: userById.id,
        deletedAt: userById.deletedAt,
      };
      return buildBaseResponse(StatusKey.UNCHANGED, payload);
    }
    try {
      const userUpdated = await this.prismaService.client.$transaction(async (tx) => {
        const userUpdated = await tx.user.update({
          where: { id: dto.userId },
          data: { deletedAt: new Date() },
        });
        // Nếu có record thì xoá, không gây lỗi nếu không có
        await tx.userProfile.updateMany({
          where: { userId: dto.userId },
          data: { deletedAt: new Date() },
        });
        return userUpdated;
      });
      const payload: SoftDeleteUserResponse = {
        userId: userUpdated.id,
        deletedAt: userUpdated.deletedAt ?? new Date(),
      };
      const payloadSoftDeleteCart: DeleteSoftCartRequest = {
        userId: userUpdated.id,
      };
      await this.productProducer.addJobSoftDeleteCart(payloadSoftDeleteCart);
      return buildBaseResponse(StatusKey.SUCCESS, payload);
    } catch (error) {
      return handlePrismaError(error, UserService.name, 'softdeleteUser', this.loggerService);
    }
  }
  async getUserProfile(dto: GetUserProfileRequest): Promise<UserProfileResponse> {
    await validateOrReject(Object.assign(new GetUserProfileRequest(), dto));

    try {
      const user = await this.prismaService.client.user.findUnique({
        where: {
          id: dto.userId,
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

      if (!user) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.user.notFound',
        });
      }

      const userProfileResponse: UserProfileResponse = {
        id: user.id,
        name: user.name,
        userName: user.userName,
        email: user.email,
        imageUrl: user.imageUrl,
        isActive: user.isActive,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
        profile: user.profile
          ? {
              id: user.profile.id,
              address: user.profile.address,
              phoneNumber: user.profile.phoneNumber,
              dateOfBirth: user.profile.dob,
              createdAt: user.profile.createdAt,
              updatedAt: user.profile.updatedAt,
            }
          : null,
        authProviders: user.authProviders.map((provider) => ({
          id: provider.id,
          provider: provider.provider,
          providerId: provider.providerId,
          hasPassword: !!provider.password,
          createdAt: provider.createdAt,
        })),
      };

      return userProfileResponse;
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }

      this.loggerService.error(
        'getUserProfile',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async updateUserProfile(dto: UpdateUserProfileRequest): Promise<UpdateUserProfileResponse> {
    await validateOrReject(Object.assign(new UpdateUserProfileRequest(), dto));

    try {
      const existingUser = await this.prismaService.client.user.findUnique({
        where: {
          id: dto.userId,
          deletedAt: null,
        },
        include: {
          profile: true,
        },
      });

      if (!existingUser) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.user.notFound',
        });
      }

      if (dto.email && dto.email !== existingUser.email) {
        const emailExists = await this.prismaService.client.user.findFirst({
          where: {
            email: dto.email,
            id: { not: dto.userId },
            deletedAt: null,
          },
        });

        if (emailExists) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.CONFLICT,
            message: 'common.user.emailExist',
          });
        }
      }

      if (dto.userName && dto.userName !== existingUser.userName) {
        const userNameExists = await this.prismaService.client.user.findFirst({
          where: {
            userName: dto.userName,
            id: { not: dto.userId },
            deletedAt: null,
          },
        });

        if (userNameExists) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.CONFLICT,
            message: 'common.user.userNameExist',
          });
        }
      }

      if (dto.phoneNumber && dto.phoneNumber !== existingUser.profile?.phoneNumber) {
        const phoneExists = await this.prismaService.client.userProfile.findFirst({
          where: {
            phoneNumber: dto.phoneNumber,
            userId: { not: dto.userId },
            deletedAt: null,
          },
        });

        if (phoneExists) {
          throw new TypedRpcException({
            code: HTTP_ERROR_CODE.CONFLICT,
            message: 'common.user.phoneNumberExist',
          });
        }
      }

      const updatedUser = await this.prismaService.client.$transaction(async (tx) => {
        const userUpdateData: Prisma.UserUpdateInput = {};
        if (dto.name !== undefined) userUpdateData.name = dto.name;
        if (dto.userName !== undefined) userUpdateData.userName = dto.userName;
        if (dto.email !== undefined) userUpdateData.email = dto.email;
        if (dto.imageUrl !== undefined) userUpdateData.imageUrl = dto.imageUrl;

        const updatedUser = await tx.user.update({
          where: { id: dto.userId },
          data: userUpdateData,
        });

        let updatedProfile: UserProfile | null = null;
        if (
          dto.address !== undefined ||
          dto.phoneNumber !== undefined ||
          dto.dateOfBirth !== undefined
        ) {
          const profileUpdateData: Prisma.UserProfileUpsertArgs['update'] = {};
          if (dto.address !== undefined) profileUpdateData.address = dto.address;
          if (dto.phoneNumber !== undefined) profileUpdateData.phoneNumber = dto.phoneNumber;
          if (dto.dateOfBirth !== undefined) {
            profileUpdateData.dob = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
          }

          updatedProfile = await tx.userProfile.upsert({
            where: { userId: dto.userId! },
            update: profileUpdateData,
            create: {
              userId: dto.userId!,
              address: dto.address || null,
              phoneNumber: dto.phoneNumber || null,
              dob: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
            },
          });
        } else if (existingUser.profile) {
          updatedProfile = existingUser.profile;
        }

        return { user: updatedUser, profile: updatedProfile };
      });

      const updateResponse: UpdateUserProfileResponse = {
        id: updatedUser.user.id,
        name: updatedUser.user.name,
        userName: updatedUser.user.userName,
        email: updatedUser.user.email,
        imageUrl: updatedUser.user.imageUrl,
        updatedAt: updatedUser.user.updatedAt,
        profile: updatedUser.profile
          ? {
              id: updatedUser.profile.id,
              address: updatedUser.profile.address,
              phoneNumber: updatedUser.profile.phoneNumber,
              dateOfBirth: updatedUser.profile.dob,
              updatedAt: updatedUser.profile.updatedAt,
            }
          : null,
      };

      return updateResponse;
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }

      this.loggerService.error(
        'updateUserProfile',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async updatePassword(dto: UpdatePasswordRequest): Promise<UpdatePasswordResponse> {
    await validateOrReject(Object.assign(new UpdatePasswordRequest(), dto));

    if (dto.newPassword !== dto.confirmPassword) {
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.BAD_REQUEST,
        message: 'common.validation.passwordMismatch',
      });
    }

    try {
      const user = await this.prismaService.client.user.findUnique({
        where: {
          id: dto.userId,
          deletedAt: null,
        },
        include: {
          authProviders: {
            where: { provider: Provider.LOCAL },
          },
        },
      });

      if (!user) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.NOT_FOUND,
          message: 'common.user.notFound',
        });
      }

      const localAuthProvider = user.authProviders.find(
        (provider) => provider.provider === Provider.LOCAL,
      );
      if (!localAuthProvider || !localAuthProvider.password) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.BAD_REQUEST,
          message: 'common.user.noLocalPassword',
        });
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        localAuthProvider.password,
      );
      if (!isCurrentPasswordValid) {
        throw new TypedRpcException({
          code: HTTP_ERROR_CODE.UNAUTHORIZED,
          message: 'common.user.invalidCurrentPassword',
        });
      }

      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(dto.newPassword, saltRounds);

      await this.prismaService.client.authProvider.update({
        where: { id: localAuthProvider.id },
        data: { password: hashedNewPassword },
      });

      const updatedUser = await this.prismaService.client.user.update({
        where: { id: dto.userId },
        data: { updatedAt: new Date() },
      });

      const passwordResponse: UpdatePasswordResponse = {
        id: updatedUser.id,
        userName: updatedUser.userName,
        email: updatedUser.email,
        updatedAt: updatedUser.updatedAt,
        message: 'common.user.passwordUpdatedSuccessfully',
      };

      return passwordResponse;
    } catch (error) {
      if (error instanceof TypedRpcException) {
        throw error;
      }

      this.loggerService.error(
        'updatePassword',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
      );
      throw new TypedRpcException({
        code: HTTP_ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: 'common.errors.internalServerError',
      });
    }
  }

  async getAllAdmin(): Promise<AdminInfoResponse[] | []> {
    const adminUsers = await this.prismaService.client.user.findMany({
      where: { role: { name: RoleEnum.ADMIN }, deletedAt: null },
      select: { id: true, name: true, email: true },
    });
    return adminUsers;
  }
  private mapToUserSummaryResponse(
    data: User & { role: Role; profile: UserProfile | null },
  ): UserSummaryResponse {
    return {
      id: data.id,
      name: data.name,
      userName: data.userName,
      email: data.email,
      phone: data.profile?.phoneNumber,
      address: data.profile?.address,
      isActive: data.isActive,
      imageUrl: data.imageUrl,
      status: data.status,
      role: data.role.name,
    };
  }
}
