import { useEffect, useState } from "react";
import { Flag, CheckCircle, XCircle, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../lib/utils";
import { logError } from "../lib/logger";

interface ReportRow {
  id: string;
  commentId: string;
  commentContent: string;
  commentShowId: string;
  reporterId: string;
  reporterUsername: string;
  authorUsername: string;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedByUsername?: string;
}

interface ReportsResponse {
  reports: ReportRow[];
  total: number;
  page: number;
  limit: number;
}

interface ReportStats {
  pending: number;
  resolved: number;
  dismissed: number;
  total: number;
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  unmarked_spoiler: "Unmarked Spoiler",
  harassment: "Harassment",
  inappropriate: "Inappropriate",
  off_topic: "Off-topic",
};

export function Reports() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [aiSuggestion, setAiSuggestion] = useState<{ reportId: string; recommendedAction: string; reason: string; draftResponse: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (reasonFilter) params.reason = reasonFilter;
      const [reportsRes, statsRes] = await Promise.all([
        api.get("/admin/reports", { params }),
        api.get("/admin/reports/stats"),
      ]);
      setData(reportsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      logError("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, reasonFilter, page]);

  async function handleResolve(reportId: string) {
    try {
      await api.patch(`/admin/reports/${reportId}/resolve`);
      load();
    } catch (err) {
      logError("Failed to resolve report", err);
    }
  }

  async function handleDismiss(reportId: string) {
    if (!confirm("Dismiss this report?")) return;
    try {
      await api.patch(`/admin/reports/${reportId}/dismiss`);
      load();
    } catch (err) {
      logError("Failed to dismiss report", err);
    }
  }

  async function handleAiSuggestion(reportId: string) {
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await api.post(`/admin/ai/report-suggestion/${reportId}`);
      setAiSuggestion({ reportId, ...res.data });
    } catch (err) {
      logError("Failed to get AI suggestion", err);
    } finally {
      setAiLoading(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-muted">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-muted">Pending</p>
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-muted">Resolved</p>
              <p className="text-2xl font-bold text-success">{stats.resolved}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-muted">Dismissed</p>
              <p className="text-2xl font-bold text-text-muted">{stats.dismissed}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select
          value={reasonFilter}
          onChange={(e) => {
            setReasonFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All reasons</option>
          {Object.entries(REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comment</TableHead>
                <TableHead className="hidden md:table-cell">Reporter</TableHead>
                <TableHead className="hidden md:table-cell">Author</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data && data.reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          icon={Flag}
                          title="No reports found"
                          description={statusFilter || reasonFilter ? "Try adjusting your filters." : "No comment reports have been submitted yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : data?.reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="max-w-xs truncate">{report.commentContent}</TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell">{report.reporterUsername}</TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell">{report.authorUsername}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className="bg-primary/20 text-primary">
                          {REASON_LABELS[report.reason] ?? report.reason}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.status === "pending" && (
                          <Badge className="bg-warning/20 text-warning">Pending</Badge>
                        )}
                        {report.status === "resolved" && (
                          <Badge className="bg-success/20 text-success">Resolved</Badge>
                        )}
                        {report.status === "dismissed" && (
                          <Badge className="bg-text-muted/20 text-text-muted">Dismissed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden md:table-cell">{formatDate(report.createdAt)}</TableCell>
                      <TableCell>
                        {report.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAiSuggestion(report.id)}
                              title="AI suggestion"
                              disabled={aiLoading}
                            >
                              <Sparkles size={16} className="text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResolve(report.id)}
                              title="Resolve"
                            >
                              <CheckCircle size={16} className="text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDismiss(report.id)}
                              title="Dismiss"
                            >
                              <XCircle size={16} className="text-text-muted" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {aiSuggestion && (
        <Card className="mt-4 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-primary" />
              <h3 className="font-semibold text-text">AI Suggestion</h3>
              <Badge className="bg-primary/20 text-primary capitalize">{aiSuggestion.recommendedAction}</Badge>
            </div>
            <p className="text-sm text-text-muted mb-2">{aiSuggestion.reason}</p>
            {aiSuggestion.draftResponse && (
              <div className="bg-surface-light rounded-md p-3 mt-2">
                <p className="text-xs text-text-muted mb-1">Draft response to reporter:</p>
                <p className="text-sm text-text">{aiSuggestion.draftResponse}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {aiLoading && (
        <Card className="mt-4 border-primary/30">
          <CardContent className="p-4 flex items-center gap-2">
            <Sparkles size={18} className="text-primary animate-pulse" />
            <p className="text-sm text-text-muted">Analyzing report with AI…</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-text-muted">{data.total} reports total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="flex items-center px-3 text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
