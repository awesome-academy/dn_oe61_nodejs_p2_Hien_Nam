import { Request } from 'express';
import { TUserPayload } from './user-payload.type';

export type TRequestWithUser = Request & {
  user: TUserPayload;
  cookies?: Record<string, string>;
};
