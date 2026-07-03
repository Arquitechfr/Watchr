import { NextFunction, Request, Response } from "express";
import { z, ZodSchema } from "zod";
import { ApiError } from "../middleware/error.middleware.js";

export function validateRequest(
  bodySchema?: ZodSchema,
  querySchema?: ZodSchema,
  paramsSchema?: ZodSchema,
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (bodySchema) {
        req.body = bodySchema.parse(req.body);
      }
      if (querySchema) {
        req.query = querySchema.parse(req.query) as unknown as Request["query"];
      }
      if (paramsSchema) {
        req.params = paramsSchema.parse(req.params) as unknown as Request["params"];
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const messages = err.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
        next(new ApiError(400, "VALIDATION_ERROR", `Validation failed: ${messages.join("; ")}`));
      } else {
        next(err);
      }
    }
  };
}
