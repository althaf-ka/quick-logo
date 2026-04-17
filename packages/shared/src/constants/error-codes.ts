export const ERROR_CODES = {
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiErrorResponse {
  error: string;
  code: ErrorCode;
  [key: string]: unknown;
}
