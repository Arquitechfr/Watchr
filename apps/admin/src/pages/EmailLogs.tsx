import { useEffect, useState, useCallback, useRef, type FormEvent } from "react";
import { Mail, Search, ChevronLeft, ChevronRight, Eye, Send, Loader2 } from "lucide-react";
import api from "../lib/api";
import { AiImproveButton } from "../components/ui/AiImproveButton";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Dialog } from "../components/ui/Dialog";
import { RichTextEditor } from "../components/ui/RichTextEditor";
import { useJobPolling } from "../hooks/useJobPolling";
import { formatDate } from "../lib/utils";

interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: "sent" | "failed" | "skipped";
  errorMessage: string | null;
  errorType: string | null;
  htmlContent: string;
  locale: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

interface EmailHistoryResponse {
  logs: EmailLogEntry[];
  total: number;
  page: number;
  limit: number;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  successRate: number;
  byTemplate: { template: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  skipped: "bg-yellow-500/20 text-yellow-400",
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  brevo_api_error: "bg-orange-500/20 text-orange-400",
  connection_timeout: "bg-red-500/20 text-red-400",
  auth_failed: "bg-purple-500/20 text-purple-400",
  smtp_error: "bg-blue-500/20 text-blue-400",
  unknown: "bg-gray-500/20 text-gray-400",
};

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: "Welcome",
  reset_password: "Reset Password",
  ban_notification: "Ban Notification",
  comment_deleted: "Comment Deleted",
  comment_hidden: "Comment Hidden",
  comment_spoiler: "Comment Spoiler",
  custom: "Custom",
};

