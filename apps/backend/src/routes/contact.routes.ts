import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/requireAuth.middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { validateRequest } from "../validators/validateRequest.js";
import { createContactSchema } from "../validators/contact.validator.js";
import { ContactMessage } from "../models/contactMessage.model.js";
import { User } from "../models/user.model.js";
import { translate } from "../i18n/index.js";

const router: Router = Router();

const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = req.language;
    res.status(429).json({
      error: {
        code: "TOO_MANY_CONTACT_REQUESTS",
        message: translate("TOO_MANY_CONTACT_REQUESTS", lang) ?? "Too many contact requests. Try again later.",
      },
    });
  },
});

router.post(
  "/",
  requireAuth,
  contactRateLimiter,
  validateRequest(createContactSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { category, subject, message } = req.body;

    const user = await User.findById(req.userId).select("email username").lean();
    if (!user) {
      res.status(404).json({
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      });
      return;
    }

    const doc = await ContactMessage.create({
      userId: req.userId,
      email: user.email,
      username: user.username,
      category,
      subject,
      message,
      status: "new",
    });

    import("../services/admin/adminFeedNotification.service.js")
      .then(({ createNotification }) =>
        createNotification({
          type: "new_contact",
          title: `New contact message: ${category}`,
          message: `${user.username}: ${subject}`,
          severity: category === "bug" ? "warning" : "info",
          metadata: {
            refId: doc._id.toString(),
            refType: "contact_message",
            userId: req.userId,
            username: user.username,
          },
        }),
      )
      .catch(() => {});

    res.status(201).json({
      id: doc._id.toString(),
      createdAt: doc.createdAt?.toISOString(),
    });
  }),
);

export default router;
