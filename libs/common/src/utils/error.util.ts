import { ValidationError } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { HTTP_ERROR_CODE } from '../enums/errors/http-error-code';
import { RpcError } from '../interfaces/rpc-exception';
import { ValidationDetailErrors } from '../types/validation.type';

export async function formatValidationErrors(
  errors: ValidationError[],
  i18nService?: I18nService,
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
          return i18nService
            ? (i18nService.translate<string>(key, { args }) as string)
            : buildValidationMsgKeyError(key, args);
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
  console.log('EXCEPTION ACCEPT:: ', JSON.stringify(obj));
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
function buildValidationMsgKeyError(msgKey: string, args?: Record<string, unknown>): string {
  return `${msgKey}|${JSON.stringify(args)}`;
}
function parseMsgKey(msgKey: string): { key: string; args?: Record<string, unknown> } {
  const [key, argsString] = msgKey.split('|');
  if (!argsString) {
    return { key };
  }
  try {
    const parsed = JSON.parse(argsString) as Record<string, unknown>;
    return { key, args: parsed };
  } catch {
    return { key };
  }
}
export function translateValidationDetails(
  details: ValidationDetailErrors[],
  i18nService: I18nService,
): ValidationDetailErrors[] {
  return details.map((detail) => {
    const translatedMessages = detail.message.map((rawMsgKey) => {
      const { key, args } = parseMsgKey(rawMsgKey);
      return i18nService.translate<string>(key, { args }) as string;
    });
    return { field: detail.field, message: translatedMessages };
  });
}

export interface ValidationDetailError {
  field: string;
  message: string[];
}

export function isValidationDetailErrors(input: unknown): input is ValidationDetailError[] {
  if (!Array.isArray(input)) {
    return false;
  }
  return input.every((item): item is ValidationDetailError => {
    if (typeof item !== 'object' || item === null || !('field' in item) || !('message' in item)) {
      return false;
    }
    const field = (item as Record<string, unknown>).field;
    const message = (item as Record<string, unknown>).message;

    return (
      typeof field === 'string' &&
      Array.isArray(message) &&
      message.every((msg): msg is string => typeof msg === 'string')
    );
  });
}
