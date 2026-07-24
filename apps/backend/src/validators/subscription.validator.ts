import { z } from "zod";

export const startSubscriptionSchema = z.object({
  // no body required — userId comes from auth
});

export const cancelSubscriptionSchema = z.object({
  // no body required
});
