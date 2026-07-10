import { useEffect, useState, useCallback, useRef, type FormEvent } from "react";
import { Send, Search, ChevronLeft, ChevronRight, Eye, Bell, Loader2 } from "lucide-react";
import api from "../lib/api";
import { AiImproveButton } from "../components/ui/AiImproveButton";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { useJobPolling } from "../hooks/useJobPolling";
import { formatDate } from "../lib/utils";

interface SentByInfo {
  id: string;
  username: string | null;
  email: string | null;
}

interface HistoryEntry {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  sentBy: SentByInfo | null;
  targetCount: number;
  successCount: number;
  failureCount: number;
  triggeredBy: string | null;
  locale: string | null;
  createdAt: string;
}

interface HistoryResponse {
  logs: HistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

interface NotificationStats {
  total: number;
  broadcast: number;
  targeted: number;
  automated: number;
  totalSuccess: number;
  totalFailure: number;
  successRate: number;
}

interface PushTicketEntry {
  id: string;
  pushToken: string;
  status: "ok" | "error";
  errorMessage: string | null;
  errorDetails: string | null;
  createdAt: string;
}

interface NotificationDetail {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  sentBy: SentByInfo | null;
  targetCount: number;
  successCount: number;
  failureCount: number;
  triggeredBy: string | null;
  locale: string | null;
  createdAt: string;
  tickets: PushTicketEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  broadcast: "bg-primary/20 text-primary",
  targeted: "bg-blue-500/20 text-blue-400",
  automated: "bg-purple-500/20 text-purple-400",
};

function getStatusBadge(success: number, failure: number, target: number) {
  if (failure === 0) return <Badge className="bg-green-500/20 text-green-400">Success</Badge>;
  if (success === 0) return <Badge className="bg-red-500/20 text-red-400">Failed</Badge>;
  if (success < target) return <Badge className="bg-yellow-500/20 text-yellow-400">Partial</Badge>;
  return <Badge className="bg-green-500/20 text-green-400">Success</Badge>;
}

export function Notifications() {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type: "" as string,
    search: "" as string,
  });
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    body: "",
    target: "all" as "all" | "locale",
    locale: "",
  });
  const [targetedForm, setTargetedForm] = useState({
    userId: "",
    title: "",
    body: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>("");
  const { job, isPolling, start: startPolling } = useJobPolling();
  const [detail, setDetail] = useState<NotificationDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; email: string; username: string }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!targetedForm.userId.includes("@")) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (targetedForm.userId.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const { data } = await api.get("/admin/users", {
          params: { search: targetedForm.userId, page: 1, limit: 5 },
        });
        setSuggestions(data.users ?? []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [targetedForm.userId]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;

      const [historyRes, statsRes] = await Promise.all([
        api.get("/admin/notifications/history", { params }),
        api.get("/admin/notifications/stats"),
      ]);
      setHistory(historyRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load notification history:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (job?.status === "completed") {
      setResult(`Broadcast complete: ${job.successCount} sent, ${job.failureCount} failed out of ${job.targetCount}`);
      setBroadcastForm({ title: "", body: "", target: "all", locale: "" });
      loadHistory();
    } else if (job?.status === "failed") {
      setResult(`Broadcast failed: ${job.errorMessage ?? "Unknown error"}`);
    }
  }, [job?.status, job?.errorMessage, job?.successCount, job?.failureCount, job?.targetCount, loadHistory]);

  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/admin/notifications/${id}`);
      setDetail(data);
    } catch (err) {
      console.error("Failed to load notification detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleBroadcast(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    try {
      const payload: Record<string, unknown> = {
        title: broadcastForm.title,
        body: broadcastForm.body,
        target: broadcastForm.target,
      };
      if (broadcastForm.target === "locale" && broadcastForm.locale) {
        payload.locale = broadcastForm.locale;
      }
      const { data } = await api.post("/admin/notifications/broadcast", payload);
      startPolling(data.jobId);
    } catch (err) {
      setResult("Broadcast failed to start");
      console.error("Broadcast failed:", err);
    } finally {
      setSending(false);
    }
  }

  async function handleTargeted(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    try {
      await api.post("/admin/notifications/targeted", targetedForm);
      setResult("Notification sent successfully");
      setTargetedForm({ userId: "", title: "", body: "" });
      loadHistory();
    } catch (err) {
      setResult("Targeted notification failed");
      console.error("Targeted send failed:", err);
    } finally {
      setSending(false);
    }
  }

  function applyFilters() {
    setPage(1);
    loadHistory();
  }

  function resetFilters() {
    setFilters({ type: "", search: "" });
    setPage(1);
  }

  const totalPages = history ? Math.ceil(history.total / history.limit) : 0;

  const progress = job && job.targetCount > 0
    ? Math.round(((job.successCount + job.failureCount) / job.targetCount) * 100)
    : 0;

  const kpiCards = [
    { label: "Total", value: stats?.total ?? 0, icon: Bell, color: "text-text" },
    { label: "Broadcast", value: stats?.broadcast ?? 0, icon: Bell, color: "text-primary" },
    { label: "Targeted", value: stats?.targeted ?? 0, icon: Bell, color: "text-blue-400" },
    { label: "Automated", value: stats?.automated ?? 0, icon: Bell, color: "text-purple-400" },
    { label: "Success Rate", value: `${stats?.successRate ?? 0}%`, icon: Bell, color: "text-green-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {result && (
        <div className="mb-4 rounded-md border border-border bg-surface px-4 py-3 text-sm">
          {result}
        </div>
      )}

      {isPolling && job && (
        <div className="mb-4 rounded-md border border-border bg-surface px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">
              {job.status === "processing" ? "Sending push notifications..." : job.status}
            </span>
            <span className="text-sm font-medium">
              {job.successCount + job.failureCount} / {job.targetCount}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-background overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-green-400">{job.successCount} sent</span>
            <span className="text-red-400">{job.failureCount} failed</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex items-center gap-3">
              <kpi.icon className={kpi.color} size={20} />
              <div>
                <p className="text-xs text-text-muted">{kpi.label}</p>
                {loading ? (
                  <Skeleton width={40} height={20} />
                ) : (
                  <p className="text-xl font-bold">{kpi.value}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Broadcast Push</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-text-muted">Title</label>
                  <AiImproveButton
                    value={broadcastForm.title}
                    onImproved={(text) => setBroadcastForm({ ...broadcastForm, title: text })}
                    format="plain"
                  />
                </div>
                <Input value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })} required maxLength={200} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-text-muted">Body</label>
                  <AiImproveButton
                    value={broadcastForm.body}
                    onImproved={(text) => setBroadcastForm({ ...broadcastForm, body: text })}
                    format="plain"
                  />
                </div>
                <Input value={broadcastForm.body} onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })} required maxLength={500} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Target</label>
                <select
                  value={broadcastForm.target}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, target: e.target.value as "all" | "locale" })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
                >
                  <option value="all">All users</option>
                  <option value="locale">By locale</option>
                </select>
              </div>
              {broadcastForm.target === "locale" && (
                <div>
                  <label className="mb-1.5 block text-sm text-text-muted">Locale</label>
                  <Input value={broadcastForm.locale} onChange={(e) => setBroadcastForm({ ...broadcastForm, locale: e.target.value })} placeholder="en, fr, es..." />
                </div>
              )}
              <Button type="submit" disabled={sending || isPolling}>
                {sending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />} Send Broadcast
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targeted Push</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTargeted} className="space-y-4">
              <div className="relative">
                <label className="mb-1.5 block text-sm text-text-muted">User ID or Email</label>
                <Input
                  value={targetedForm.userId}
                  onChange={(e) => setTargetedForm({ ...targetedForm, userId: e.target.value })}
                  placeholder="Enter user ID or email address"
                  required
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
                />
                {showSuggestions && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-lg max-h-48 overflow-auto">
                    {suggestionsLoading ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted">
                        <Loader2 size={14} className="animate-spin" /> Searching...
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-text-muted">No users found</div>
                    ) : (
                      suggestions.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setTargetedForm({ ...targetedForm, userId: user.email });
                            setShowSuggestions(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-text font-medium">{user.email}</span>
                            {user.username && (
                              <span className="text-text-muted text-xs">{user.username}</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-text-muted">Title</label>
                  <AiImproveButton
                    value={targetedForm.title}
                    onImproved={(text) => setTargetedForm({ ...targetedForm, title: text })}
                    format="plain"
                  />
                </div>
                <Input value={targetedForm.title} onChange={(e) => setTargetedForm({ ...targetedForm, title: e.target.value })} required maxLength={200} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-text-muted">Body</label>
                  <AiImproveButton
                    value={targetedForm.body}
                    onImproved={(text) => setTargetedForm({ ...targetedForm, body: text })}
                    format="plain"
                  />
                </div>
                <Input value={targetedForm.body} onChange={(e) => setTargetedForm({ ...targetedForm, body: e.target.value })} required maxLength={500} />
              </div>
              <Button type="submit" disabled={sending}>
                <Send size={16} className="mr-2" /> Send to User
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-sm text-text-muted">Search by title</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Notification title..."
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                <option value="broadcast">Broadcast</option>
                <option value="targeted">Targeted</option>
                <option value="automated">Automated</option>
              </select>
            </div>
            <Button onClick={applyFilters} size="sm">Apply</Button>
            <Button onClick={resetFilters} variant="ghost" size="sm">Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History ({history?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Sent By</TableHead>
                <TableHead className="hidden lg:table-cell">Target</TableHead>
                <TableHead className="hidden lg:table-cell">Success</TableHead>
                <TableHead className="hidden lg:table-cell">Failed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : history && history.logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0">
                        <EmptyState
                          icon={Bell}
                          title="No notifications found"
                          description={filters.type || filters.search ? "Try adjusting your filters." : "No push notifications have been sent yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : history?.logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => openDetail(log.id)}>
                      <TableCell>
                        <Badge className={TYPE_COLORS[log.type] ?? "bg-gray-500/20 text-gray-400"}>{log.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{log.title}</TableCell>
                      <TableCell className="text-text-muted text-xs hidden md:table-cell">
                        {log.sentBy?.username ?? log.triggeredBy ?? "system"}
                      </TableCell>
                      <TableCell className="text-text-muted hidden lg:table-cell">{log.targetCount}</TableCell>
                      <TableCell className="text-green-400 hidden lg:table-cell">{log.successCount}</TableCell>
                      <TableCell className="text-red-400 hidden lg:table-cell">{log.failureCount}</TableCell>
                      <TableCell>{getStatusBadge(log.successCount, log.failureCount, log.targetCount)}</TableCell>
                      <TableCell className="text-text-muted text-xs hidden md:table-cell">{formatDate(log.createdAt)}</TableCell>
                      <TableCell>
                        <Eye size={16} className="text-text-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>

          {history && history.total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-muted">
                Page {history.page} of {totalPages} ({history.total} total)
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

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} title="Notification Detail">
        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton height={20} />
            <Skeleton height={20} />
            <Skeleton height={20} />
            <Skeleton height={100} />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted mb-1">Type</p>
                <Badge className={TYPE_COLORS[detail.type] ?? "bg-gray-500/20 text-gray-400"}>{detail.type}</Badge>
              </div>
              <div>
                <p className="text-text-muted mb-1">Triggered By</p>
                <p className="font-medium">{detail.triggeredBy ?? "admin"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Sent By</p>
                <p className="font-medium">{detail.sentBy?.username ?? "system"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Locale</p>
                <p className="font-medium">{detail.locale ?? "—"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Target Count</p>
                <p className="font-medium">{detail.targetCount}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Success / Failure</p>
                <p className="font-medium">
                  <span className="text-green-400">{detail.successCount}</span>
                  {" / "}
                  <span className="text-red-400">{detail.failureCount}</span>
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted mb-1">Title</p>
                <p className="font-medium">{detail.title}</p>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted mb-1">Body</p>
                <p className="font-medium">{detail.body}</p>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted mb-1">Date</p>
                <p className="font-medium">{formatDate(detail.createdAt)}</p>
              </div>
              {detail.data && (
                <div className="col-span-2">
                  <p className="text-text-muted mb-1">Data Payload</p>
                  <pre className="bg-background rounded-md p-3 text-xs overflow-auto max-h-[150px] border border-border">
                    {JSON.stringify(detail.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {detail.tickets.length > 0 && (
              <div>
                <p className="text-text-muted mb-2 text-sm">Push Tickets ({detail.tickets.length})</p>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {detail.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-3 rounded-md border border-border p-2 text-xs"
                    >
                      <Badge className={
                        ticket.status === "ok"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }>
                        {ticket.status}
                      </Badge>
                      <span className="text-text-muted font-mono">{ticket.pushToken}</span>
                      {ticket.errorMessage && (
                        <span className="text-red-400 truncate">{ticket.errorMessage}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
