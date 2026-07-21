import { EmailLog, EmailStatus, EmailTemplate } from "../../models/emailLog.model.js";
import { AdminJob } from "../../models/adminJob.model.js";
import { User } from "../../models/user.model.js";
import { EmailService } from "../email.service.js";
import { processJob } from "./jobQueue.service.js";
import { ApiError } from "../../middleware/error.middleware.js";
import { logError } from "../../lib/logger.js";
import { detectLanguage, translateForUser, pickLongestText, type TranslationInput } from "../translation.service.js";
import { buildCtaUrl } from "../deepLinkCatalog.js";
import type { Types } from "mongoose";

export interface EmailHistoryFilters {
  page: number;
  limit: number;
  status?: EmailStatus;
  template?: EmailTemplate;
  search?: string;
}

export interface EmailBroadcastInput {
  subject: string;
  htmlContent: string;
  target: "all" | "locale";
  locale?: string;
  scheduledAt?: string;
  deepLinkScreen?: string;
  deepLinkParams?: Record<string, unknown>;
  customUrl?: string;
}

export interface EmailTargetedInput {
  userId: string;
  subject: string;
  htmlContent: string;
  scheduledAt?: string;
  deepLinkScreen?: string;
  deepLinkParams?: Record<string, unknown>;
  customUrl?: string;
}

export async function getEmailHistory(filters: EmailHistoryFilters) {
  const { page, limit, status, template, search } = filters;
  const query: Record<string, unknown> = {};

  if (status) query.status = status;
  if (template) query.template = template;
  if (search) query.to = { $regex: search, $options: "i" };

  const [logs, total] = await Promise.all([
    EmailLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EmailLog.countDocuments(query),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l._id.toString(),
      to: l.to,
      subject: l.subject,
      template: l.template,
      status: l.status,
      errorMessage: l.errorMessage ?? null,
      errorType: l.errorType ?? null,
      htmlContent: l.htmlContent,
      locale: l.locale ?? null,
      triggeredBy: l.triggeredBy ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getEmailStats() {
  const [total, sent, failed, skipped, byTemplate] = await Promise.all([
    EmailLog.countDocuments(),
    EmailLog.countDocuments({ status: "sent" }),
    EmailLog.countDocuments({ status: "failed" }),
    EmailLog.countDocuments({ status: "skipped" }),
    EmailLog.aggregate([
      { $group: { _id: "$template", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    total,
    sent,
    failed,
    skipped,
    successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
    byTemplate: byTemplate.map((t) => ({ template: t._id, count: t.count })),
  };
}

export async function getEmailDetail(id: string) {
  const log = await EmailLog.findById(id).lean();
  if (!log) return null;

  return {
    id: log._id.toString(),
    to: log.to,
    subject: log.subject,
    template: log.template,
    status: log.status,
    errorMessage: log.errorMessage ?? null,
    errorType: log.errorType ?? null,
    htmlContent: log.htmlContent,
    locale: log.locale ?? null,
    triggeredBy: log.triggeredBy ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function sendBroadcastEmail(
  sentBy: Types.ObjectId | string,
  input: EmailBroadcastInput,
): Promise<{ jobId: string; scheduled: boolean }> {
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();

  const job = await AdminJob.create({
    type: "email_broadcast",
    status: "pending",
    subject: input.subject,
    htmlContent: input.htmlContent,
    target: input.target,
    locale: input.locale,
    targetCount: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    sentBy: sentBy as Types.ObjectId,
    scheduledAt: isScheduled ? scheduledAt : undefined,
    scheduledStatus: isScheduled ? "scheduled" : "none",
    deepLinkScreen: input.deepLinkScreen,
    deepLinkParams: input.deepLinkParams,
    customUrl: input.customUrl,
  });

  if (!isScheduled) {
    processJob(job._id.toString()).catch((err) => {
      logError("AdminEmail", "background job failed", err, { jobId: job._id.toString() });
    });
  }

  return { jobId: job._id.toString(), scheduled: !!isScheduled };
}

export async function sendTargetedEmail(
  _sentBy: Types.ObjectId | string,
  input: EmailTargetedInput,
): Promise<{ success: boolean; scheduled: boolean; jobId?: string }> {
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;
  const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now();

  if (isScheduled) {
    const job = await AdminJob.create({
      type: "email_targeted_scheduled",
      status: "pending",
      subject: input.subject,
      htmlContent: input.htmlContent,
      target: "all",
      targetCount: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      sentBy: _sentBy as Types.ObjectId,
      scheduledAt,
      scheduledStatus: "scheduled",
      deepLinkScreen: input.deepLinkScreen,
      deepLinkParams: input.deepLinkParams,
      customUrl: input.customUrl,
      userId: input.userId,
    });

    return { success: false, scheduled: true, jobId: job._id.toString() };
  }

  const isEmail = input.userId.includes("@");
  const user = isEmail
    ? await User.findOne({ email: input.userId.toLowerCase() }).select("email preferredLanguage").lean()
    : await User.findById(input.userId).select("email preferredLanguage").lean();

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  // Auto-translate to user's preferred language
  const sourceText = pickLongestText({ subject: input.subject, htmlContent: input.htmlContent });
  const sourceLang = sourceText ? await detectLanguage(sourceText) : "en";
  const translationInput: TranslationInput = { subject: input.subject, htmlContent: input.htmlContent };
  const translated = await translateForUser(translationInput, user.preferredLanguage, sourceLang);

  const ctaUrl = buildCtaUrl(input.customUrl, input.deepLinkScreen, input.deepLinkParams);

  const success = await EmailService.sendCustomEmail(
    user.email,
    translated.subject ?? input.subject,
    translated.htmlContent ?? input.htmlContent,
    user.preferredLanguage,
    "admin",
    ctaUrl,
  );

  return { success, scheduled: false };
}
