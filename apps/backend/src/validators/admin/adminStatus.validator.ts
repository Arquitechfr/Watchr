import { z } from "zod";

export const statusHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
});

export const toggleMonitorSchema = z.object({
  enabled: z.boolean(),
});

export const publicServicesSchema = z.object({
  services: z.array(z.string()).min(1),
});
