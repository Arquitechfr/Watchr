import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.middleware.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validateRequest } from "../../validators/validateRequest.js";
import { listUsersQuerySchema, userIdParamSchema, updateUserStatusSchema, updateUserRoleSchema, cancelBanSchema } from "../../validators/admin/adminUser.validator.js";
import { listCommentsQuerySchema, commentIdParamSchema, markSpoilerSchema, bulkDeleteSchema } from "../../validators/admin/adminComment.validator.js";
import { createNewsSourceSchema, updateNewsSourceSchema, newsSourceIdParamSchema } from "../../validators/admin/adminNews.validator.js";
import { broadcastSchema, targetedSchema, notificationHistoryQuerySchema, notificationIdParamSchema } from "../../validators/admin/adminNotification.validator.js";
import { emailHistoryQuerySchema, emailIdParamSchema, emailBroadcastSchema, emailTargetedSchema } from "../../validators/admin/adminEmail.validator.js";
import { jobIdParamSchema } from "../../validators/admin/adminJob.validator.js";
import { listShowsQuerySchema, syncShowSchema, showIdParamSchema, tmdbIdParamSchema } from "../../validators/admin/adminShow.validator.js";
import { configKeyParamSchema, setConfigSchema } from "../../validators/admin/adminConfig.validator.js";
import { listImportsQuerySchema } from "../../validators/admin/adminImport.validator.js";
import { listReportsQuerySchema, reportIdParamSchema } from "../../validators/report.validator.js";
import { getAdminStats, getUserGrowth, getCommentActivity, getShowTypeBreakdown } from "../../services/admin/adminStats.service.js";
import { listUsers, getUserDetail, scheduleUserStatusAction, cancelBanAction, getBanHistory, updateUserRole, deleteUser } from "../../services/admin/adminUser.service.js";
import { listAllComments, adminDeleteComment, adminBulkDeleteComments, adminMarkSpoiler } from "../../services/admin/adminComment.service.js";
import { listAllNewsSources, createNewsSource, updateNewsSource, deleteNewsSource, toggleNewsSource } from "../../services/admin/adminNews.service.js";
import { sendBroadcast, sendTargeted, getNotificationHistory, getNotificationDetail, getNotificationStats } from "../../services/admin/adminNotification.service.js";
import { listShows, forceSyncShow, deleteShow } from "../../services/admin/adminShow.service.js";
import { listAllConfig, setConfig, deleteConfig } from "../../services/admin/adminConfig.service.js";
import { listAllImports, getImportStats } from "../../services/admin/adminImport.service.js";
import { getEmailHistory, getEmailStats, getEmailDetail, sendBroadcastEmail, sendTargetedEmail } from "../../services/admin/adminEmail.service.js";
import { getJobStatus } from "../../services/admin/jobQueue.service.js";
import { listReports, resolveReport, dismissReport, getReportStats } from "../../services/report.service.js";

const router: Router = Router();

router.use(requireAdmin);

// Stats
router.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await getAdminStats();
    res.json(stats);
  }),
);

router.get(
  "/stats/growth",
  asyncHandler(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    const [userGrowth, commentActivity, showBreakdown] = await Promise.all([
      getUserGrowth(days),
      getCommentActivity(7),
      getShowTypeBreakdown(),
    ]);
    res.json({ userGrowth, commentActivity, showBreakdown });
  }),
);

// Users
router.get(
  "/users",
  validateRequest(undefined, listUsersQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as {
      search?: string;
      role?: "user" | "admin";
      sortBy?: string;
      sortOrder?: string;
      page: number;
      limit: number;
    };
    const result = await listUsers({
      search: query.search,
      role: query.role,
      sortBy: query.sortBy as "createdAt" | "username" | "email" | "lastLoginAt" | undefined,
      sortOrder: query.sortOrder as "asc" | "desc" | undefined,
      page: query.page,
      limit: query.limit,
    });
    res.json(result);
  }),
);

