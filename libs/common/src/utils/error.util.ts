import { ValidationError } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { HTTP_ERROR_CODE } from '../enums/errors/http-error-code';
import { RpcError } from '../interfaces/rpc-exception';

export async function formatValidationErrors(
  errors: ValidationError[],
  i18nService: I18nService,
  parentField = '',
): Promise<{ field: string; message: string[] }[]> {
  const formatted: { field: string; message: string[] }[] = [];

  for (const err of errors) {
    const field = parentField ? `${parentField}.${err.property}` : err.property;
    if (err.constraints) {
      const translated = await Promise.all(
        Object.values(err.constraints).map((constraint) => {
          const [key, argsRaw] = constraint.split('|');
          let args: Record<string, unknown> = {};
          try {
            args = argsRaw ? (JSON.parse(argsRaw) as Record<string, unknown>) : {};
          } catch {
            args = {};
          }
          if (Array.isArray(args.constraints)) {
            args.constraints.forEach((value, index) => {
              args[`constraint${index + 1}`] = value;
            });
          }
          return i18nService.translate<string>(key, { args }) as string;
        }),
      );
      formatted.push({ field, message: translated });
    }
    if (err.children && err.children.length > 0) {
      const childErrors = await formatValidationErrors(err.children, i18nService, err.property);
      formatted.push(...childErrors);
    }
  }
  return formatted;
}
export function parseRpcError(err: unknown): RpcError | null {
  const candidate = unwrapRpcError(err);
  return candidate && isRpcError(candidate) ? candidate : null;
}
export function isRpcError(obj: unknown): obj is RpcError {
  const candidate = unwrapRpcError(obj);
  if (!candidate) return false;
  const isCodeValid = Object.values(HTTP_ERROR_CODE).includes(candidate.code as HTTP_ERROR_CODE);
  return isCodeValid && typeof candidate.message === 'string';
}
function unwrapRpcError(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  const rec = value as Record<string, unknown>;
  if ('code' in rec && 'message' in rec) return rec;
  if ('error' in rec && typeof rec.error === 'object' && rec.error !== null) {
    const nested = rec.error as Record<string, unknown>;
    if ('code' in nested && 'message' in nested) return nested;
  }
  return null;
}
