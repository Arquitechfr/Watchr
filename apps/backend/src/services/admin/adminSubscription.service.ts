import { User } from "../../models/user.model.js";
import { VipFeature, IVipFeature } from "../../models/vipFeature.model.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { cancelRevolutSubscription } from "../../lib/revolutClient.js";
import { translateMultiLang, type TranslationInput } from "../translation.service.js";
import { SUPPORTED_LOCALES } from "../../i18n/translations.js";
import { log, logError } from "../../lib/logger.js";

// ─── Subscription Stats ───

export interface SubscriptionStats {
  totalVip: number;
  totalFree: number;
  newVip7d: number;
  newVip30d: number;
  totalRevenue: number;
  estimatedMrr: number;
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalVip, totalFree, newVip7d, newVip30d] = await Promise.all([
    User.countDocuments({ subscriptionPlan: "vip" }),
    User.countDocuments({ subscriptionPlan: "free" }),
    User.countDocuments({
      subscriptionPlan: "vip",
      updatedAt: { $gte: sevenDaysAgo },
    }),
    User.countDocuments({
      subscriptionPlan: "vip",
      updatedAt: { $gte: thirtyDaysAgo },
    }),
  ]);

  const totalRevenue = totalVip * 3.99;
  const estimatedMrr = totalVip * 3.99;

  return { totalVip, totalFree, newVip7d, newVip30d, totalRevenue, estimatedMrr };
}

// ─── List Subscriptions ───

