import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Smartphone,
  Globe,
  Server,
  Loader2,
} from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { formatDate } from "../lib/utils";

interface ErrorIssueRow {
  id: string;
  type: string;
  message: string;
  status: "unresolved" | "resolved" | "ignored";
  severity: "error" | "warning" | "info";
  platform: "ios" | "android" | "web" | "backend";
  count: number;
  firstSeen: string;
  lastSeen: string;
}

interface IssuesResponse {
  issues: ErrorIssueRow[];
  total: number;
  page: number;
  limit: number;
}

interface IssueDetail {
  id: string;
  type: string;
  message: string;
  status: "unresolved" | "resolved" | "ignored";
  severity: "error" | "warning" | "info";
  platform: "ios" | "android" | "web" | "backend";
  stackTrace: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  recentEvents: Array<{
    id: string;
    timestamp: string;
    appVersion: string | null;
    deviceInfo: { os?: string; osVersion?: string; deviceModel?: string; screenResolution?: string };
    userContext?: { userId?: string; username?: string };
  }>;
}

interface EventsResponse {
  events: Array<{
    id: string;
    timestamp: string;
    platform: string;
    appVersion: string | null;
    deviceInfo: { os?: string; osVersion?: string; deviceModel?: string; screenResolution?: string };
    breadcrumbs: Array<{ timestamp: string; type: string; message: string; data?: Record<string, unknown> }>;
    userContext?: { userId?: string; username?: string };
    stackTrace: string | null;
    extra?: Record<string, unknown>;
  }>;
  total: number;
  page: number;
  limit: number;
}

interface ErrorStats {
  byStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  bySeverity: Record<string, number>;
  total: number;
  last7Days: Array<{ date: string; count: number }>;
}

const STATUS_BADGES: Record<string, { className: string; label: string }> = {
  unresolved: { className: "bg-red-500/20 text-red-400", label: "Unresolved" },
  resolved: { className: "bg-green-500/20 text-green-400", label: "Resolved" },
  ignored: { className: "bg-gray-500/20 text-gray-400", label: "Ignored" },
};

const SEVERITY_BADGES: Record<string, { className: string; label: string }> = {
  error: { className: "bg-red-500/20 text-red-400", label: "Error" },
  warning: { className: "bg-orange-500/20 text-orange-400", label: "Warning" },
  info: { className: "bg-blue-500/20 text-blue-400", label: "Info" },
};

const PLATFORM_ICONS: Record<string, typeof Smartphone> = {
  ios: Smartphone,
  android: Smartphone,
  web: Globe,
  backend: Server,
};

