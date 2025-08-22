import { ValidationError } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { RpcError } from '../interfaces/rpc-exception';
import { HTTP_ERROR_CODE } from '../enums/errors/http-error-code';

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

export function isRpcError(obj: unknown): obj is RpcError {
  if (typeof obj !== 'object' || obj === null) return false;
  const maybe = obj as Record<string, unknown>;
  const httpErrorCodeValues =
    HTTP_ERROR_CODE && typeof HTTP_ERROR_CODE === 'object' ? Object.values(HTTP_ERROR_CODE) : [];
  if (!httpErrorCodeValues.length) return false;
  const isCodeValid = httpErrorCodeValues.includes(maybe.code as HTTP_ERROR_CODE);
  return isCodeValid && typeof maybe.message === 'string';
}
