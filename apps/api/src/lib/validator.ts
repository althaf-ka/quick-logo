import type { Context } from "hono";


export const validationHook = (
  result:
    | { success: true }
    | {
        success: false;
        error: {
          issues: {
            path: (string | number | symbol)[];
            message: string;
            code: string;
            expected?: unknown;
            received?: unknown;
          }[];
        };
      },
  c: Context,
) => {
  if (!result.success) {
    return c.json(
      {
        error: "Validation failed",
        issues: result.error.issues.map((i) => ({
          field: i.path.at(-1)?.toString() ?? i.path.join("."),
          message: i.message,
          code: i.code,
        })),
      },
      400,
    );
  }
};
