import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '../enums/roles/users.enum';
import { Roles } from './metadata.decorator';
import { RolesGuard } from 'apps/api-gateway/src/auth/guards/roles.guard';

export function AuthRoles(...roles: Role[]) {
  return applyDecorators(UseGuards(RolesGuard), Roles(...roles));
}
