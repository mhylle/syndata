import { applyDecorators } from '@nestjs/common';
import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidationOptions,
} from 'class-validator';
import {
  PASSWORD_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_VALIDATION_MESSAGE,
} from '../constants/password.constants';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
      ...validationOptions,
    }),
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`,
      ...validationOptions,
    }),
    Matches(PASSWORD_REGEX, {
      message: PASSWORD_VALIDATION_MESSAGE,
      ...validationOptions,
    }),
  );
}
