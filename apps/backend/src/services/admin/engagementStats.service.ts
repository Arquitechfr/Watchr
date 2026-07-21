import axios from "axios";
import { env } from "../../config/env.js";
import { log, logError } from "../../lib/logger.js";

const POSTHOG_PROJECT_ID = "223410";

async function runHogQL(query: string): Promise<Record<string, unknown>[]> {
  try {
    const response = await axios.post(
      `${env.POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`,
      { query: { kind: "HogQLQuery", query } },
      {
        headers: {
          Authorization: `Bearer ${env.POSTHOG_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );
    return (response.data?.results ?? []) as Record<string, unknown>[];
  } catch (err) {
    logError("EngagementStats", "HogQL query failed", err, { query });
    return [];
  }
}

export async function getEngagementStats(): Promise<{
  pushTaps30d: number;
  pushReceived30d: number;
  emailOpens30d: number;
  emailClicks30d: number;
}> {
  const [tapResults, receivedResults, openResults, clickResults] = await Promise.all([
    runHogQL("SELECT count() as total FROM events WHERE event = 'push_notification_tapped' AND timestamp > now() - INTERVAL 30 DAY"),
    runHogQL("SELECT count() as total FROM events WHERE event = 'push_notification_received' AND timestamp > now() - INTERVAL 30 DAY"),
    runHogQL("SELECT count() as total FROM events WHERE event = 'email_opened' AND timestamp > now() - INTERVAL 30 DAY"),
    runHogQL("SELECT count() as total FROM events WHERE event = 'email_clicked' AND timestamp > now() - INTERVAL 30 DAY"),
  ]);

  const extractCount = (rows: Record<string, unknown>[]): number => {
    if (rows.length === 0) return 0;
    const val = rows[0]?.total;
    return typeof val === "number" ? val : Number(val) || 0;
  };

  const stats = {
    pushTaps30d: extractCount(tapResults),
    pushReceived30d: extractCount(receivedResults),
    emailOpens30d: extractCount(openResults),
    emailClicks30d: extractCount(clickResults),
  };

  log("EngagementStats", "fetched", stats);
  return stats;
}
