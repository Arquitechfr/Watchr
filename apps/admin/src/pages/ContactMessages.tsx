import { useEffect, useState } from "react";
import { Mail, CheckCircle, XCircle, Archive, Eye, Send, ChevronLeft, ChevronRight, Search, Trash2, Download, Edit } from "lucide-react";
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
import { logError, extractApiErrorMessage } from "../lib/logger";

interface ContactMessage {
  id: string;
  userId: string | null;
  email: string;
  username: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  repliedAt?: string;
  replyBody?: string;
  repliedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactListResponse {
  data: ContactMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ContactStats {
  total: number;
  new: number;
  read: number;
  resolved: number;
  archived: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  suggestion: "Suggestion",
  question: "Question",
  other: "Other",
};

const STATUS_BADGES: Record<string, { className: string; label: string }> = {
  new: { className: "bg-warning/20 text-warning", label: "New" },
  read: { className: "bg-primary/20 text-primary", label: "Read" },
  resolved: { className: "bg-success/20 text-success", label: "Resolved" },
  archived: { className: "bg-text-muted/20 text-text-muted", label: "Archived" },
};

export function ContactMessages() {
  const [data, setData] = useState<ContactListResponse | null>(null);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Edit reply
  const [editReplyMode, setEditReplyMode] = useState(false);
  const [editReplyText, setEditReplyText] = useState("");
  const [editReplySubmitting, setEditReplySubmitting] = useState(false);
  const [editReplyError, setEditReplyError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (search) params.search = search;
      const [contactRes, statsRes] = await Promise.all([
        api.get("/admin/contact", { params }),
        api.get("/admin/contact/stats"),
      ]);
      setData(contactRes.data);
      setStats(statsRes.data);
    } catch (err) {
      logError("Failed to load contact messages", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [statusFilter, categoryFilter, page, search]);

  async function openMessage(msg: ContactMessage) {
    setDetailLoading(true);
    setSelectedMessage(null);
    setReplyText("");
    setReplyError(null);
    setEditReplyMode(false);
    try {
      const res = await api.get(`/admin/contact/${msg.id}`);
      setSelectedMessage(res.data);
      if (res.data.status === "new") {
        await api.patch(`/admin/contact/${msg.id}/status`, { status: "read" });
        load();
      }
    } catch (err) {
      logError("Failed to load contact detail", err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    try {
      await api.patch(`/admin/contact/${id}/status`, { status });
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, status });
      }
      load();
    } catch (err) {
      logError("Failed to update status", err);
    }
  }

  async function handleReply() {
    if (!selectedMessage || replyText.trim().length < 10) return;
    setReplying(true);
    setReplyError(null);
    try {
      await api.post(`/admin/contact/${selectedMessage.id}/reply`, {
        replyMessage: replyText.trim(),
      });
      const res = await api.get(`/admin/contact/${selectedMessage.id}`);
      setSelectedMessage(res.data);
      setReplyText("");
      toast("Reply sent successfully", "success");
      load();
    } catch (err) {
      setReplyError(extractApiErrorMessage(err, "Failed to send reply"));
    } finally {
      setReplying(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/admin/contact/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (selectedMessage?.id === deleteTarget.id) setSelectedMessage(null);
      toast("Contact message deleted", "success");
      load();
    } catch (err) {
      logError("Failed to delete contact message", err);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkSubmitting(true);
    try {
      await api.post("/admin/contact/bulk", {
        ids: Array.from(selectedIds),
        action: bulkAction,
      });
      setSelectedIds(new Set());
      setBulkAction("");
      toast(`Bulk ${bulkAction} completed`, "success");
      load();
    } catch (err) {
      logError("Failed to perform bulk action", err);
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function handleExportCsv() {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (search) params.search = search;
      const res = await api.get("/admin/contact/export", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `contact-messages-${Date.now()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast("CSV exported", "success");
    } catch (err) {
      logError("Failed to export CSV", err);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    if (selectedIds.size === data.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.data.map((m) => m.id)));
    }
  }

  function startEditReply() {
    if (!selectedMessage?.replyBody) return;
    setEditReplyText(selectedMessage.replyBody);
    setEditReplyMode(true);
    setEditReplyError(null);
  }

  async function handleEditReplySubmit() {
    if (!selectedMessage || editReplyText.trim().length < 10) return;
    setEditReplySubmitting(true);
    setEditReplyError(null);
    try {
      await api.patch(`/admin/contact/${selectedMessage.id}/reply`, {
        replyMessage: editReplyText.trim(),
      });
      const res = await api.get(`/admin/contact/${selectedMessage.id}`);
      setSelectedMessage(res.data);
      setEditReplyMode(false);
      toast("Reply updated and resent", "success");
      load();
    } catch (err) {
      setEditReplyError(extractApiErrorMessage(err, "Failed to edit reply"));
    } finally {
      setEditReplySubmitting(false);
    }
  }

  const totalPages = data?.pagination.pages ?? 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Contact Messages</h1>
        <Button variant="outline" onClick={handleExportCsv}>
          <Download size={16} className="mr-2" /> Export CSV
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-muted">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-muted">New</p>
              <p className="text-2xl font-bold text-warning">{stats.new}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-muted">Read</p>
              <p className="text-2xl font-bold text-primary">{stats.read}</p>
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
              <p className="text-sm text-text-muted">Archived</p>
              <p className="text-2xl font-bold text-text-muted">{stats.archived}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by subject, message, email..."
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
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 rounded-md border border-primary/30 bg-primary/10 px-4 py-2">
          <span className="text-sm text-text">{selectedIds.size} selected</span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="rounded-md border border-border bg-background px-3 text-sm text-text"
          >
            <option value="">Choose action…</option>
            <option value="read">Mark as read</option>
            <option value="archive">Archive</option>
            <option value="delete">Delete</option>
          </select>
          <Button
            size="sm"
            disabled={!bulkAction || bulkSubmitting}
            onClick={handleBulkAction}
            className={bulkAction === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {bulkSubmitting ? "Processing…" : "Apply"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedIds(new Set()); setBulkAction(""); }}
          >
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={data ? selectedIds.size === data.data.length && data.data.length > 0 : false}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">User</TableHead>
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
                : data && data.data.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          icon={Mail}
                          title="No messages found"
                          description={statusFilter || categoryFilter || search ? "Try adjusting your filters." : "No contact messages have been submitted yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : data?.data.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(msg.id)}
                          onChange={() => toggleSelect(msg.id)}
                          className="rounded border-border"
                        />
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-medium">{msg.subject}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className="bg-primary/20 text-primary">
                          {CATEGORY_LABELS[msg.category] ?? msg.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm">{msg.username}</p>
                            {!msg.userId && (
                              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">Guest</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted">{msg.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {STATUS_BADGES[msg.status] && (
                          <Badge className={STATUS_BADGES[msg.status].className}>
                            {STATUS_BADGES[msg.status].label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden md:table-cell">
                        {formatDate(msg.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openMessage(msg)}
                            title="View"
                          >
                            <Eye size={16} />
                          </Button>
                          {msg.status !== "archived" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusUpdate(msg.id, "archived")}
                              title="Archive"
                            >
                              <Archive size={16} className="text-text-muted" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(msg)}
                            title="Delete"
                          >
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
          <p className="text-sm text-text-muted">{data.pagination.total} messages total</p>
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

      {/* Detail / Reply Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedMessage(null)}>
          <div
            className="bg-surface rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-text">{selectedMessage.subject}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-primary/20 text-primary">
                    {CATEGORY_LABELS[selectedMessage.category] ?? selectedMessage.category}
                  </Badge>
                  {STATUS_BADGES[selectedMessage.status] && (
                    <Badge className={STATUS_BADGES[selectedMessage.status].className}>
                      {STATUS_BADGES[selectedMessage.status].label}
                    </Badge>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="text-text-muted hover:text-text">
                <XCircle size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs text-text-muted mb-1">From</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-text">{selectedMessage.username} &lt;{selectedMessage.email}&gt;</p>
                {!selectedMessage.userId && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">Guest</span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">{formatDate(selectedMessage.createdAt)}</p>
            </div>

            <div className="mb-6 rounded-md bg-surface-light p-4">
              <p className="text-sm text-text whitespace-pre-wrap">{selectedMessage.message}</p>
            </div>

            {selectedMessage.repliedAt && !editReplyMode && (
              <div className="mb-6 rounded-md border border-success/30 bg-success/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-success" />
                    <p className="text-sm font-medium text-success">Reply sent on {formatDate(selectedMessage.repliedAt)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={startEditReply}>
                    <Edit size={14} className="mr-1" /> Edit
                  </Button>
                </div>
                <p className="text-sm text-text-muted whitespace-pre-wrap">{selectedMessage.replyBody}</p>
              </div>
            )}

            {editReplyMode && (
              <div className="mb-6">
                <label className="text-sm font-medium text-text mb-2 block">Edit Reply</label>
                <textarea
                  value={editReplyText}
                  onChange={(e) => setEditReplyText(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text resize-y"
                />
                <p className="text-xs text-text-muted mt-1 text-right">{editReplyText.length}/5000</p>
                {editReplyError && <p className="text-sm text-danger mt-2">{editReplyError}</p>}
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleEditReplySubmit}
                    disabled={editReplyText.trim().length < 10 || editReplySubmitting}
                    size="sm"
                  >
                    <Send size={14} className="mr-1" />
                    {editReplySubmitting ? "Sending…" : "Update & resend"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditReplyMode(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!selectedMessage.repliedAt && !editReplyMode && (
              <div className="mb-4">
                <label className="text-sm font-medium text-text mb-2 block">Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply…"
                  rows={5}
                  maxLength={5000}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text resize-y"
                />
                <p className="text-xs text-text-muted mt-1 text-right">{replyText.length}/5000</p>

                {replyError && (
                  <p className="text-sm text-danger mt-2">{replyError}</p>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleReply}
                    disabled={replyText.trim().length < 10 || replying}
                    size="sm"
                  >
                    <Send size={14} className="mr-1" />
                    {replying ? "Sending…" : "Send reply"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate(selectedMessage.id, "resolved")}
                  >
                    <CheckCircle size={14} className="mr-1" />
                    Mark resolved
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate(selectedMessage.id, "archived")}
                  >
                    <Archive size={14} className="mr-1" />
                    Archive
                  </Button>
                </div>
              </div>
            )}

            {selectedMessage.repliedAt && !editReplyMode && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate(selectedMessage.id, "archived")}
                >
                  <Archive size={14} className="mr-1" />
                  Archive
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => setDeleteTarget(selectedMessage)}
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete contact message"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete this contact message from <span className="font-medium text-text">{deleteTarget?.username}</span>?
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

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
