import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Trash2,
  Activity,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Checkbox } from "../components/ui/Checkbox";
import { Dialog } from "../components/ui/Dialog";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDate } from "../lib/utils";
import { logError } from "../lib/logger";

interface ServiceCheck {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number | null;
  error: string | null;
}

interface HistoryEntry {
  timestamp: string;
  overallStatus: string;
  services: ServiceCheck[];
}

interface UptimeEntry {
  uptimePct: number;
  lastIncident: string | null;
}

interface StatusData {
  current: {
    overallStatus: string;
    timestamp: string;
    services: ServiceCheck[];
  };
  history: HistoryEntry[];
  uptime: Record<string, UptimeEntry>;
  monitorEnabled: boolean;
  publicServices: string[];
  allServiceNames: string[];
}

const STATUS_CONFIG = {
  operational: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", dot: "bg-green-500", label: "Operational" },
  degraded: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", dot: "bg-yellow-500", label: "Degraded" },
  down: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", dot: "bg-red-500", label: "Down" },
};

const SERVICE_LABELS: Record<string, string> = {
  mongodb: "MongoDB",
  redis: "Redis",
  tmdb: "TMDB API",
  websocket: "WebSocket",
  email: "Email/SMTP",
  posthog: "PostHog",
  firebase: "Firebase",
  s3: "S3/MinIO",
};

export function Status() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [togglingMonitor, setTogglingMonitor] = useState(false);
  const [savingPublic, setSavingPublic] = useState(false);
  const [publicServices, setPublicServices] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const { data: result } = await api.get(`/admin/status?days=${days}`);
      setData(result);
      setPublicServices(result.publicServices ?? []);
    } catch (err) {
      logError("Failed to load status", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleManualCheck() {
    try {
      setChecking(true);
      await api.post("/admin/status/check");
      await load();
    } catch (err) {
      logError("Failed to run manual check", err);
    } finally {
      setChecking(false);
    }
  }

  async function handleResetHistory() {
    try {
      setResetting(true);
      await api.delete("/admin/status/history");
      setShowResetDialog(false);
      await load();
    } catch (err) {
      logError("Failed to reset history", err);
    } finally {
      setResetting(false);
    }
  }

  async function handleToggleMonitor() {
    if (!data) return;
    const newEnabled = !data.monitorEnabled;
    try {
      setTogglingMonitor(true);
      await api.patch("/admin/status/monitor", { enabled: newEnabled });
      setData((prev) => (prev ? { ...prev, monitorEnabled: newEnabled } : prev));
    } catch (err) {
      logError("Failed to toggle monitor", err);
    } finally {
      setTogglingMonitor(false);
    }
  }

  async function handleTogglePublicService(name: string) {
    const updated = publicServices.includes(name)
      ? publicServices.filter((s) => s !== name)
      : [...publicServices, name];
    setPublicServices(updated);
    try {
      setSavingPublic(true);
      await api.patch("/admin/status/public-services", { services: updated });
    } catch (err) {
      logError("Failed to update public services", err);
      setPublicServices(publicServices);
    } finally {
      setSavingPublic(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const overallConfig = STATUS_CONFIG[data.current.overallStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.operational;
  const OverallIcon = overallConfig.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">System Status</h1>
          <p className="text-sm text-text-muted">Monitor and manage all backend services</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleManualCheck} disabled={checking}>
            <Activity className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            Run Check Now
          </Button>
        </div>
      </div>

      {/* Overall status */}
      <Card className={overallConfig.bg}>
        <CardContent className="flex items-center gap-4 py-6">
          <OverallIcon className={`h-10 w-10 ${overallConfig.color}`} />
          <div>
            <p className={`text-xl font-semibold ${overallConfig.color}`}>
              {overallConfig.label}
            </p>
            <p className="text-xs text-text-muted">
              Last checked: {formatDate(data.current.timestamp)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Services table */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({data.current.services.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.current.services.map((service) => {
              const config = STATUS_CONFIG[service.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.operational;
              const Icon = config.icon;
              return (
                <div
                  key={service.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${config.dot}`} />
                    <span className="font-medium text-text">
                      {SERVICE_LABELS[service.name] ?? service.name}
                    </span>
                    {service.error && (
                      <span className="text-xs text-red-400">{service.error}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {service.latencyMs !== null && (
                      <span className="text-xs text-text-muted">{service.latencyMs}ms</span>
                    )}
                    <Badge className={config.bg + " " + config.color}>
                      <Icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Uptime stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Uptime History</CardTitle>
            <div className="flex gap-1">
              <Button
                variant={days === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(7)}
              >
                7 days
              </Button>
              <Button
                variant={days === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(30)}
              >
                30 days
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.uptime).map(([name, stats]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
              >
                <span className="font-medium text-text">
                  {SERVICE_LABELS[name] ?? name}
                </span>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold ${
                    stats.uptimePct >= 99
                      ? "text-green-500"
                      : stats.uptimePct >= 95
                        ? "text-yellow-500"
                        : "text-red-500"
                  }`}>
                    {stats.uptimePct}%
                  </span>
                  <span className="text-xs text-text-muted">
                    {stats.lastIncident
                      ? `Last incident: ${formatDate(stats.lastIncident)}`
                      : "No incidents"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {data.history.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs text-text-muted">
                {data.history.length} snapshots in the last {days} days
              </p>
              <div className="flex flex-wrap gap-1">
                {data.history.slice(-100).map((entry, i) => {
                  const config = STATUS_CONFIG[entry.overallStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.operational;
                  return (
                    <div
                      key={i}
                      className={`h-8 w-1 rounded-sm ${config.dot}`}
                      title={`${formatDate(entry.timestamp)}: ${config.label}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin controls */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monitor toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-3">
              {data.monitorEnabled ? (
                <ToggleRight className="h-6 w-6 text-green-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-text-muted" />
              )}
              <div>
                <p className="font-medium text-text">Status Monitor</p>
                <p className="text-xs text-text-muted">
                  Cron job that checks services every 5 minutes
                </p>
              </div>
            </div>
            <Button
              variant={data.monitorEnabled ? "outline" : "default"}
              size="sm"
              onClick={handleToggleMonitor}
              disabled={togglingMonitor}
            >
              {data.monitorEnabled ? "Disable" : "Enable"}
            </Button>
          </div>

          {/* Public services visibility */}
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="mb-3 font-medium text-text">Public Services Visibility</p>
            <p className="mb-4 text-xs text-text-muted">
              Services visible on the public status page (landing /status)
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.allServiceNames.map((name) => (
                <label
                  key={name}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 hover:bg-surface"
                >
                  <Checkbox
                    checked={publicServices.includes(name)}
                    onChange={() => handleTogglePublicService(name)}
                    disabled={savingPublic}
                  />
                  <span className="text-sm text-text">
                    {SERVICE_LABELS[name] ?? name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Reset history */}
          <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <div>
              <p className="font-medium text-text">Reset History</p>
              <p className="text-xs text-text-muted">
                Delete all stored status snapshots from MongoDB
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset confirmation dialog */}
      <Dialog
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        title="Reset Status History"
      >
        <p className="text-sm text-text-muted">
          Are you sure you want to delete all status history? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowResetDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleResetHistory}
            disabled={resetting}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {resetting ? "Deleting..." : "Delete All"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
