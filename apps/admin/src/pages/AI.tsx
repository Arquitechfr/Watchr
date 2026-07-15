import { useEffect, useState, useCallback } from "react";
import {
  BrainCircuit,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Cpu,
} from "lucide-react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Dialog } from "../components/ui/Dialog";
import { formatDate } from "../lib/utils";

interface AiStatus {
  configured: boolean;
  apiKeysCount: number;
  defaultChatModel: string;
  defaultEmbeddingsModel: string;
  rateLimiter: { capacity: number; refillRate: string };
}

interface AiStats {
  totalCalls: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  tokens: { prompt: number; completion: number; total: number };
  latency: { avg: number; max: number; min: number };
  byService: { service: string; count: number; errors: number }[];
  daily: { date: string; total: number; errors: number }[];
}

interface AiFlag {
  key: string;
  enabled: boolean;
  description: string;
}

interface AiLogEntry {
  id: string;
  service: string;
  action: string;
  feature: string;
  status: "success" | "error";
  model: string;
  tokens: { prompt: number; completion: number; total: number };
  latencyMs: number;
  userId: string | null;
  errorMessage: string | null;
  prompt: string | null;
  response: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AiLogsResponse {
  logs: AiLogEntry[];
  total: number;
  page: number;
  limit: number;
}

const FEATURE_LABELS: Record<string, string> = {
  content_moderation: "Content Moderation",
  ai_search: "AI Search",
  recommendations: "Recommendations",
  import_matching: "Import Matching",
  improve_text: "Improve Text",
  unknown: "Unknown",
};

const FEATURE_COLORS: Record<string, string> = {
  content_moderation: "bg-purple-500/20 text-purple-400",
  ai_search: "bg-blue-500/20 text-blue-400",
  recommendations: "bg-green-500/20 text-green-400",
  import_matching: "bg-yellow-500/20 text-yellow-400",
  improve_text: "bg-pink-500/20 text-pink-400",
  unknown: "bg-gray-500/20 text-gray-400",
};

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-500/20 text-green-400",
  error: "bg-red-500/20 text-red-400",
};

const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  ai_search_enabled: { label: "AI Search", description: "Natural language search via Mistral" },
  ai_recommendations_enabled: { label: "AI Recommendations", description: "Personalized show recommendations" },
  ai_spoiler_detection_enabled: { label: "Spoiler Detection", description: "AI-powered spoiler detection on comments" },
  ai_toxic_detection_enabled: { label: "Toxic Detection", description: "AI-powered toxic content detection on comments" },
  ai_import_matching_enabled: { label: "Import Matching", description: "AI fuzzy matching for TV Time import titles" },
  ai_news_summary_enabled: { label: "News Summary", description: "AI-generated summaries for RSS news articles" },
  ai_thread_summary_enabled: { label: "Thread Summary", description: "AI summary of long comment threads" },
  ai_comment_translation_enabled: { label: "Comment Translation", description: "AI automatic comment translation to user's preferred language" },
  ai_push_personalization_enabled: { label: "Push Personalization", description: "AI-personalized push notification text" },
  ai_insights_enabled: { label: "Watch Insights", description: "AI-generated narrative insights from user stats" },
  ai_mood_recommendations_enabled: { label: "Mood Recommendations", description: "Recommendations based on user mood input" },
  ai_similar_shows_enabled: { label: "Similar Shows", description: "AI-suggested similar shows on detail page" },
  ai_email_digest_enabled: { label: "Email Digest", description: "AI-generated weekly email digest" },
  ai_semantic_search_enabled: { label: "Semantic Search", description: "Embeddings-based semantic search for shows" },
  ai_onboarding_suggestions_enabled: { label: "Onboarding Suggestions", description: "AI suggestions during onboarding flow" },
  ai_admin_assistant_enabled: { label: "Admin Assistant", description: "Extended admin AI tools (announcements, report replies, trends)" },
  ai_news_filtering_enabled: { label: "News Filtering", description: "Filter news based on tracked shows" },
  ai_reengagement_enabled: { label: "Re-engagement", description: "AI-personalized re-engagement messages for inactive users" },
  activation_nudge_enabled: { label: "Activation Nudge", description: "Static push nudge for users inactive 24-72h after signup with no tracked shows" },
  ai_year_in_review_enabled: { label: "Year in Review", description: "AI-generated yearly recap (Spotify Wrapped style)" },
  ai_anomaly_detection_enabled: { label: "Anomaly Detection", description: "AI detection of suspicious user behavior patterns" },
  ai_episode_summary_enabled: { label: "Episode Summary", description: "AI-generated summaries for episodes without descriptions" },
  ai_tags_enrichment_enabled: { label: "Tags Enrichment", description: "AI-generated thematic tags for shows beyond TMDB genres" },
};

const SERVICE_COLORS: string[] = [
  "bg-primary",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
];