export interface SubscriptionRow {
  id: string;
  username: string;
  email: string;
  subscriptionPlan: "free" | "vip";
  revolutCustomerId?: string;
  revolutSubscriptionId?: string;
  subscriptionExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListSubscriptionsResult {
  users: SubscriptionRow[];
  total: number;
  page: number;
  limit: number;
}

export async function listSubscriptions(params: {
  page: number;
  limit: number;
  search?: string;
  plan?: "free" | "vip" | "all";
}): Promise<ListSubscriptionsResult> {
  const { page, limit, search, plan } = params;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (plan && plan !== "all") {
    filter.subscriptionPlan = plan;
  }
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("username email subscriptionPlan revolutCustomerId revolutSubscriptionId subscriptionExpiresAt createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      subscriptionPlan: u.subscriptionPlan,
      revolutCustomerId: u.revolutCustomerId,
      revolutSubscriptionId: u.revolutSubscriptionId,
      subscriptionExpiresAt: u.subscriptionExpiresAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
    total,
    page,
    limit,
  };
}

// ─── Admin Cancel Subscription ───

export async function adminCancelSubscription(userId: string, adminId: string): Promise<void> {
  const user = await User.findById(userId).select("subscriptionPlan revolutSubscriptionId").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (user.subscriptionPlan !== "vip") {
    throw new ApiError(400, "NO_ACTIVE_SUBSCRIPTION", "User does not have an active VIP subscription");
  }

  if (user.revolutSubscriptionId) {
    try {
      await cancelRevolutSubscription(user.revolutSubscriptionId);
    } catch (err) {
      logError("AdminSubscription", "Failed to cancel Revolut subscription", err, {
        userId,
        subscriptionId: user.revolutSubscriptionId,
        adminId,
      });
      throw new ApiError(500, "CANCEL_FAILED", "Failed to cancel subscription via Revolut");
    }
  }

  await User.findByIdAndUpdate(userId, {
    subscriptionPlan: "free",
    revolutSubscriptionId: null,
  });

  log("AdminSubscription", "Admin cancelled subscription", { userId, adminId, hadRevolut: !!user.revolutSubscriptionId });
}

// ─── Override Subscription (manual grant/revoke) ───

export async function overrideSubscription(
  userId: string,
  plan: "free" | "vip",
  adminId: string,
  reason: string,
): Promise<void> {
  const user = await User.findById(userId).select("subscriptionPlan revolutSubscriptionId").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (plan === "vip" && user.subscriptionPlan === "vip") {
    throw new ApiError(400, "ALREADY_VIP", "User already has VIP");
  }

  if (plan === "free" && user.subscriptionPlan === "free") {
    throw new ApiError(400, "ALREADY_FREE", "User is already on free plan");
  }

  // If downgrading a user with an active Revolut subscription, cancel it first
  if (plan === "free" && user.revolutSubscriptionId) {
    try {
      await cancelRevolutSubscription(user.revolutSubscriptionId);
    } catch (err) {
      logError("AdminSubscription", "Failed to cancel Revolut subscription during override", err, {
        userId,
        adminId,
      });
    }
  }

  const update: Record<string, unknown> = {
    subscriptionPlan: plan,
  };

  if (plan === "free") {
    update.revolutSubscriptionId = null;
  }

  await User.findByIdAndUpdate(userId, update);

  log("AdminSubscription", "Admin overrode subscription", { userId, plan, adminId, reason });
}

// ─── VIP Features CRUD ───

type LeanVipFeature = Omit<IVipFeature, "translations" | "descriptionTranslations"> & {
  translations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
};

export interface VipFeatureDto {
  id: string;
  icon: string;
  labelKey: string;
  translations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toDto(feature: IVipFeature | LeanVipFeature): VipFeatureDto {
  const translations = feature.translations instanceof Map
    ? Object.fromEntries(feature.translations)
    : { ...(feature.translations as Record<string, string>) };
  const descriptionTranslations = feature.descriptionTranslations instanceof Map
    ? Object.fromEntries(feature.descriptionTranslations)
    : { ...(feature.descriptionTranslations as Record<string, string>) };
  return {
    id: feature._id.toString(),
    icon: feature.icon,
    labelKey: feature.labelKey,
    translations,
    descriptionTranslations,
    order: feature.order,
    isActive: feature.isActive,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
  };
}

export async function listVipFeatures(includeInactive = false): Promise<VipFeatureDto[]> {
  const filter = includeInactive ? {} : { isActive: true };
  const features = await VipFeature.find(filter).sort({ order: 1, createdAt: 1 }).lean();
  return features.map((f) => toDto(f as unknown as LeanVipFeature));
}

export async function createVipFeature(params: {
  icon: string;
  label: string;
  description?: string;
  order?: number;
}): Promise<VipFeatureDto> {
  const { icon, label, description, order } = params;

  // Generate a unique labelKey
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const labelKey = `feature_${slug}_${Date.now().toString(36)}`;

  // Auto-translate the label into all supported languages
  const targetLangs = SUPPORTED_LOCALES.filter((l) => l !== "en");
  const translations = new Map<string, string>([["en", label]]);
  const descriptionTranslations = new Map<string, string>();

  const input: TranslationInput = { body: label };
  if (description) {
    input.subject = description;
    descriptionTranslations.set("en", description);
  }
  const result = await translateMultiLang(input, targetLangs, "en");

  for (const [lang, translation] of result) {
    if (translation.body) {
      translations.set(lang, translation.body);
    }
    if (translation.subject) {
      descriptionTranslations.set(lang, translation.subject);
    }
  }

  // Fallback: if translation failed for any lang, use English
  for (const lang of targetLangs) {
    if (!translations.has(lang)) {
      translations.set(lang, label);
    }
    if (description && !descriptionTranslations.has(lang)) {
      descriptionTranslations.set(lang, description);
    }
  }

  const maxOrder = await VipFeature.findOne().sort({ order: -1 }).select("order").lean();
  const feature = await VipFeature.create({
    icon,
    labelKey,
    translations,
    descriptionTranslations,
    order: order ?? (maxOrder?.order ?? -1) + 1,
    isActive: true,
  });

  log("AdminSubscription", "Created VIP feature", { labelKey, icon, translationsCount: translations.size });

  return toDto(feature);
}

export async function updateVipFeature(
  id: string,
  params: { icon?: string; label?: string; description?: string; order?: number; isActive?: boolean },
): Promise<VipFeatureDto> {
  const feature = await VipFeature.findById(id);
  if (!feature) {
    throw new ApiError(404, "FEATURE_NOT_FOUND", "VIP feature not found");
  }

  if (params.icon !== undefined) feature.icon = params.icon;
  if (params.order !== undefined) feature.order = params.order;
  if (params.isActive !== undefined) feature.isActive = params.isActive;

  const labelChanged = params.label !== undefined && params.label !== feature.translations.get("en");
  const descChanged = params.description !== undefined && params.description !== (feature.descriptionTranslations.get("en") ?? "");

  if (labelChanged || descChanged) {
    const targetLangs = SUPPORTED_LOCALES.filter((l) => l !== "en");
    const input: TranslationInput = {};

    if (labelChanged) {
      feature.translations.set("en", params.label!);
      input.body = params.label!;
    }
    if (descChanged) {
      if (params.description) {
        feature.descriptionTranslations.set("en", params.description);
        input.subject = params.description;
      } else {
        feature.descriptionTranslations = new Map();
      }
    }

    if (Object.keys(input).length > 0) {
      const result = await translateMultiLang(input, targetLangs, "en");

      for (const [lang, translation] of result) {
        if (labelChanged && translation.body) {
          feature.translations.set(lang, translation.body);
        }
        if (descChanged && translation.subject) {
          feature.descriptionTranslations.set(lang, translation.subject);
        }
      }

      // Fallback for failed translations
      for (const lang of targetLangs) {
        if (labelChanged && !feature.translations.get(lang)) {
          feature.translations.set(lang, params.label!);
        }
        if (descChanged && params.description && !feature.descriptionTranslations.get(lang)) {
          feature.descriptionTranslations.set(lang, params.description);
        }
      }

      feature.markModified("translations");
      feature.markModified("descriptionTranslations");
    }
  }

  await feature.save();
  return toDto(feature);
}

export async function deleteVipFeature(id: string): Promise<void> {
  const result = await VipFeature.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(404, "FEATURE_NOT_FOUND", "VIP feature not found");
  }
}

export async function reorderVipFeatures(ids: string[]): Promise<void> {
  const ops = ids.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order: index } },
    },
  }));
  await VipFeature.bulkWrite(ops);
}

// ─── Public VIP Features (for mobile/web) ───

export async function getPublicVipFeatures(): Promise<
  Array<{ icon: string; labelKey: string; translations: Record<string, string>; descriptionTranslations: Record<string, string>; order: number }>
> {
  const features = await VipFeature.find({ isActive: true })
    .sort({ order: 1, createdAt: 1 })
    .select("icon labelKey translations descriptionTranslations order")
    .lean();

  return features.map((f) => ({
    icon: f.icon,
    labelKey: f.labelKey,
    translations: { ...(f.translations as unknown as Record<string, string>) },
    descriptionTranslations: { ...(f.descriptionTranslations as unknown as Record<string, string>) },
    order: f.order,
  }));
}
