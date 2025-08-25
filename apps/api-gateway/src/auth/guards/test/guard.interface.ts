import { TUserPayload } from '@app/common/types/user-payload.type';

export interface TestRequestJWT {
  headers?: Record<string, unknown>;
  cookies?: Record<string, unknown>;
  user?: TUserPayload;
}

export interface MinimalUser {
  id: number;
  role?: string;
}
export interface TestRequestRole {
  headers?: Record<string, unknown>;
  cookies?: Record<string, unknown>;
  user?: MinimalUser;
}
