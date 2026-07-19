import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { Dialog } from "../components/ui/Dialog";
import { PageSelector } from "../components/ui/PageSelector";
import { CalendarClock, Edit2, Trash2, X } from "lucide-react";

interface ScheduledJob {
  id: string;
  type: string;
  status: string;
  title: string | null;
  body: string | null;
  subject: string | null;
  htmlContent: string | null;
  target: string;
  locale: string | null;
  targetCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  scheduledAt: string | null;
  scheduledStatus: string;
  deepLinkScreen: string | null;
  deepLinkParams: Record<string, unknown> | null;
  userId: string | null;
  sentBy: string;
  createdAt: string;
  updatedAt: string;
}

export function ScheduledJobs() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [editJob, setEditJob] = useState<ScheduledJob | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    body: "",
    subject: "",
    htmlContent: "",
    scheduledAt: "",
    deepLinkScreen: "",
    deepLinkParams: {} as Record<string, unknown>,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filterType) params.type = filterType;
      const res = await api.get("/admin/scheduled", { params });
      setJobs(res.data.jobs);
      setTotal(res.data.total);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function openEdit(job: ScheduledJob) {
    setEditJob(job);
    const scheduledLocal = job.scheduledAt
      ? new Date(job.scheduledAt).toISOString().slice(0, 16)
      : "";
    setEditForm({
      title: job.title ?? "",
      body: job.body ?? "",
      subject: job.subject ?? "",
      htmlContent: job.htmlContent ?? "",
      scheduledAt: scheduledLocal,
      deepLinkScreen: job.deepLinkScreen ?? "",
      deepLinkParams: job.deepLinkParams ?? {},
    });
  }

  async function handleSaveEdit() {
    if (!editJob) return;
    setSaving(true);
    setError("");
    try {
      const updates: Record<string, unknown> = {};
      if (editJob.title !== null && editForm.title !== editJob.title) updates.title = editForm.title;
      if (editJob.body !== null && editForm.body !== editJob.body) updates.body = editForm.body;
      if (editJob.subject !== null && editForm.subject !== editJob.subject) updates.subject = editForm.subject;
      if (editJob.htmlContent !== null && editForm.htmlContent !== editJob.htmlContent) updates.htmlContent = editForm.htmlContent;
      if (editForm.scheduledAt) updates.scheduledAt = new Date(editForm.scheduledAt).toISOString();
      if (editForm.deepLinkScreen) {
        updates.deepLinkScreen = editForm.deepLinkScreen;
        updates.deepLinkParams = editForm.deepLinkParams;
      } else {
        updates.deepLinkScreen = null;
      }

      await api.patch(`/admin/scheduled/${editJob.id}`, updates);
      setEditJob(null);
      fetchJobs();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? "Failed to update job");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(jobId: string) {
    if (!confirm("Cancel this scheduled job? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/scheduled/${jobId}`);
      fetchJobs();
    } catch {
      setError("Failed to cancel job");
    }
  }

  const isEmail = (type: string) => type.startsWith("email");
  const isPush = (type: string) => type.startsWith("push");

  function formatType(type: string): string {
    if (type === "email_broadcast") return "Email Broadcast";
    if (type === "push_broadcast") return "Push Broadcast";
    if (type === "push_targeted_scheduled") return "Push Targeted";
    if (type === "email_targeted_scheduled") return "Email Targeted";
    return type;
  }

  function formatDateTime(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarClock size={24} className="text-primary" />
        <div>
          <h1 className="text-xl font-bold text-text">Scheduled Jobs</h1>
          <p className="text-sm text-text-muted">Manage scheduled email and push notification sends</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Queue ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-3 items-end">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Filter by type</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">All</option>
                <option value="push_broadcast">Push Broadcast</option>
                <option value="email_broadcast">Email Broadcast</option>
                <option value="push_targeted_scheduled">Push Targeted</option>
                <option value="email_targeted_scheduled">Email Targeted</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-text-muted">No scheduled jobs</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Deep Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Badge className="bg-primary/20 text-primary">
                          {formatType(job.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {job.title ?? job.subject ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {job.userId ? `User: ${job.userId.slice(0, 12)}...` : job.target === "locale" ? `Locale: ${job.locale ?? "?"}` : "All"}
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(job.scheduledAt)}</TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {job.deepLinkScreen ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={job.scheduledStatus === "scheduled" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                          {job.scheduledStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(job)} className="text-text-muted hover:text-primary">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleCancel(job.id)} className="text-text-muted hover:text-danger">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {total > 20 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-text-muted">
                    Page {page} of {Math.ceil(total / 20)}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editJob} onClose={() => setEditJob(null)} title="Edit Scheduled Job">
          {editJob && (
            <div className="space-y-4">
              {editJob.title !== null && (
                <div>
                  <label className="mb-1.5 block text-sm text-text-muted">Title</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    maxLength={200}
                  />
                </div>
              )}
              {editJob.body !== null && (
                <div>
                  <label className="mb-1.5 block text-sm text-text-muted">Body</label>
                  <Input
                    value={editForm.body}
                    onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                    maxLength={500}
                  />
                </div>
              )}
              {editJob.subject !== null && (
                <div>
                  <label className="mb-1.5 block text-sm text-text-muted">Subject</label>
                  <Input
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    maxLength={200}
                  />
                </div>
              )}
              {editJob.htmlContent !== null && (
                <div>
                  <label className="mb-1.5 block text-sm text-text-muted">HTML Content</label>
                  <textarea
                    value={editForm.htmlContent}
                    onChange={(e) => setEditForm({ ...editForm, htmlContent: e.target.value })}
                    rows={6}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text font-mono"
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Scheduled For</label>
                <Input
                  type="datetime-local"
                  value={editForm.scheduledAt}
                  onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Deep Link</label>
                <PageSelector
                  value={editForm.deepLinkScreen ? { screen: editForm.deepLinkScreen, params: editForm.deepLinkParams } : undefined}
                  onChange={(val) => setEditForm({
                    ...editForm,
                    deepLinkScreen: val?.screen ?? "",
                    deepLinkParams: val?.params ?? {},
                  })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditJob(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
      </Dialog>
    </div>
  );
}
