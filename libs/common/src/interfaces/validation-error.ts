import { ValidationError } from '@nestjs/common';

export type ValidationErrorResponse = { message: ValidationError[] };
