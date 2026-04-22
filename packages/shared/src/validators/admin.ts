import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const adminLogsQuerySchema = paginationSchema.extend({
  level: z.enum(["info", "warn", "error", "fatal"]).optional(),
  source: z.enum(["web", "admin", "api"]).optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
export type AdminLogsQuery = z.infer<typeof adminLogsQuerySchema>;
