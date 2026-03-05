export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS" as const;

  constructor(
    public readonly required: number,
    public readonly available: number,
  ) {
    super(`You need ${required} credits but only have ${available}.`);
    this.name = "InsufficientCreditsError";
  }
}

export class UserNotFoundError extends Error {
  readonly code = "USER_NOT_FOUND" as const;

  constructor() {
    super("Account not found. Please sign in again.");
    this.name = "UserNotFoundError";
  }
}
