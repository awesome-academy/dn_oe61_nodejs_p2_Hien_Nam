import { ProfileFacebookUser } from '@app/common/dto/user/requests/facebook-user-dto.request';
import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { RoleEnum } from '@app/common/enums/role.enum';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { handlePrismaError } from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { randomUUID } from 'crypto';
import { AuthProvider, Prisma, PrismaClient, Provider, Role, User } from '../generated/prisma';
import { INCLUDE_AUTH_PROVIDER_USER } from './constants/include-auth-user';
import { CreateUserDto } from '@app/common/dto/user/create-user.dto';
import { RpcException } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { TypedRpcException } from '@app/common/exceptions/rpc-exceptions';
import { HTTP_ERROR_CODE } from '@app/common/enums/errors/http-error-code';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService<PrismaClient>,
    private readonly loggerService: CustomLogger,
  ) {}

  async getUserByEmail(dto: UserByEmailRequest): Promise<UserResponse | null> {
    await validateOrReject(Object.assign(new UserByEmailRequest(), dto));
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
      role: userFindByEmail.role.name,
      authProviders: userFindByEmail.authProviders,
    };
  }
  async findOrCreateUserFromFacebook(profile: ProfileFacebookUser): Promise<UserResponse> {
    await validateOrReject(Object.assign(new ProfileFacebookUser(), profile));
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
      role: authProvider.user.role.name,
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
      role: user.role?.name,
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
                provider: data.provider,
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
        email: dataUser.email ?? undefined,
        providerName: data.provider,
      };

      return result;
    } catch (error) {
      this.loggerService.error(
        'Create User',
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
      email: result.email ?? undefined,
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
}
