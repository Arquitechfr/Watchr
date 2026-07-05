import { z } from "zod";

export const jobIdParamSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
});

export const reviewIdParamSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  reviewId: z.string().min(1, "Review ID is required"),
});

export const resolveReviewBodySchema = z.object({
  tmdbId: z.number().int().positive().optional(),
  skip: z.boolean().optional(),
}).refine((data) => data.tmdbId !== undefined || data.skip === true, {
  message: "Either tmdbId or skip must be provided",
});
