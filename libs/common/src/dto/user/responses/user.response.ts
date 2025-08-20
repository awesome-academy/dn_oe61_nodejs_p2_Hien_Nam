import { AuthProvider } from 'apps/user-service/generated/prisma';

export class UserResponse {
  id: number;
  name: string;
  userName: string;
  email?: string | null;
  imageUrl?: string;
  createdAt: Date;
  updatedAt?: Date | null;
  role: string;
  authProviders: AuthProvider[];
}
