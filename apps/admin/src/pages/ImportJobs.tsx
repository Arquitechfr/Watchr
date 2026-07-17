import { useEffect, useState } from "react";
import { Download, ChevronLeft, ChevronRight, Search, Trash2, RotateCw, Eye, XCircle } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { toast } from "../store/toastStore";
import { formatDate } from "../lib/utils";

interface ImportError {
  line: number;
  reason: string;
}

interface ImportProgress {
  total: number;
  processed: number;
  matched: number;
  failed: number;
  pendingReview?: number;
}

interface ImportRow {
  id: string;
  username: string;
  email: string;
  source: string;
  status: string;
  progress: ImportProgress;
  createdAt: string;
  completedAt: string | null;
}

interface ImportDetail extends ImportRow {
  sourceFile: string;
  errorLog: ImportError[];
  updatedAt: string;
}

interface ImportsResponse {
  jobs: ImportRow[];
  total: number;
  page: number;
  limit: number;
}

interface ImportStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  bySource: { source: string; count: number }[];
}

const statusColors: Record<string, string> = {
  completed: "bg-success/20 text-success",
  failed: "bg-danger/20 text-danger",
  pending: "bg-primary/20 text-primary",
  processing: "bg-primary/20 text-primary",
};

export function ImportJobs() {
  const [data, setData] = useState<ImportsResponse | null>(null);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ImportRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [retryTarget, setRetryTarget] = useState<ImportRow | null>(null);
  const [retrySubmitting, setRetrySubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (search) params.search = search;
      const [jobsRes, statsRes] = await Promise.all([
        api.get("/admin/imports", { params }),
        api.get("/admin/imports/stats"),
      ]);
      setData(jobsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load imports:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [statusFilter, sourceFilter, page, search]);

  async function openDetail(job: ImportRow) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get(`/admin/imports/${job.id}`);
      setDetail(res.data);
    } catch (err) {
      console.error("Failed to load import detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/admin/imports/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (detail?.id === deleteTarget.id) setDetail(null);
      toast("Import job deleted", "success");
      load();
    } catch (err) {
      console.error("Failed to delete import job:", err);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleRetryConfirm() {
    if (!retryTarget) return;
    setRetrySubmitting(true);
    try {
      await api.post(`/admin/imports/${retryTarget.id}/retry`);
      setRetryTarget(null);
      toast("Import job requeued", "success");
      load();
    } catch (err) {
      console.error("Failed to retry import job:", err);
    } finally {
      setRetrySubmitting(false);
    }
  }

  async function handleExportCsv() {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (search) params.search = search;
      const res = await api.get("/admin/imports/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `import-jobs-${Date.now()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast("CSV exported", "success");
    } catch (err) {
      console.error("Failed to export CSV:", err);
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Import Jobs</h1>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download size={16} className="mr-2" /> Export CSV
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted">Completed</p>
              <p className="text-xl font-bold text-success">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted">Failed</p>
              <p className="text-xl font-bold text-danger">{stats.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-text-muted">Pending</p>
              <p className="text-xl font-bold text-primary">{stats.pending}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by username or email..."
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
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All sources</option>
          <option value="tvtime">TV Time</option>
          <option value="trakt">Trakt</option>
          <option value="imdb">IMDb</option>
          <option value="letterboxd">Letterboxd</option>
          <option value="watchr">Watchr</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="hidden lg:table-cell">Completed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : data && data.jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          icon={Download}
                          title="No import jobs found"
                          description={statusFilter || sourceFilter || search ? "Try adjusting your filters." : "No import jobs have been created yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : data?.jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <p className="font-medium">{job.username}</p>
                        <p className="text-xs text-text-muted">{job.email}</p>
                      </TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell">{job.source}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[job.status] ?? "bg-surface-light text-text-muted"}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {job.progress.total > 0
                            ? Math.round((job.progress.processed / job.progress.total) * 100)
                            : 0}%
                        </p>
                        <p className="text-xs text-text-muted">
                          {job.progress.processed}/{job.progress.total}
                        </p>
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">{formatDate(job.createdAt)}</TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">{formatDate(job.completedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetail(job)} title="View details">
                            <Eye size={16} />
                          </Button>
                          {(job.status === "failed" || job.status === "completed") && (
                            <Button variant="ghost" size="icon" onClick={() => setRetryTarget(job)} title="Retry">
                              <RotateCw size={16} className="text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(job)} title="Delete">
                            <Trash2 size={16} className="text-danger" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-text-muted">{data.total} jobs total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="flex items-center px-3 text-sm text-text-muted">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-surface rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-text">Import Job Detail</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={statusColors[detail.status] ?? "bg-surface-light text-text-muted"}>
                    {detail.status}
                  </Badge>
                  <Badge className="bg-primary/20 text-primary">{detail.source}</Badge>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-text-muted hover:text-text">
                <XCircle size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-text-muted">User</p>
                <p className="text-sm text-text">{detail.username}</p>
                <p className="text-xs text-text-muted">{detail.email}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Source File</p>
                <p className="text-sm text-text font-mono truncate">{detail.sourceFile}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="rounded-md bg-surface-light p-3">
                <p className="text-xs text-text-muted">Total</p>
                <p className="text-lg font-bold">{detail.progress.total}</p>
              </div>
              <div className="rounded-md bg-surface-light p-3">
                <p className="text-xs text-text-muted">Processed</p>
                <p className="text-lg font-bold text-primary">{detail.progress.processed}</p>
              </div>
              <div className="rounded-md bg-surface-light p-3">
                <p className="text-xs text-text-muted">Matched</p>
                <p className="text-lg font-bold text-success">{detail.progress.matched}</p>
              </div>
              <div className="rounded-md bg-surface-light p-3">
                <p className="text-xs text-text-muted">Failed</p>
                <p className="text-lg font-bold text-danger">{detail.progress.failed}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-text-muted">Created: {formatDate(detail.createdAt)}</p>
              {detail.completedAt && (
                <p className="text-xs text-text-muted">Completed: {formatDate(detail.completedAt)}</p>
              )}
            </div>

            {detail.errorLog && detail.errorLog.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-text mb-2">Error Log ({detail.errorLog.length} errors)</p>
                <div className="max-h-48 overflow-y-auto rounded-md border border-danger/30 bg-danger/10 p-3">
                  {detail.errorLog.map((err, i) => (
                    <div key={i} className="text-xs text-text-muted py-1 border-b border-border last:border-0">
                      <span className="font-mono text-danger">Line {err.line}:</span> {err.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {(detail.status === "failed" || detail.status === "completed") && (
                <Button
                  size="sm"
                  onClick={() => { setRetryTarget(detail); setDetail(null); }}
                >
                  <RotateCw size={14} className="mr-1" /> Retry
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-danger"
                onClick={() => { setDeleteTarget(detail); setDetail(null); }}
              >
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete import job"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete this import job from <span className="font-medium text-text">{deleteTarget?.username}</span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Retry Confirmation Dialog */}
      <Dialog
        open={!!retryTarget}
        onClose={() => setRetryTarget(null)}
        title="Retry import job"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to retry this import job from <span className="font-medium text-text">{retryTarget?.username}</span>?
            This will requeue the import and reset its progress.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRetryTarget(null)}>Cancel</Button>
            <Button
              onClick={handleRetryConfirm}
              disabled={retrySubmitting}
            >
              {retrySubmitting ? "Retrying..." : "Retry"}
            </Button>
          </div>
        </div>
      </Dialog>

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
