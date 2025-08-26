import { ProfileFacebookUser } from '@app/common/dto/user/requests/facebook-user-dto.request';
import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { Role as RoleEnum } from '@app/common/enums/role.enum';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { handlePrismaError } from '@app/common/utils/prisma-client-error';
import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { randomUUID } from 'crypto';
import { AuthProvider, Prisma, PrismaClient, Provider, Role, User } from '../generated/prisma';
import { INCLUDE_AUTH_PROVIDER_USER } from './constants/include-auth-user';

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
}
