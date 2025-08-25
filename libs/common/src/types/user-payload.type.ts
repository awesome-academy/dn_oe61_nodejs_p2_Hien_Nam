import { Role } from '../enums/roles/users.enum';

export type TUserPayload = {
  id?: number;
  name: string;
  userName: string;
  imageUrl?: string;
  email?: string;
  role: Role;
};
