import { User } from "../models/user.model.js";
import { MobileConfig } from "../models/MobileConfig.js";
import { ApiError } from "../middleware/error.middleware.js";
import {
  createRevolutCustomer,
  createRevolutSubscription,
  getRevolutOrder,
  cancelRevolutSubscription,
  getRevolutSubscription,
  RevolutApiError,
} from "../lib/revolutClient.js";
import { log, logError } from "../lib/logger.js";
import { peekMcpQuota } from "../lib/mcpQuota.js";

async function getPlanConfig(): Promise<{ planId: string; planVariationId: string }> {
  const [planEntry, variationEntry] = await Promise.all([
    MobileConfig.findOne({ key: "revolut_plan_id" }).lean(),
    MobileConfig.findOne({ key: "revolut_plan_variation_id" }).lean(),
  ]);
  if (!planEntry?.value) {
    throw new ApiError(500, "REVOLUT_PLAN_NOT_CONFIGURED", "Revolut plan ID not configured in remote config");
  }
  if (!variationEntry?.value) {
    throw new ApiError(500, "REVOLUT_PLAN_NOT_CONFIGURED", "Revolut plan variation ID not configured in remote config");
  }
  return { planId: planEntry.value, planVariationId: variationEntry.value };
}

export async function ensureRevolutCustomer(userId: string): Promise<string> {
  const user = await User.findById(userId).select("email username revolutCustomerId").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (user.revolutCustomerId) {
    return user.revolutCustomerId;
  }

  let customer;
  try {
    customer = await createRevolutCustomer(user.email, user.username);
  } catch (err) {
    logError("Subscription", "Failed to create Revolut customer", err, { userId, email: user.email });
    if (err instanceof RevolutApiError) {
      throw new ApiError(502, "REVOLUT_CUSTOMER_FAILED", `Revolut API error (${err.status})`, err, { status: err.status });
    }
    throw new ApiError(500, "REVOLUT_CUSTOMER_FAILED", "Failed to create Revolut customer", err);
  }
  await User.findByIdAndUpdate(userId, { revolutCustomerId: customer.id });
  log("Subscription", "Created Revolut customer", { userId, customerId: customer.id });
  return customer.id;
}

export async function startSubscription(userId: string): Promise<{ checkoutUrl: string; subscriptionId: string }> {
  const user = await User.findById(userId).select("subscriptionPlan revolutSubscriptionId").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (user.subscriptionPlan === "vip") {
    throw new ApiError(400, "ALREADY_VIP", "User already has an active VIP subscription");
  }

  const customerId = await ensureRevolutCustomer(userId);
  const { planId, planVariationId } = await getPlanConfig();

  const webAppEntry = await MobileConfig.findOne({ key: "web_app_url" }).lean();
  const webAppUrl = webAppEntry?.value || "https://app.watchr.me";
  const redirectUrl = `${webAppUrl}/profile/subscription/success`;

  let subscription;
  try {
    subscription = await createRevolutSubscription({
      plan_id: planId,
      plan_variation_id: planVariationId,
      customer_id: customerId,
      external_reference: userId,
      setup_order_redirect_url: redirectUrl,
    });
  } catch (err) {
    logError("Subscription", "Failed to create Revolut subscription", err, { userId, planId, planVariationId, customerId });
    if (err instanceof RevolutApiError) {
      throw new ApiError(502, "REVOLUT_SUBSCRIPTION_FAILED", `Revolut API error (${err.status})`, err, { status: err.status });
    }
    throw new ApiError(500, "REVOLUT_SUBSCRIPTION_FAILED", "Failed to create Revolut subscription", err);
  }

  await User.findByIdAndUpdate(userId, { revolutSubscriptionId: subscription.id });
  log("Subscription", "Created Revolut subscription", { userId, subscriptionId: subscription.id });

  let order;
  try {
    order = await getRevolutOrder(subscription.setup_order_id);
  } catch (err) {
    logError("Subscription", "Failed to retrieve Revolut order", err, { userId, orderId: subscription.setup_order_id });
    if (err instanceof RevolutApiError) {
      throw new ApiError(502, "REVOLUT_ORDER_FAILED", `Revolut API error (${err.status})`, err, { status: err.status });
    }
    throw new ApiError(500, "REVOLUT_ORDER_FAILED", "Failed to retrieve checkout URL from Revolut", err);
  }
  log("Subscription", "Retrieved checkout URL", { userId, orderId: subscription.setup_order_id });

  return { checkoutUrl: order.checkout_url, subscriptionId: subscription.id };
}

export async function cancelSubscription(userId: string): Promise<void> {
  const user = await User.findById(userId).select("subscriptionPlan revolutSubscriptionId").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  if (user.subscriptionPlan !== "vip") {
    throw new ApiError(400, "NO_ACTIVE_SUBSCRIPTION", "User does not have an active VIP subscription");
  }

  if (!user.revolutSubscriptionId) {
    throw new ApiError(400, "NO_SUBSCRIPTION_ID", "No Revolut subscription ID found for user");
  }

  try {
    await cancelRevolutSubscription(user.revolutSubscriptionId);
  } catch (err) {
    logError("Subscription", "Failed to cancel Revolut subscription", err, {
      userId,
      subscriptionId: user.revolutSubscriptionId,
    });
    throw new ApiError(500, "CANCEL_FAILED", "Failed to cancel subscription via Revolut");
  }

  await User.findByIdAndUpdate(userId, {
    subscriptionPlan: "free",
    revolutSubscriptionId: null,
  });
  log("Subscription", "Cancelled Revolut subscription", { userId });
}

export async function getSubscriptionStatus(userId: string): Promise<{
  plan: "free" | "vip";
  state?: string;
  startDate?: string | null;
  mcpQuota?: { remaining: number; limit: number };
}> {
  const user = await User.findById(userId).select("subscriptionPlan revolutSubscriptionId").lean();
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  let state: string | undefined;
  if (user.subscriptionPlan === "vip" && user.revolutSubscriptionId) {
    try {
      const sub = await getRevolutSubscription(user.revolutSubscriptionId);
      state = sub.state;
    } catch {
      // ignore
    }
  }

  const quota = await peekMcpQuota(userId, user.subscriptionPlan);

  return {
    plan: user.subscriptionPlan,
    ...(state ? { state } : {}),
    mcpQuota: { remaining: quota.remaining, limit: quota.limit },
  };
}
