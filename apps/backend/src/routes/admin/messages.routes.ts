import { Router, Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import {
  adminListConversations,
  adminGetConversationDetail,
  adminListMessageReports,
  adminResolveReport,
  adminDismissReport,
  adminDeleteMessage,
  adminGetMessageStats,
  adminListBlocks,
} from "../../services/admin/adminMessage.service.js";

const router: Router = Router();

router.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminGetMessageStats();
    res.json(result);
  }),
);

router.get(
  "/conversations",
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { page: string; limit: string; userId?: string };
    const result = await adminListConversations(
      Number(query.page) || 1,
      Number(query.limit) || 20,
      query.userId,
    );
    res.json(result);
  }),
);

router.get(
  "/conversations/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await adminGetConversationDetail(id);
    res.json(result);
  }),
);

router.get(
  "/reports",
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { page: string; limit: string; status?: string };
    const result = await adminListMessageReports(
      Number(query.page) || 1,
      Number(query.limit) || 20,
      query.status,
    );
    res.json(result);
  }),
);

router.patch(
  "/reports/:id/resolve",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await adminResolveReport(id, req.userId!);
    res.json(result);
  }),
);

router.patch(
  "/reports/:id/dismiss",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await adminDismissReport(id, req.userId!);
    res.json(result);
  }),
);

router.delete(
  "/messages/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await adminDeleteMessage(id);
    res.json(result);
  }),
);

router.get(
  "/blocks",
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { page: string; limit: string; userId?: string };
    const result = await adminListBlocks(
      Number(query.page) || 1,
      Number(query.limit) || 20,
      query.userId,
    );
    res.json(result);
  }),
);

export default router;
