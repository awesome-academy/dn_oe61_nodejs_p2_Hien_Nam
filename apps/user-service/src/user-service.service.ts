import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PrismaService } from '@app/prisma';
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { PrismaClient } from '../generated/prisma';
import { CreateUserDto } from '@app/common/dto/user/create-user.dto';
import { Role } from '@app/common/enums/roles/users.enum';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService<PrismaClient>,
    private readonly loggerService: CustomLogger,
  ) {}

  async getUserByEmail(dto: UserByEmailRequest): Promise<UserResponse | null> {
    await validateOrReject(dto);
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

  async checkUserExists(twitterId: string): Promise<UserResponse | null> {
    if (!twitterId) {
      throw new RpcException('common.auth.action.checkUserExists.error');
    }

    const authProvider = await this.prismaService.client.authProvider.findFirst({
      where: { providerId: twitterId },
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
      authProviders: user.authProviders || [],
    };

    return formatData;
  }

  async getRole() {
    try {
      const role = await this.prismaService.client.role.findUnique({
        where: { name: Role.USER },
      });
      return role;
    } catch {
      throw new RpcException('common.errors.internalServerError');
    }
  }

  async createUser(data: CreateUserDto) {
    await validateOrReject(data);
    const hasMissingField = Object.values(data).some(
      (value) => value === null || value === undefined || value === '',
    );

    if (hasMissingField) {
      throw new BadRequestException('common.auth.action.createUser.missingFields');
    }

    const existingUser = await this.checkUserExists(data.providerId as string);
    if (existingUser) {
      throw new ConflictException('common.auth.action.createUser.exists');
    }

    const role = await this.getRole();
    if (!role) {
      throw new RpcException('common.auth.action.createUser.roleNotFound');
    }

    try {
      const dataUser = await this.prismaService.client.user.create({
        data: {
          name: data.name,
          userName: data.userName,
          role: {
            connect: { id: role.id },
          },
          authProviders: {
            create: [
              {
                provider: 'TWITTER',
                providerId: data.providerId,
                password: null,
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

      const result = {
        id: dataUser?.id,
        name: dataUser?.name,
        userName: dataUser?.userName,
        role: dataUser?.role?.name,
        email: dataUser?.email ?? undefined,
        providerName: dataUser?.authProviders,
      };

      return result;
    } catch {
      throw new RpcException('common.errors.internalServerError');
    }
  }
}