router.get(
  "/users/:id",
  validateRequest(undefined, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const detail = await getUserDetail(req.params.id);
    res.json(detail);
  }),
);

router.patch(
  "/users/:id/status",
  validateRequest(updateUserStatusSchema, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await scheduleUserStatusAction(req.params.id, req.userId!, {
      action: req.body.action,
      reason: req.body.reason,
      delayHours: req.body.delayHours ?? 0,
      durationDays: req.body.durationDays,
    });
    res.json(result);
  }),
);

router.get(
  "/users/:id/ban-history",
  validateRequest(undefined, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const history = await getBanHistory(req.params.id);
    res.json(history);
  }),
);

router.post(
  "/users/:id/cancel-ban",
  validateRequest(cancelBanSchema, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await cancelBanAction(req.params.id, req.body.actionId);
    res.json({ cancelled: true });
  }),
);

router.patch(
  "/users/:id/role",
  validateRequest(updateUserRoleSchema, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await updateUserRole(req.params.id, req.body.role);
    res.json(result);
  }),
);

router.delete(
  "/users/:id",
  validateRequest(undefined, undefined, userIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await deleteUser(req.params.id);
    res.status(204).send();
  }),
);

// Comments
router.get(
  "/comments",
  validateRequest(undefined, listCommentsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as {
      showId?: string;
      userId?: string;
      isSpoiler?: boolean;
      isHidden?: boolean;
      minReports?: number;
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    };
    const result = await listAllComments({
      showId: query.showId,
      userId: query.userId,
      isSpoiler: query.isSpoiler,
      isHidden: query.isHidden,
      minReports: query.minReports,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });
    res.json(result);
  }),
);

router.delete(
  "/comments/bulk",
  validateRequest(bulkDeleteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adminBulkDeleteComments(req.body.commentIds);
    res.json(result);
  }),
);

router.delete(
  "/comments/:id",
  validateRequest(undefined, undefined, commentIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await adminDeleteComment(req.params.id);
    res.status(204).send();
  }),
);

router.patch(
  "/comments/:id/spoiler",
  validateRequest(markSpoilerSchema, undefined, commentIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await adminMarkSpoiler(req.params.id, req.body.isSpoiler);
    res.json(result);
  }),
);

// Reports
router.get(
  "/reports",
  validateRequest(undefined, listReportsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as {
      status?: string;
      reason?: string;
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    };
    const result = await listReports({
      status: query.status as "pending" | "resolved" | "dismissed" | undefined,
      reason: query.reason as "spam" | "unmarked_spoiler" | "harassment" | "inappropriate" | "off_topic" | undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });
    res.json(result);
  }),
);

router.get(
  "/reports/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await getReportStats();
    res.json(stats);
  }),
);

router.patch(
  "/reports/:id/resolve",
  validateRequest(undefined, undefined, reportIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await resolveReport(req.params.id, req.userId!);
    res.status(204).send();
  }),
);

router.patch(
  "/reports/:id/dismiss",
  validateRequest(undefined, undefined, reportIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await dismissReport(req.params.id, req.userId!);
    res.status(204).send();
  }),
);

// News Sources
router.get(
  "/news-sources",
  asyncHandler(async (_req: Request, res: Response) => {
    const sources = await listAllNewsSources();
    res.json(sources);
  }),
);

router.post(
  "/news-sources",
  validateRequest(createNewsSourceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const source = await createNewsSource(req.body);
    res.status(201).json(source);
  }),
);

router.patch(
  "/news-sources/:id",
  validateRequest(updateNewsSourceSchema, undefined, newsSourceIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const source = await updateNewsSource(req.params.id, req.body);
    res.json(source);
  }),
);

router.delete(
  "/news-sources/:id",
  validateRequest(undefined, undefined, newsSourceIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await deleteNewsSource(req.params.id);
    res.status(204).send();
  }),
);

router.patch(
  "/news-sources/:id/toggle",
  validateRequest(undefined, undefined, newsSourceIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await toggleNewsSource(req.params.id);
    res.json(result);
  }),
);

