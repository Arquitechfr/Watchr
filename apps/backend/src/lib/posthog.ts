import { PostHog } from "posthog-node";
import { env } from "../config/env.js";

export const posthogClient = new PostHog(env.POSTHOG_API_KEY, {
  host: env.POSTHOG_HOST,
});
