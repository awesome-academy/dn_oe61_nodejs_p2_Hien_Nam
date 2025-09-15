import { User, UserProfile } from 'apps/user-service/generated/prisma';
import { Role } from '../enums/roles/users.enum';

export type TUserPayload = {
  id?: number;
  name: string;
  userName: string;
  imageUrl?: string;
  email?: string;
  role: Role;
};

export type UserWithRoleAndProfile = User & { role: Role; profile: UserProfile | null };
