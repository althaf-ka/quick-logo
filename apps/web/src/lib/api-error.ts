import { ERROR_CODES } from "@quicklogo/shared";

export { ERROR_CODES };

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function parseApiError(res: Response): Promise<ApiError> {
  const status = res.status;
  try {
    const body = await res.json();
    return new ApiError(
      body.code ?? ERROR_CODES.INTERNAL_ERROR,
      body.error ?? "Something went wrong",
      status,
      body,
    );
  } catch {
    return new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      "Something went wrong",
      status,
    );
  }
}
