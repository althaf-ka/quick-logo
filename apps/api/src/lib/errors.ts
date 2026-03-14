export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS" as const;
  public readonly required: number;
  public readonly available: number;

  constructor(required: number, available: number) {
    super(`You need ${required} credits but only have ${available}.`);
    this.name = "InsufficientCreditsError";
    this.required = required;
    this.available = available;
  }
}

export class UserNotFoundError extends Error {
  readonly code = "USER_NOT_FOUND" as const;

  constructor() {
    super("Account not found. Please sign in again.");
    this.name = "UserNotFoundError";
  }
}
