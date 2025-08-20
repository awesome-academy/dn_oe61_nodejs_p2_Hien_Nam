import { ExecutionContext } from '@nestjs/common';

export function getResourceName(context: ExecutionContext): string {
  return context
    .getClass()
    .name.replace(/Controller$/, '')
    .toLowerCase();
}