export function AI() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [stats, setStats] = useState<AiStats | null>(null);
  const [flags, setFlags] = useState<AiFlag[]>([]);
  const [logs, setLogs] = useState<AiLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ service: "", status: "", feature: "", search: "" });
  const [detail, setDetail] = useState<AiLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (filters.service) params.service = filters.service;
      if (filters.status) params.status = filters.status;
      if (filters.feature) params.feature = filters.feature;
      if (filters.search) params.search = filters.search;

      const [statusRes, statsRes, flagsRes, logsRes] = await Promise.all([
        api.get("/admin/ai/status"),
        api.get("/admin/ai/stats", { params: { days: 30 } }),
        api.get("/admin/ai/flags"),
        api.get("/admin/ai/logs", { params }),
      ]);
      setStatus(statusRes.data);
      setStats(statsRes.data);
      setFlags(flagsRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      console.error("Failed to load AI data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggleFlag(key: string, currentValue: boolean) {
    setTogglingFlag(key);
    const prevFlags = flags;
    setFlags(flags.map((f) => (f.key === key ? { ...f, enabled: !currentValue } : f)));
    try {
      await api.put(`/admin/ai/flags/${key}`, { value: !currentValue });
    } catch (err) {
      setFlags(prevFlags);
      console.error("Failed to toggle flag:", err);
    } finally {
      setTogglingFlag(null);
    }
  }

  const [detailLoading, setDetailLoading] = useState(false);

  async function openDetail(log: AiLogEntry) {
    setDetail(log);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/ai/logs/${log.id}`);
      setDetail(res.data);
    } catch (err) {
      console.error("Failed to fetch log detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  function applyFilters() {
    setPage(1);
    loadData();
  }

  function resetFilters() {
    setFilters({ service: "", status: "", feature: "", search: "" });
    setPage(1);
  }

  const totalPages = logs ? Math.ceil(logs.total / logs.limit) : 0;
  const maxDailyTotal = Math.max(...(stats?.daily.map((d) => d.total) ?? [1]), 1);
  const maxServiceCount = Math.max(...(stats?.byService.map((s) => s.count) ?? [1]), 1);

  const kpiCards = [
    { label: "Total Calls", value: stats?.totalCalls ?? 0, icon: Activity, color: "text-text" },
    { label: "Success Rate", value: `${stats?.successRate ?? 0}%`, icon: CheckCircle2, color: "text-green-400" },
    { label: "Total Tokens", value: (stats?.tokens.total ?? 0).toLocaleString(), icon: Zap, color: "text-primary" },
    { label: "Avg Latency", value: `${stats?.latency.avg ?? 0}ms`, icon: Clock, color: "text-blue-400" },
    { label: "Errors", value: stats?.errorCount ?? 0, icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BrainCircuit className="text-primary" size={28} />
        AI Dashboard
      </h1>

      {/* Section 1 — Mistral Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu size={20} /> Mistral Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1">Status</p>
              {loading ? (
                <Skeleton width={80} height={24} />
              ) : status?.configured ? (
                <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1 w-fit">
                  <CheckCircle2 size={14} /> Configured
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 flex items-center gap-1 w-fit">
                  <XCircle size={14} /> Not Configured
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">API Keys</p>
              <p className="text-sm font-medium">
                {status?.apiKeysCount ? `${status.apiKeysCount} configured` : "None"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Chat Model</p>
              <p className="text-sm font-medium font-mono">{status?.defaultChatModel ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Rate Limiter</p>
              <p className="text-sm font-medium">
                {status?.rateLimiter.capacity ?? "—"} req / {status?.rateLimiter.refillRate ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex items-center gap-3">
              <kpi.icon className={kpi.color} size={20} />
              <div>
                <p className="text-xs text-text-muted">{kpi.label}</p>
                {loading ? (
                  <Skeleton width={50} height={20} />
                ) : (
                  <p className="text-xl font-bold">{kpi.value}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily calls chart */}
        <Card>
          <CardHeader>
            <CardTitle>Calls (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height={160} />
            ) : stats && stats.daily.length > 0 ? (
              <div className="flex items-end gap-2 h-40">
                {stats.daily.map((day) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5 justify-end h-full">
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{ height: `${(day.total / maxDailyTotal) * 100}%`, minHeight: "2px" }}
                        title={`${day.total} calls`}
                      />
                      {day.errors > 0 && (
                        <div
                          className="w-full bg-red-500 rounded-t"
                          style={{ height: `${(day.errors / maxDailyTotal) * 50}%`, minHeight: "2px" }}
                          title={`${day.errors} errors`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {day.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-8">No data for the last 7 days</p>
            )}
          </CardContent>
        </Card>

        {/* By service */}
        <Card>
          <CardHeader>
            <CardTitle>By Service</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height={160} />
            ) : stats && stats.byService.length > 0 ? (
              <div className="space-y-3">
                {stats.byService.map((item, i) => (
                  <div key={item.service}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.service}</span>
                      <span className="text-xs text-text-muted">
                        {item.count} calls{item.errors > 0 ? ` · ${item.errors} errors` : ""}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-background overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SERVICE_COLORS[i % SERVICE_COLORS.length]}`}
                        style={{ width: `${(item.count / maxServiceCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-8">No service data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3 — Feature Flags */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={48} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => {
              const meta = FLAG_LABELS[flag.key] ?? { label: flag.key, description: flag.description };
              return (
                <div
                  key={flag.key}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{meta.label}</p>
                    <p className="text-xs text-text-muted">{meta.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                    disabled={togglingFlag === flag.key}
                    className={`relative ml-4 h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                      flag.enabled ? "bg-primary" : "bg-surface-light"
                    }`}
                    aria-label={`Toggle ${meta.label}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        flag.enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Logs */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Service</label>
              <select
                value={filters.service}
                onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                <option value="MistralService">MistralService</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Feature</label>
              <select
                value={filters.feature}
                onChange={(e) => setFilters({ ...filters, feature: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                <option value="content_moderation">Content Moderation</option>
                <option value="ai_search">AI Search</option>
                <option value="recommendations">Recommendations</option>
                <option value="import_matching">Import Matching</option>
                <option value="improve_text">Improve Text</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-sm text-text-muted">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Service, action, feature, model..."
                  className="pl-9"
                />
              </div>
            </div>
            <Button onClick={applyFilters} size="sm">Apply</Button>
            <Button onClick={resetFilters} variant="ghost" size="sm">Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs ({logs?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="hidden md:table-cell">Feature</TableHead>
                <TableHead className="hidden md:table-cell">Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Tokens</TableHead>
                <TableHead className="hidden lg:table-cell">Latency</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : logs && logs.logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <EmptyState
                          icon={BrainCircuit}
                          title="No AI logs found"
                          description={filters.service || filters.status || filters.feature || filters.search ? "Try adjusting your filters." : "No AI calls have been logged yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : logs?.logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => openDetail(log)}>
                      <TableCell className="font-medium">{log.service}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={FEATURE_COLORS[log.feature] ?? FEATURE_COLORS.unknown}>
                          {FEATURE_LABELS[log.feature] ?? log.feature}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell">{log.action}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[log.status] ?? "bg-gray-500/20 text-gray-400"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden md:table-cell">
                        {log.tokens.total > 0 ? log.tokens.total.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">
                        {log.latencyMs > 0 ? `${log.latencyMs}ms` : "—"}
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden md:table-cell">{formatDate(log.createdAt)}</TableCell>
                      <TableCell>
                        <Eye size={16} className="text-text-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>

          {logs && logs.total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-muted">
                Page {logs.page} of {totalPages} ({logs.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} title="AI Log Detail">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted mb-1">Service</p>
                <p className="font-medium">{detail.service}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Feature</p>
                <Badge className={FEATURE_COLORS[detail.feature] ?? FEATURE_COLORS.unknown}>
                  {FEATURE_LABELS[detail.feature] ?? detail.feature}
                </Badge>
              </div>
              <div>
                <p className="text-text-muted mb-1">Action</p>
                <p className="font-medium">{detail.action}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Status</p>
                <Badge className={STATUS_COLORS[detail.status] ?? "bg-gray-500/20 text-gray-400"}>
                  {detail.status}
                </Badge>
              </div>
              <div>
                <p className="text-text-muted mb-1">Model</p>
                <p className="font-medium font-mono">{detail.model}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Tokens (prompt / completion / total)</p>
                <p className="font-medium">
                  {detail.tokens.prompt.toLocaleString()} / {detail.tokens.completion.toLocaleString()} / {detail.tokens.total.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Latency</p>
                <p className="font-medium">{detail.latencyMs}ms</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">User ID</p>
                <p className="font-medium font-mono text-xs">{detail.userId ?? "—"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Date</p>
                <p className="font-medium">{formatDate(detail.createdAt)}</p>
              </div>
            </div>

            {detailLoading ? (
              <div className="space-y-2">
                <Skeleton height={20} />
                <Skeleton height={100} />
                <Skeleton height={100} />
              </div>
            ) : (
              <>
                {detail.prompt && (
                  <div>
                    <p className="text-text-muted mb-1 text-sm">Prompt sent to AI</p>
                    <pre className="text-xs bg-background rounded-md p-3 overflow-auto max-h-48 border border-border whitespace-pre-wrap">{detail.prompt}</pre>
                  </div>
                )}

                {detail.response && (
                  <div>
                    <p className="text-text-muted mb-1 text-sm">AI Response</p>
                    <pre className="text-xs bg-background rounded-md p-3 overflow-auto max-h-48 border border-border whitespace-pre-wrap">{detail.response}</pre>
                  </div>
                )}
              </>
            )}

            {detail.errorMessage && (
              <div>
                <p className="text-text-muted mb-1 text-sm">Error</p>
                <p className="text-red-400 text-sm bg-red-500/10 rounded-md p-3">{detail.errorMessage}</p>
              </div>
            )}

            {Object.keys(detail.metadata).length > 0 && (
              <div>
                <p className="text-text-muted mb-1 text-sm">Metadata</p>
                <pre className="text-xs bg-background rounded-md p-3 overflow-auto max-h-48 border border-border">
                  {JSON.stringify(detail.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
