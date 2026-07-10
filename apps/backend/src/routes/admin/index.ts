import { Router, Request, Response } from "express";
import { requireAdmin } from "../../middleware/requireAdmin.middleware.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validateRequest } from "../../validators/validateRequest.js";
import { listUsersQuerySchema, userIdParamSchema, updateUserStatusSchema, updateUserRoleSchema } from "../../validators/admin/adminUser.validator.js";
import { listCommentsQuerySchema, commentIdParamSchema, markSpoilerSchema, bulkDeleteSchema } from "../../validators/admin/adminComment.validator.js";
import { createNewsSourceSchema, updateNewsSourceSchema, newsSourceIdParamSchema } from "../../validators/admin/adminNews.validator.js";
import { broadcastSchema, targetedSchema, notificationHistoryQuerySchema } from "../../validators/admin/adminNotification.validator.js";
import { listShowsQuerySchema, syncShowSchema, showIdParamSchema, tmdbIdParamSchema } from "../../validators/admin/adminShow.validator.js";
import { configKeyParamSchema, setConfigSchema } from "../../validators/admin/adminConfig.validator.js";
import { listImportsQuerySchema } from "../../validators/admin/adminImport.validator.js";
import { getAdminStats, getUserGrowth, getCommentActivity, getShowTypeBreakdown } from "../../services/admin/adminStats.service.js";
import { listUsers, getUserDetail, updateUserStatus, updateUserRole, deleteUser } from "../../services/admin/adminUser.service.js";
import { listAllComments, adminDeleteComment, adminBulkDeleteComments, adminMarkSpoiler } from "../../services/admin/adminComment.service.js";
import { listAllNewsSources, createNewsSource, updateNewsSource, deleteNewsSource, toggleNewsSource } from "../../services/admin/adminNews.service.js";
import { sendBroadcast, sendTargeted, getNotificationHistory } from "../../services/admin/adminNotification.service.js";
import { listShows, forceSyncShow, deleteShow } from "../../services/admin/adminShow.service.js";
import { listAllConfig, setConfig, deleteConfig } from "../../services/admin/adminConfig.service.js";
import { listAllImports, getImportStats } from "../../services/admin/adminImport.service.js";

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
    const result = await updateUserStatus(req.params.id, req.body.action);
    res.json(result);
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
      startDate?: string;
      endDate?: string;
      page: number;
      limit: number;
    };
    const result = await listAllComments({
      showId: query.showId,
      userId: query.userId,
      isSpoiler: query.isSpoiler,
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
    const query = req.query as unknown as { page: number; limit: number };
    const result = await getNotificationHistory(query.page, query.limit);
    res.json(result);
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