export function ErrorTracking() {
  const [data, setData] = useState<IssuesResponse | null>(null);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedIssue, setSelectedIssue] = useState<IssueDetail | null>(null);
  const [issueEvents, setIssueEvents] = useState<EventsResponse | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; type: string; message: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (platformFilter) params.platform = platformFilter;
      if (severityFilter) params.severity = severityFilter;
      const [issuesRes, statsRes] = await Promise.all([
        api.get("/admin/errors", { params }),
        api.get("/admin/errors/stats"),
      ]);
      setData(issuesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load errors:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, platformFilter, severityFilter, page]);

  async function loadIssueDetail(id: string) {
    setDetailLoading(true);
    setEventsPage(1);
    try {
      const [detailRes, eventsRes] = await Promise.all([
        api.get(`/admin/errors/${id}`),
        api.get(`/admin/errors/${id}/events`, { params: { page: 1, limit: 10 } }),
      ]);
      setSelectedIssue(detailRes.data);
      setIssueEvents(eventsRes.data);
    } catch (err) {
      console.error("Failed to load issue detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadEventsPage(newPage: number) {
    if (!selectedIssue) return;
    setEventsLoading(true);
    try {
      const res = await api.get(`/admin/errors/${selectedIssue.id}/events`, {
        params: { page: newPage, limit: 10 },
      });
      setIssueEvents(res.data);
      setEventsPage(newPage);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setEventsLoading(false);
    }
  }

  async function handleStatusChange(newStatus: "unresolved" | "resolved" | "ignored") {
    if (!selectedIssue) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/errors/${selectedIssue.id}/status`, { status: newStatus });
      setSelectedIssue({ ...selectedIssue, status: newStatus });
      load();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/errors/${deleteDialog.id}`);
      setDeleteDialog(null);
      setSelectedIssue(null);
      setIssueEvents(null);
      load();
    } catch (err) {
      console.error("Failed to delete issue:", err);
    } finally {
      setDeleteLoading(false);
    }
  }

  function toggleEventExpand(eventId: string) {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;
  const eventsTotalPages = issueEvents ? Math.ceil(issueEvents.total / 10) : 1;

  if (selectedIssue) {
    const PlatformIcon = PLATFORM_ICONS[selectedIssue.platform] ?? Server;
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedIssue(null); setIssueEvents(null); }}>
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <PlatformIcon size={18} className="text-text-muted" />
                {selectedIssue.type}
              </h1>
              <p className="text-sm text-text-muted truncate max-w-2xl">{selectedIssue.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={STATUS_BADGES[selectedIssue.status].className}>
              {STATUS_BADGES[selectedIssue.status].label}
            </Badge>
            <Badge className={SEVERITY_BADGES[selectedIssue.severity].className}>
              {SEVERITY_BADGES[selectedIssue.severity].label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Events</p>
            <p className="text-2xl font-bold">{selectedIssue.count}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">First Seen</p>
            <p className="text-sm font-medium">{formatDate(selectedIssue.firstSeen)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Last Seen</p>
            <p className="text-sm font-medium">{formatDate(selectedIssue.lastSeen)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Platform</p>
            <p className="text-sm font-medium capitalize">{selectedIssue.platform}</p>
          </CardContent></Card>
        </div>

        <div className="flex gap-2 mb-6">
          {selectedIssue.status !== "resolved" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("resolved")}
              disabled={actionLoading}
            >
              <CheckCircle size={16} className="mr-2" />
              Resolve
            </Button>
          )}
          {selectedIssue.status !== "ignored" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("ignored")}
              disabled={actionLoading}
            >
              <XCircle size={16} className="mr-2" />
              Ignore
            </Button>
          )}
          {selectedIssue.status !== "unresolved" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("unresolved")}
              disabled={actionLoading}
            >
              <RotateCcw size={16} className="mr-2" />
              Reopen
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialog({ id: selectedIssue.id, type: selectedIssue.type, message: selectedIssue.message })}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
        </div>

        {selectedIssue.stackTrace && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-2">Stack Trace</h3>
              <pre className="text-xs text-text-muted bg-surface-light rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-96">
                {selectedIssue.stackTrace}
              </pre>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="text-sm font-medium mb-3">Events ({issueEvents?.total ?? 0})</h3>
          {eventsLoading || !issueEvents ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} height={60} />
              ))}
            </div>
          ) : issueEvents.events.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No events" description="No events recorded for this issue." />
          ) : (
            <div className="space-y-2">
              {issueEvents.events.map((event) => {
                const expanded = expandedEvents.has(event.id);
                return (
                  <Card key={event.id}>
                    <CardContent className="p-3">
                      <button
                        onClick={() => toggleEventExpand(event.id)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        {expanded ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRightIcon size={16} className="text-text-muted" />}
                        <span className="text-sm font-medium">{formatDate(event.timestamp)}</span>
                        {event.appVersion && (
                          <Badge className="bg-surface-light text-text-muted">v{event.appVersion}</Badge>
                        )}
                        {event.userContext?.username && (
                          <Badge className="bg-primary/20 text-primary">{event.userContext.username}</Badge>
                        )}
                        {event.deviceInfo.os && (
                          <span className="text-xs text-text-muted">{event.deviceInfo.os} {event.deviceInfo.osVersion ?? ""}</span>
                        )}
                      </button>
                      {expanded && (
                        <div className="mt-3 space-y-3">
                          {event.breadcrumbs.length > 0 && (
                            <div>
                              <p className="text-xs text-text-muted mb-1">Breadcrumbs</p>
                              <div className="space-y-1">
                                {event.breadcrumbs.map((bc, i) => (
                                  <div key={i} className="text-xs text-text-muted bg-surface-light rounded px-2 py-1">
                                    <span className="text-text">{bc.type}</span>: {bc.message}
                                    {bc.data && <span className="text-text-muted"> {JSON.stringify(bc.data)}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {event.stackTrace && (
                            <div>
                              <p className="text-xs text-text-muted mb-1">Stack Trace</p>
                              <pre className="text-xs text-text-muted bg-surface-light rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                                {event.stackTrace}
                              </pre>
                            </div>
                          )}
                          {event.extra && Object.keys(event.extra).length > 0 && (
                            <div>
                              <p className="text-xs text-text-muted mb-1">Extra</p>
                              <pre className="text-xs text-text-muted bg-surface-light rounded-md p-2 overflow-x-auto">
                                {JSON.stringify(event.extra, null, 2)}
                              </pre>
                            </div>
                          )}
                          {event.deviceInfo.screenResolution && (
                            <p className="text-xs text-text-muted">Screen: {event.deviceInfo.screenResolution}</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {eventsTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-text-muted">{issueEvents.total} events total</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={eventsPage === 1} onClick={() => loadEventsPage(eventsPage - 1)}>
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="flex items-center px-3 text-sm text-text-muted">
                      {eventsPage} / {eventsTotalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={eventsPage >= eventsTotalPages} onClick={() => loadEventsPage(eventsPage + 1)}>
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Dialog
          open={!!deleteDialog}
          onClose={() => setDeleteDialog(null)}
          title={`Delete ${deleteDialog?.type ?? ""}`}
        >
          <div className="space-y-4">
            <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3">
              <p className="text-sm text-red-400 font-medium">This action is irreversible.</p>
              <p className="text-sm text-text-muted mt-1">
                The issue and all {selectedIssue?.count ?? 0} events will be permanently deleted.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
              <Button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                Delete permanently
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Error Tracking</h1>
        {stats && (
          <div className="flex gap-3 text-sm text-text-muted">
            <span>{stats.total} total</span>
            <span className="text-red-400">{stats.byStatus.unresolved ?? 0} unresolved</span>
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Total Issues</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Unresolved</p>
            <p className="text-2xl font-bold text-red-400">{stats.byStatus.unresolved ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Resolved</p>
            <p className="text-2xl font-bold text-green-400">{stats.byStatus.resolved ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Events (7d)</p>
            <p className="text-2xl font-bold">{stats.last7Days.reduce((sum, d) => sum + d.count, 0)}</p>
          </CardContent></Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by type or message..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All statuses</option>
          <option value="unresolved">Unresolved</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>
        <select
          value={platformFilter}
          onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All platforms</option>
          <option value="ios">iOS</option>
          <option value="android">Android</option>
          <option value="web">Web</option>
          <option value="backend">Backend</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All severities</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Message</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Severity</TableHead>
                <TableHead className="hidden md:table-cell">Events</TableHead>
                <TableHead className="hidden lg:table-cell">Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || detailLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data && data.issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={AlertTriangle}
                      title="No errors found"
                      description={search || statusFilter || platformFilter || severityFilter ? "Try adjusting your filters." : "No errors have been reported yet."}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data?.issues.map((issue) => {
                  const PlatformIcon = PLATFORM_ICONS[issue.platform] ?? Server;
                  return (
                    <TableRow
                      key={issue.id}
                      className="cursor-pointer"
                      onClick={() => loadIssueDetail(issue.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <PlatformIcon size={14} className="text-text-muted" />
                          {issue.type}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell max-w-xs truncate">
                        {issue.message}
                      </TableCell>
                      <TableCell className="capitalize text-text-muted text-sm">{issue.platform}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGES[issue.status].className}>
                          {STATUS_BADGES[issue.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge className={SEVERITY_BADGES[issue.severity].className}>
                          {SEVERITY_BADGES[issue.severity].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-text-muted">{issue.count}</TableCell>
                      <TableCell className="hidden lg:table-cell text-text-muted text-xs">
                        {formatDate(issue.lastSeen)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-text-muted">{data.total} issues total</p>
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
