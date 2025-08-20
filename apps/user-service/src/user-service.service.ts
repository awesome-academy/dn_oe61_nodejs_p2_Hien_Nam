import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { PrismaService } from '@app/prisma';
import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { PrismaClient } from '../generated/prisma';

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
}
