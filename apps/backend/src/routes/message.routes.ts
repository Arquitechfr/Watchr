import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { validateRequest } from "../validators/validateRequest.js";
import {
  targetUserIdParamSchema,
  conversationIdParamSchema,
  messageIdParamSchema,
  sendMessageSchema,
  editMessageSchema,
  reactionSchema,
  reportMessageSchema,
  conversationListQuerySchema,
  messageListQuerySchema,
  markReadSchema,
} from "../validators/message.validator.js";
import {
  archiveConversationSchema,
  muteConversationSchema,
} from "../validators/conversation.validator.js";
import {
  createConversation,
  sendMessage,
  getConversations,
  getMessages,
  markAsRead,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  archiveConversation,
  unarchiveConversation,
  muteConversation,
  unmuteConversation,
  deleteConversation,
  undeleteConversation,
  reportMessage,
  getUnreadCount,
  getDmContacts,
} from "../services/message.service.js";

const router: Router = Router();

router.use(requireAuth);

const messageRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  errorCode: "TOO_MANY_MESSAGE_REQUESTS",
});

router.post(
  "/conversations/:targetUserId",
  messageRateLimiter,
  validateRequest(undefined, undefined, targetUserIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { targetUserId } = req.params;
    const result = await createConversation(req.userId!, targetUserId);
    res.status(201).json(result);
  }),
);

router.get(
  "/conversations",
  validateRequest(undefined, conversationListQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { page: string; limit: string; archived: string };
    const result = await getConversations(
      req.userId!,
      Number(query.page) || 1,
      Number(query.limit) || 20,
      query.archived === "true",
    );
    res.json(result);
  }),
);

router.get(
  "/conversations/:conversationId",
  validateRequest(undefined, undefined, conversationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const result = await getMessages(conversationId, req.userId!, 1, 50);
    res.json(result);
  }),
);

router.get(
  "/conversations/:conversationId/messages",
  validateRequest(undefined, messageListQuerySchema, conversationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const query = req.query as { page: string; limit: string; before?: string };
    const result = await getMessages(
      conversationId,
      req.userId!,
      Number(query.page) || 1,
      Number(query.limit) || 50,
      query.before,
    );
    res.json(result);
  }),
);

router.post(
  "/conversations/:conversationId/messages",
  messageRateLimiter,
  validateRequest(sendMessageSchema, undefined, conversationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { content, attachments } = req.body;
    const result = await sendMessage(conversationId, req.userId!, content, attachments);
    res.status(201).json(result);
  }),
);

router.patch(
  "/:messageId",
  messageRateLimiter,
  validateRequest(editMessageSchema, undefined, messageIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const result = await editMessage(req.userId!, messageId, content);
    res.json(result);
  }),
);

router.delete(
  "/:messageId",
  validateRequest(undefined, undefined, messageIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const result = await deleteMessage(req.userId!, messageId);
    res.json(result);
  }),
);

router.post(
  "/:messageId/reactions",
  validateRequest(reactionSchema, undefined, messageIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const result = await addReaction(req.userId!, messageId, emoji);
    res.status(201).json(result);
  }),
);

router.delete(
  "/:messageId/reactions",
  validateRequest(reactionSchema, undefined, messageIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const result = await removeReaction(req.userId!, messageId, emoji);
    res.json(result);
  }),
);

router.post(
  "/:messageId/report",
  messageRateLimiter,
  validateRequest(reportMessageSchema, undefined, messageIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const { reason } = req.body;
    const result = await reportMessage(req.userId!, messageId, reason);
    res.status(201).json(result);
  }),
);

router.post(
  "/conversations/:conversationId/read",
  validateRequest(markReadSchema, undefined, conversationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { messageIds } = req.body;
    const result = await markAsRead(conversationId, req.userId!, messageIds);
    res.json(result);
  }),
);

router.patch(
  "/conversations/:conversationId/archive",
  validateRequest(archiveConversationSchema, undefined, conversationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { archived } = req.body;
    const result = archived
      ? await archiveConversation(req.userId!, conversationId)
      : await unarchiveConversation(req.userId!, conversationId);
    res.json(result);
  }),
);

router.patch(
  "/conversations/:conversationId/mute",
  validateRequest(muteConversationSchema, undefined, conversationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { muted } = req.body;
    const result = muted
      ? await muteConversation(req.userId!, conversationId)
      : await unmuteConversation(req.userId!, conversationId);
    res.json(result);
  }),
);

router.delete(
  "/conversations/:conversationId",
  validateRequest(undefined, undefined, conversationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const result = await deleteConversation(req.userId!, conversationId);
    res.json(result);
  }),
);

router.patch(
  "/conversations/:conversationId/restore",
  validateRequest(undefined, undefined, conversationIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const result = await undeleteConversation(req.userId!, conversationId);
    res.json(result);
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getUnreadCount(req.userId!);
    res.json(result);
  }),
);

router.get(
  "/contacts",
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await getDmContacts(req.userId!, page, limit);
    res.json(result);
  }),
);

export default router;