// Notifications
router.post(
  "/notifications/broadcast",
  validateRequest(broadcastSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await sendBroadcast(req.userId!, req.body);
    res.json(result);
  }),
);

router.post(
  "/notifications/targeted",
  validateRequest(targetedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await sendTargeted(req.userId!, req.body);
    res.json(result);
  }),
);

router.get(
  "/notifications/history",
  validateRequest(undefined, notificationHistoryQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      type?: "broadcast" | "targeted" | "automated";
      search?: string;
    };
    const result = await getNotificationHistory({
      page: query.page,
      limit: query.limit,
      type: query.type,
      search: query.search,
    });
    res.json(result);
  }),
);

router.get(
  "/notifications/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await getNotificationStats();
    res.json(stats);
  }),
);

router.get(
  "/notifications/:id",
  validateRequest(undefined, undefined, notificationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const detail = await getNotificationDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found" } });
      return;
    }
    res.json(detail);
  }),
);

// Shows
router.get(
  "/shows",
  validateRequest(undefined, listShowsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as {
      type?: "tv" | "movie";
      search?: string;
      page: number;
      limit: number;
    };
    const result = await listShows({
      type: query.type,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    res.json(result);
  }),
);

router.post(
  "/shows/:tmdbId/sync",
  validateRequest(syncShowSchema, undefined, tmdbIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await forceSyncShow(Number(req.params.tmdbId), req.body.type);
    res.json(result);
  }),
);

router.delete(
  "/shows/:id",
  validateRequest(undefined, undefined, showIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await deleteShow(req.params.id);
    res.status(204).send();
  }),
);

// Config
router.get(
  "/config",
  asyncHandler(async (_req: Request, res: Response) => {
    const config = await listAllConfig();
    res.json(config);
  }),
);

router.put(
  "/config/:key",
  validateRequest(setConfigSchema, undefined, configKeyParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await setConfig(req.params.key, req.body.value, req.body.type, req.userId!);
    res.json(result);
  }),
);

router.delete(
  "/config/:key",
  validateRequest(undefined, undefined, configKeyParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await deleteConfig(req.params.key);
    res.status(204).send();
  }),
);

// Emails
router.post(
  "/emails/broadcast",
  validateRequest(emailBroadcastSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await sendBroadcastEmail(req.userId!, req.body);
    res.json(result);
  }),
);

router.post(
  "/emails/targeted",
  validateRequest(emailTargetedSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await sendTargetedEmail(req.userId!, req.body);
    res.json(result);
  }),
);

router.get(
  "/emails/history",
  validateRequest(undefined, emailHistoryQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as {
      page: number;
      limit: number;
      status?: "sent" | "failed" | "skipped";
      template?: "welcome" | "reset_password" | "ban_notification" | "comment_deleted" | "comment_hidden" | "comment_spoiler" | "custom";
      search?: string;
    };
    const result = await getEmailHistory({
      page: query.page,
      limit: query.limit,
      status: query.status,
      template: query.template,
      search: query.search,
    });
    res.json(result);
  }),
);

router.get(
  "/emails/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await getEmailStats();
    res.json(stats);
  }),
);

router.get(
  "/emails/:id",
  validateRequest(undefined, undefined, emailIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const detail = await getEmailDetail(req.params.id);
    if (!detail) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Email log not found" } });
      return;
    }
    res.json(detail);
  }),
);

// Jobs (unified job status polling)
router.get(
  "/jobs/:id",
  validateRequest(undefined, undefined, jobIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const job = await getJobStatus(req.params.id);
    if (!job) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
      return;
    }
    res.json(job);
  }),
);

// Imports
router.get(
  "/imports",
  validateRequest(undefined, listImportsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as {
      status?: string;
      source?: string;
      page: number;
      limit: number;
    };
    const result = await listAllImports({
      status: query.status,
      source: query.source,
      page: query.page,
      limit: query.limit,
    });
    res.json(result);
  }),
);

router.get(
  "/imports/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await getImportStats();
    res.json(stats);
  }),
);

export default router;
