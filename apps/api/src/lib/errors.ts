import { ERROR_CODES } from "@quicklogo/shared";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { ...this.details }),
    };
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super(
      402,
      ERROR_CODES.INSUFFICIENT_CREDITS,
      `You need ${required} credits but only have ${available}.`,
      { required, available },
    );
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super(
      404,
      ERROR_CODES.USER_NOT_FOUND,
      "Account not found. Please sign in again.",
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, ERROR_CODES.NOT_FOUND, `${resource} not found`);
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(
      403,
      ERROR_CODES.FORBIDDEN,
      "You do not have access to this resource.",
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(
      401,
      ERROR_CODES.UNAUTHORIZED,
      "Please sign in to access this resource.",
    );
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request") {
    super(400, "BAD_REQUEST", message);
  }
}

export class RefinementInProgressError extends AppError {
  constructor() {
    super(
      409,
      ERROR_CODES.REFINEMENT_IN_PROGRESS,
      "Another refinement is already processing for this brand kit.",
    );
  }
}

export class RevisionConflictError extends AppError {
  constructor() {
    super(
      409,
      ERROR_CODES.REVISION_CONFLICT,
      "The brand kit changed while this edit was being saved. Review the latest version and try again.",
    );
  }
}
