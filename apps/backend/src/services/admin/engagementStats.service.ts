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
          Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY ?? env.POSTHOG_API_KEY}`,
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

interface DailyPoint {
  date: string;
  count: number;
}

interface EngagementResponse {
  totals: {
    pushTaps30d: number;
    pushReceived30d: number;
    emailOpens30d: number;
    emailClicks30d: number;
    emailSent30d: number;
  };
  series: {
    pushTaps: DailyPoint[];
    pushReceived: DailyPoint[];
    emailOpens: DailyPoint[];
    emailClicks: DailyPoint[];
  };
  rates: {
    pushTapRate: number;
    emailOpenRate: number;
    emailClickRate: number;
  };
}

function extractCount(rows: Record<string, unknown>[]): number {
  if (rows.length === 0) return 0;
  const val = rows[0]?.total;
  return typeof val === "number" ? val : Number(val) || 0;
}

function extractDailySeries(rows: Record<string, unknown>[], valueKey: string = "count"): DailyPoint[] {
  return rows.map((row) => ({
    date: String(row.day ?? ""),
    count: typeof row[valueKey] === "number" ? (row[valueKey] as number) : Number(row[valueKey]) || 0,
  }));
}

export async function getEngagementStats(): Promise<EngagementResponse> {
  const [
    tapTotal,
    receivedTotal,
    openTotal,
    clickTotal,
    sentTotal,
    tapSeries,
    receivedSeries,
    openSeries,
    clickSeries,
  ] = await Promise.all([
    runHogQL("SELECT count() as total FROM events WHERE event = 'push_notification_tapped' AND timestamp > now() - INTERVAL 30 DAY"),
    runHogQL("SELECT count() as total FROM events WHERE event = 'push_notification_received' AND timestamp > now() - INTERVAL 30 DAY"),
    runHogQL("SELECT count() as total FROM events WHERE event = 'email_opened' AND timestamp > now() - INTERVAL 30 DAY"),
    runHogQL("SELECT count() as total FROM events WHERE event = 'email_clicked' AND timestamp > now() - INTERVAL 30 DAY"),
    runHogQL("SELECT count() as total FROM events WHERE event = 'email_sent' AND timestamp > now() - INTERVAL 30 DAY"),
    runHogQL("SELECT toDate(timestamp) as day, count() as count FROM events WHERE event = 'push_notification_tapped' AND timestamp > now() - INTERVAL 30 DAY GROUP BY day ORDER BY day"),
    runHogQL("SELECT toDate(timestamp) as day, count() as count FROM events WHERE event = 'push_notification_received' AND timestamp > now() - INTERVAL 30 DAY GROUP BY day ORDER BY day"),
    runHogQL("SELECT toDate(timestamp) as day, count() as count FROM events WHERE event = 'email_opened' AND timestamp > now() - INTERVAL 30 DAY GROUP BY day ORDER BY day"),
    runHogQL("SELECT toDate(timestamp) as day, count() as count FROM events WHERE event = 'email_clicked' AND timestamp > now() - INTERVAL 30 DAY GROUP BY day ORDER BY day"),
  ]);

  const totals = {
    pushTaps30d: extractCount(tapTotal),
    pushReceived30d: extractCount(receivedTotal),
    emailOpens30d: extractCount(openTotal),
    emailClicks30d: extractCount(clickTotal),
    emailSent30d: extractCount(sentTotal),
  };

  const series = {
    pushTaps: extractDailySeries(tapSeries),
    pushReceived: extractDailySeries(receivedSeries),
    emailOpens: extractDailySeries(openSeries),
    emailClicks: extractDailySeries(clickSeries),
  };

  const rates = {
    pushTapRate: totals.pushReceived30d > 0 ? (totals.pushTaps30d / totals.pushReceived30d) * 100 : 0,
    emailOpenRate: totals.emailSent30d > 0 ? (totals.emailOpens30d / totals.emailSent30d) * 100 : 0,
    emailClickRate: totals.emailOpens30d > 0 ? (totals.emailClicks30d / totals.emailOpens30d) * 100 : 0,
  };

  const result = { totals, series, rates };
  log("EngagementStats", "fetched", result);
  return result;
}