export function EmailLogs() {
  const [history, setHistory] = useState<EmailHistoryResponse | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "" as string,
    template: "" as string,
    errorType: "" as string,
    search: "" as string,
  });
  const [detail, setDetail] = useState<EmailLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [broadcastForm, setBroadcastForm] = useState({
    subject: "",
    htmlContent: "",
    target: "all" as "all" | "locale",
    locale: "",
  });
  const [targetedForm, setTargetedForm] = useState({
    userId: "",
    subject: "",
    htmlContent: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>("");

  const { job, isPolling, start: startPolling } = useJobPolling();

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.template) params.template = filters.template;
      if (filters.errorType) params.errorType = filters.errorType;
      if (filters.search) params.search = filters.search;

      const [historyRes, statsRes] = await Promise.all([
        api.get("/admin/emails/history", { params }),
        api.get("/admin/emails/stats"),
      ]);
      setHistory(historyRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load email logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (job?.status === "completed") {
      setResult(
        `Broadcast complete: ${job.successCount} sent, ${job.failureCount} failed, ${job.skippedCount} skipped out of ${job.targetCount}`,
      );
      setBroadcastForm({ subject: "", htmlContent: "", target: "all", locale: "" });
      loadData();
    } else if (job?.status === "failed") {
      setResult(`Broadcast failed: ${job.errorMessage ?? "Unknown error"}`);
    }
  }, [job?.status, job?.errorMessage, job?.successCount, job?.failureCount, job?.skippedCount, job?.targetCount, loadData]);

  async function handleBroadcast(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    try {
      const payload: Record<string, unknown> = {
        subject: broadcastForm.subject,
        htmlContent: broadcastForm.htmlContent,
        target: broadcastForm.target,
      };
      if (broadcastForm.target === "locale" && broadcastForm.locale) {
        payload.locale = broadcastForm.locale;
      }
      const { data } = await api.post("/admin/emails/broadcast", payload);
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
      await api.post("/admin/emails/targeted", targetedForm);
      setResult("Email sent successfully");
      setTargetedForm({ userId: "", subject: "", htmlContent: "" });
      loadData();
    } catch (err) {
      setResult("Targeted email failed");
      console.error("Targeted send failed:", err);
    } finally {
      setSending(false);
    }
  }

  function openDetail(log: EmailLogEntry) {
    setDetail(log);
    setDetailOpen(true);
  }

  function applyFilters() {
    setPage(1);
    loadData();
  }

  function resetFilters() {
    setFilters({ status: "", template: "", errorType: "", search: "" });
    setPage(1);
  }

  const totalPages = history ? Math.ceil(history.total / history.limit) : 0;

  const progress = job && job.targetCount > 0
    ? Math.round(((job.successCount + job.failureCount + job.skippedCount) / job.targetCount) * 100)
    : 0;

  const kpiCards = [
    { label: "Total", value: stats?.total ?? 0, icon: Mail, color: "text-text" },
    { label: "Sent", value: stats?.sent ?? 0, icon: Mail, color: "text-green-400" },
    { label: "Failed", value: stats?.failed ?? 0, icon: Mail, color: "text-red-400" },
    { label: "Skipped", value: stats?.skipped ?? 0, icon: Mail, color: "text-yellow-400" },
    { label: "Success Rate", value: `${stats?.successRate ?? 0}%`, icon: Mail, color: "text-primary" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Email Logs</h1>

      {result && (
        <div className="mb-4 rounded-md border border-border bg-surface px-4 py-3 text-sm">
          {result}
        </div>
      )}

      {isPolling && job && (
        <div className="mb-4 rounded-md border border-border bg-surface px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">
              {job.status === "processing" ? "Sending emails..." : job.status}
            </span>
            <span className="text-sm font-medium">
              {job.successCount + job.failureCount + job.skippedCount} / {job.targetCount}
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
            <span className="text-yellow-400">{job.skippedCount} skipped</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Broadcast Email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-text-muted">Subject</label>
                  <AiImproveButton
                    value={broadcastForm.subject}
                    onImproved={(text) => setBroadcastForm({ ...broadcastForm, subject: text })}
                    format="plain"
                  />
                </div>
                <Input
                  value={broadcastForm.subject}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-text-muted">Content</label>
                  <AiImproveButton
                    value={broadcastForm.htmlContent}
                    onImproved={(text) => setBroadcastForm({ ...broadcastForm, htmlContent: text })}
                    format="html"
                  />
                </div>
                <RichTextEditor
                  value={broadcastForm.htmlContent}
                  onChange={(val) => setBroadcastForm({ ...broadcastForm, htmlContent: val })}
                  placeholder="Write your email content here..."
                />
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
                  <Input
                    value={broadcastForm.locale}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, locale: e.target.value })}
                    placeholder="en, fr, es..."
                  />
                </div>
              )}
              <Button type="submit" disabled={sending || isPolling}>
                {sending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                Send Broadcast
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targeted Email</CardTitle>
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
                  <label className="block text-sm text-text-muted">Subject</label>
                  <AiImproveButton
                    value={targetedForm.subject}
                    onImproved={(text) => setTargetedForm({ ...targetedForm, subject: text })}
                    format="plain"
                  />
                </div>
                <Input
                  value={targetedForm.subject}
                  onChange={(e) => setTargetedForm({ ...targetedForm, subject: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm text-text-muted">Content</label>
                  <AiImproveButton
                    value={targetedForm.htmlContent}
                    onImproved={(text) => setTargetedForm({ ...targetedForm, htmlContent: text })}
                    format="html"
                  />
                </div>
                <RichTextEditor
                  value={targetedForm.htmlContent}
                  onChange={(val) => setTargetedForm({ ...targetedForm, htmlContent: val })}
                  placeholder="Write your email content here..."
                />
              </div>
              <Button type="submit" disabled={sending || isPolling}>
                {sending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                Send to User
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Weekly Digest</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">Send a personalized AI-generated weekly digest email to all users with a summary of their watching activity.</p>
            <Button
              onClick={async () => {
                setSending(true);
                try {
                  await api.post("/admin/digest/weekly");
                  setResult("Weekly digest batch started");
                } catch (err) {
                  setResult("Failed to start weekly digest");
                  console.error("Weekly digest failed:", err);
                } finally {
                  setSending(false);
                }
              }}
              disabled={sending}
            >
              {sending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
              Send Weekly Digest
            </Button>
          </div>
          {result && (
            <p className="mt-3 text-sm text-primary">{result}</p>
          )}
        </CardContent>
      </Card>

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

      <Card className="mb-6">
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-sm text-text-muted">Search by email</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="user@example.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Template</label>
              <select
                value={filters.template}
                onChange={(e) => setFilters({ ...filters, template: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                <option value="welcome">Welcome</option>
                <option value="reset_password">Reset Password</option>
                <option value="ban_notification">Ban Notification</option>
                <option value="comment_deleted">Comment Deleted</option>
                <option value="comment_hidden">Comment Hidden</option>
                <option value="comment_spoiler">Comment Spoiler</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Error Type</label>
              <select
                value={filters.errorType}
                onChange={(e) => setFilters({ ...filters, errorType: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                <option value="brevo_api_error">Brevo API Error</option>
                <option value="connection_timeout">Connection Timeout</option>
                <option value="auth_failed">Auth Failed</option>
                <option value="smtp_error">SMTP Error</option>
                <option value="unknown">Unknown</option>
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
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : history && history.logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          icon={Mail}
                          title="No email logs found"
                          description={filters.status || filters.template || filters.search ? "Try adjusting your filters." : "No emails have been sent yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : history?.logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => openDetail(log)}>
                      <TableCell className="font-medium">{log.to}</TableCell>
                      <TableCell className="text-text-muted max-w-[300px] truncate">{log.subject}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className="bg-primary/20 text-primary">
                          {TEMPLATE_LABELS[log.template] ?? log.template}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={STATUS_COLORS[log.status] ?? "bg-gray-500/20 text-gray-400"}>
                            {log.status}
                          </Badge>
                          {log.status === "failed" && log.errorType && (
                            <Badge className={ERROR_TYPE_COLORS[log.errorType] ?? "bg-gray-500/20 text-gray-400"}>
                              {log.errorType}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
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

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} title="Email Detail">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted mb-1">Recipient</p>
                <p className="font-medium">{detail.to}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Status</p>
                <div className="flex flex-col gap-1">
                  <Badge className={STATUS_COLORS[detail.status] ?? "bg-gray-500/20 text-gray-400"}>
                    {detail.status}
                  </Badge>
                  {detail.status === "failed" && detail.errorType && (
                    <Badge className={ERROR_TYPE_COLORS[detail.errorType] ?? "bg-gray-500/20 text-gray-400"}>
                      {detail.errorType}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-text-muted mb-1">Subject</p>
                <p className="font-medium">{detail.subject}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Template</p>
                <p className="font-medium">{TEMPLATE_LABELS[detail.template] ?? detail.template}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Locale</p>
                <p className="font-medium">{detail.locale ?? "—"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Triggered By</p>
                <p className="font-medium">{detail.triggeredBy ?? "system"}</p>
              </div>
              <div>
                <p className="text-text-muted mb-1">Date</p>
                <p className="font-medium">{formatDate(detail.createdAt)}</p>
              </div>
              {detail.errorMessage && (
                <div className="col-span-2">
                  <p className="text-text-muted mb-1">Error</p>
                  <p className="text-red-400 text-sm bg-red-500/10 rounded-md p-3">{detail.errorMessage}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-text-muted mb-2 text-sm">HTML Content Preview</p>
              <iframe
                srcDoc={detail.htmlContent}
                sandbox=""
                className="w-full h-[300px] rounded-md border border-border bg-white"
                title="Email HTML Preview"
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
