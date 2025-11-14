export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 32;

export const PASSWORD_VALIDATION_MESSAGE =
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
