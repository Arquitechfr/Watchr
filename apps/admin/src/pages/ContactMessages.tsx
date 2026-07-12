import { useEffect, useState } from "react";
import { Mail, CheckCircle, XCircle, Archive, Eye, Send, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../lib/utils";

interface ContactMessage {
  id: string;
  userId: string;
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
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const [contactRes, statsRes] = await Promise.all([
        api.get("/admin/contact", { params }),
        api.get("/admin/contact/stats"),
      ]);
      setData(contactRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load contact messages:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, categoryFilter, page]);

  async function openMessage(msg: ContactMessage) {
    setDetailLoading(true);
    setSelectedMessage(null);
    setReplyText("");
    setReplyError(null);
    try {
      const res = await api.get(`/admin/contact/${msg.id}`);
      setSelectedMessage(res.data);
      if (res.data.status === "new") {
        await api.patch(`/admin/contact/${msg.id}/status`, { status: "read" });
        load();
      }
    } catch (err) {
      console.error("Failed to load contact detail:", err);
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
      console.error("Failed to update status:", err);
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
      load();
    } catch (err: any) {
      setReplyError(err?.response?.data?.error?.message ?? "Failed to send reply");
    } finally {
      setReplying(false);
    }
  }

  const totalPages = data?.pagination.pages ?? 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Contact Messages</h1>

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
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
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
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data && data.data.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          icon={Mail}
                          title="No messages found"
                          description={statusFilter || categoryFilter ? "Try adjusting your filters." : "No contact messages have been submitted yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : data?.data.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="max-w-xs truncate font-medium">{msg.subject}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className="bg-primary/20 text-primary">
                          {CATEGORY_LABELS[msg.category] ?? msg.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell">
                        <div>
                          <p className="text-sm">{msg.username}</p>
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
              <p className="text-sm text-text">{selectedMessage.username} &lt;{selectedMessage.email}&gt;</p>
              <p className="text-xs text-text-muted mt-1">{formatDate(selectedMessage.createdAt)}</p>
            </div>

            <div className="mb-6 rounded-md bg-surface-light p-4">
              <p className="text-sm text-text whitespace-pre-wrap">{selectedMessage.message}</p>
            </div>

            {selectedMessage.repliedAt && (
              <div className="mb-6 rounded-md border border-success/30 bg-success/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-success" />
                  <p className="text-sm font-medium text-success">Reply sent on {formatDate(selectedMessage.repliedAt)}</p>
                </div>
                <p className="text-sm text-text-muted whitespace-pre-wrap">{selectedMessage.replyBody}</p>
              </div>
            )}

            {!selectedMessage.repliedAt && (
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

            {selectedMessage.repliedAt && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate(selectedMessage.id, "archived")}
                >
                  <Archive size={14} className="mr-1" />
                  Archive
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
