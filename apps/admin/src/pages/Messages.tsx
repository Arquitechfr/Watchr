import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Flag, Ban, BarChart3, Trash2, Check, X } from "lucide-react";
import api from "../lib/api";
import { cn } from "../lib/utils";

interface MessageStats {
  totalConversations: number;
  totalMessages: number;
  pendingReports: number;
  totalBlocks: number;
  activeConversationsToday: number;
}

interface Conversation {
  id: string;
  participants: Array<{ id: string; username: string; avatarUrl?: string; email: string }>;
  lastMessageAt: string;
  createdAt: string;
}

interface MessageReport {
  id: string;
  messageId: string;
  conversationId: string;
  reporter: string;
  reason: string;
  status: string;
  messageContent: string;
  messageHidden: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface BlockEntry {
  id: string;
  blocker: string;
  blocked: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

type Tab = "stats" | "conversations" | "reports" | "blocks";

export function Messages() {
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/messages/stats");
      setStats(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversations = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/messages/conversations", { params: { page: p, limit: 20 } });
      setConversations(res.data.conversations);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/messages/reports", { params: { page: p, limit: 20 } });
      setReports(res.data.reports);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBlocks = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/messages/blocks", { params: { page: p, limit: 20 } });
      setBlocks(res.data.blocks);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    if (tab === "stats") fetchStats();
    else if (tab === "conversations") fetchConversations(1);
    else if (tab === "reports") fetchReports(1);
    else if (tab === "blocks") fetchBlocks(1);
  }, [tab]);

  function handleResolveReport(reportId: string) {
    api.patch(`/admin/messages/reports/${reportId}/resolve`).then(() => {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    });
  }

  function handleDismissReport(reportId: string) {
    api.patch(`/admin/messages/reports/${reportId}/dismiss`).then(() => {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    });
  }

  function handleDeleteMessage(messageId: string) {
    if (!confirm("Delete this message?")) return;
    api.delete(`/admin/messages/messages/${messageId}`).then(() => {
      setReports((prev) => prev.filter((r) => r.messageId !== messageId));
    });
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof MessageSquare }> = [
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "conversations", label: "Conversations", icon: MessageSquare },
    { id: "reports", label: "Reports", icon: Flag },
    { id: "blocks", label: "Blocks", icon: Ban },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">Messages</h1>

      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            <t.icon size={16} />
            {t.label}
            {t.id === "reports" && stats && stats.pendingReports > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-background">
                {stats.pendingReports}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && tab === "stats" && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Conversations" value={stats.totalConversations} />
          <StatCard label="Total Messages" value={stats.totalMessages} />
          <StatCard label="Pending Reports" value={stats.pendingReports} highlight={stats.pendingReports > 0} />
          <StatCard label="Total Blocks" value={stats.totalBlocks} />
          <StatCard label="Active Today" value={stats.activeConversationsToday} />
        </div>
      )}

      {!loading && tab === "conversations" && (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div key={conv.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {conv.participants.map((p) => (
                    <span key={p.id} className="text-sm font-medium text-text">
                      {p.username}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(conv.lastMessageAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-center text-text-muted py-8">No conversations found</p>
          )}
          <Pagination page={page} total={total} onPageChange={(p) => { setPage(p); fetchConversations(p); }} />
        </div>
      )}

      {!loading && tab === "reports" && (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase text-primary">{report.reason}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      report.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                      report.status === "resolved" ? "bg-green-500/20 text-green-500" :
                      "bg-gray-500/20 text-gray-500",
                    )}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-sm text-text mb-1 truncate">{report.messageContent}</p>
                  <p className="text-xs text-text-muted">
                    Reported by {report.reporter} • {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleResolveReport(report.id)}
                    className="flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20"
                  >
                    <Check size={14} /> Resolve
                  </button>
                  <button
                    onClick={() => handleDismissReport(report.id)}
                    className="flex items-center gap-1 rounded-md bg-gray-500/10 px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-500/20"
                  >
                    <X size={14} /> Dismiss
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(report.messageId)}
                    className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <p className="text-center text-text-muted py-8">No reports found</p>
          )}
          <Pagination page={page} total={total} onPageChange={(p) => { setPage(p); fetchReports(p); }} />
        </div>
      )}

      {!loading && tab === "blocks" && (
        <div className="space-y-2">
          {blocks.map((block) => (
            <div key={block.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-text">{block.blocker}</span>
                  <Ban size={14} className="text-text-muted" />
                  <span className="font-medium text-text">{block.blocked}</span>
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(block.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {blocks.length === 0 && (
            <p className="text-center text-text-muted py-8">No blocks found</p>
          )}
          <Pagination page={page} total={total} onPageChange={(p) => { setPage(p); fetchBlocks(p); }} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg border p-4",
      highlight ? "border-primary/50 bg-primary/5" : "border-border bg-surface",
    )}>
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", highlight ? "text-primary" : "text-text")}>{value}</p>
    </div>
  );
}

function Pagination({ page, total, onPageChange }: { page: number; total: number; onPageChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / 20);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted disabled:opacity-50 hover:text-text"
      >
        Previous
      </button>
      <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted disabled:opacity-50 hover:text-text"
      >
        Next
      </button>
    </div>
  );
}
