import { z } from "zod";

export const listSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  plan: z.enum(["free", "vip", "all"]).optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

export const overrideSubscriptionSchema = z.object({
  plan: z.enum(["free", "vip"]),
  reason: z.string().min(1).max(500),
});

export const createVipFeatureSchema = z.object({
  icon: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  order: z.number().int().optional(),
});

export const updateVipFeatureSchema = z.object({
  icon: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const vipFeatureIdParamSchema = z.object({
  id: z.string().min(1),
});

export const reorderVipFeaturesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
