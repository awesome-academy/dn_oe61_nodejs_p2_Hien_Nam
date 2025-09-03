import { PrismaClient } from '@prisma/client';

export type PrismaClientWithLifecycle = {
  $connect: () => Promise<void>;
  $disconnect: () => Promise<void>;
};

export type PrismaClientOptions = Parameters<typeof PrismaClient>[0];

export type PrismaModel<T = unknown> = {
  findMany(...args: unknown[]): Promise<T[]>;
  count(args?: { where?: unknown }): Promise<number>;
};

export type FindManyArgs<T extends PrismaModel<any>> = Parameters<T['findMany']>[0];
export type CountArgs<T extends PrismaModel<any>> = Parameters<T['count']>[0] extends {
  where?: infer W;
}
  ? W
  : unknown;

export type FuncParameters<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;
