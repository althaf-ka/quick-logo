import { z } from "zod";

export const logReportSchema = z.object({
  // source "api" is reserved for internal server logging
  source: z.enum(["web", "admin"]),
  message: z.string().min(1).max(2000),
  level: z.enum(["info", "warn", "error", "fatal"]).default("error"),
  stack: z.string().max(5000).optional(),
  pathname: z.string().max(500).optional(),
  context: z
    .record(z.string(), z.unknown())
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const str = JSON.stringify(val);
      // Pre-stringify and cap to protect storage
      return str.length > 5000 ? str.slice(0, 5000) : str;
    }),
});

export type LogReportRequest = z.infer<typeof logReportSchema>;
