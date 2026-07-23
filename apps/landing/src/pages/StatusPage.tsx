import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number | null;
}

interface StatusResponse {
  overallStatus: "operational" | "degraded" | "down";
  timestamp: string;
  services: ServiceStatus[];
  cached?: boolean;
}

const API_URL = "https://api.watchr.me";

const STATUS_CONFIG = {
  operational: {
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
    dot: "bg-green-500",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    dot: "bg-yellow-500",
  },
  down: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    dot: "bg-red-500",
  },
};

export function StatusPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setError(false);
      setRefreshing(true);
      const res = await fetch(`${API_URL}/internal/status`);
      if (!res.ok) throw new Error("Failed to fetch status");
      const json = (await res.json()) as StatusResponse;
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const overallConfig = data ? STATUS_CONFIG[data.overallStatus] : STATUS_CONFIG.operational;
  const OverallIcon = overallConfig.icon;

  return (
    <>
      <Helmet>
        <title>{t("status.title")} — Watchr</title>
        <meta name="description" content={t("status.subtitle")} />
        <link rel="canonical" href="https://watchr.me/status" />
        <meta property="og:title" content={`${t("status.title")} — Watchr`} />
        <meta property="og:description" content={t("status.subtitle")} />
        <meta property="og:url" content="https://watchr.me/status" />
      </Helmet>

      <div className="pt-32 pb-20 sm:pt-40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
                {t("status.title")}
              </h1>
              <p className="mt-3 text-lg text-text-muted">
                {t("status.subtitle")}
              </p>
            </div>
            <button
              onClick={fetchStatus}
              disabled={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:text-primary disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="mt-12 flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-text-muted" />
              <span className="ml-3 text-text-muted">{t("status.loading")}</span>
            </div>
          ) : error ? (
            <div className="mt-12 rounded-2xl border border-border bg-surface p-8 text-center">
              <XCircle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-4 text-text-muted">{t("status.error")}</p>
            </div>
          ) : data ? (
            <>
              <div className={`mt-8 rounded-2xl border border-border ${overallConfig.bg} p-6`}>
                <div className="flex items-center gap-4">
                  <OverallIcon className={`h-8 w-8 ${overallConfig.color}`} />
                  <div>
                    <p className={`text-xl font-semibold ${overallConfig.color}`}>
                      {t(`status.overall.${data.overallStatus}`)}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {t("status.lastUpdated")}: {new Date(data.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {data.services.map((service) => {
                  const config = STATUS_CONFIG[service.status];
                  const Icon = config.icon;
                  return (
                    <div
                      key={service.name}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${config.dot}`} />
                        <span className="font-medium text-text">
                          {t(`status.services.${service.name}`)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {service.latencyMs !== null && (
                          <span className="text-xs text-text-muted">
                            {service.latencyMs}ms
                          </span>
                        )}
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
