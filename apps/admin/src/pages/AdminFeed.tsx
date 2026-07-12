import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  UserPlus,
  MessageSquare,
  Star,
  Inbox,
  Flag,
  Download,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../lib/utils";

interface FeedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface FeedResult {
  notifications: FeedNotification[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  user_registered: UserPlus,
  new_comment: MessageSquare,
  new_rating: Star,
  new_contact: Inbox,
  new_report: Flag,
  import_completed: Download,
};

const TYPE_LABELS: Record<string, string> = {
  user_registered: "User Registration",
  new_comment: "Comment",
  new_rating: "Rating",
  new_contact: "Contact",
  new_report: "Report",
  import_completed: "Import",
};

const SEVERITY_BADGES: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
};

const TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "user_registered", label: "User Registration" },
  { value: "new_comment", label: "Comments" },
  { value: "new_rating", label: "Ratings" },
  { value: "new_contact", label: "Contact" },
  { value: "new_report", label: "Reports" },
  { value: "import_completed", label: "Imports" },
];

export function AdminFeed() {
  const [data, setData] = useState<FeedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit };
      if (typeFilter) params.type = typeFilter;
      if (unreadOnly) params.unreadOnly = true;
      const { data: result } = await api.get("/admin/feed-notifications", { params });
      setData(result);
    } catch (err) {
      console.error("Failed to load feed notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMarkAsRead(id: string) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
            ),
          }
        : prev,
    );
    try {
      await api.patch(`/admin/feed-notifications/${id}/read`);
    } catch {
      load();
    }
  }

  async function handleMarkAllRead() {
    setData((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((n) => ({ ...n, readAt: new Date().toISOString() })),
          }
        : prev,
    );
    try {
      await api.patch("/admin/feed-notifications/read-all");
    } catch {
      load();
    }
  }

  async function handleDelete(id: string) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.filter((n) => n.id !== id),
            total: prev.total - 1,
          }
        : prev,
    );
    try {
      await api.delete(`/admin/feed-notifications/${id}`);
    } catch {
      load();
    }
  }

  const hasUnread = data?.notifications.some((n) => !n.readAt) ?? false;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Activity Feed</h1>
        {hasUnread && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck size={16} className="mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(1);
            }}
            className="rounded border-border"
          />
          Unread only
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={60} />
              ))}
            </div>
          ) : !data || data.notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="Important events will appear here as they happen."
            />
          ) : (
            <div className="divide-y divide-border">
              {data.notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type] ?? Bell;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-4 p-4 transition-colors hover:bg-surface-light/30 ${
                      !notif.readAt ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <Icon
                        size={20}
                        className={
                          notif.severity === "warning"
                            ? "text-yellow-400"
                            : notif.severity === "critical"
                              ? "text-red-400"
                              : "text-text-muted"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text">{notif.title}</span>
                        <Badge className={SEVERITY_BADGES[notif.severity] ?? SEVERITY_BADGES.info}>
                          {notif.severity}
                        </Badge>
                        <Badge className="bg-surface-light text-text-muted">
                          {TYPE_LABELS[notif.type] ?? notif.type}
                        </Badge>
                        {!notif.readAt && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-text-muted mt-1">{notif.message}</p>
                      {!!notif.metadata?.showTitle && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className="bg-surface-light text-text-muted">
                            {String(notif.metadata.showTitle)}
                            {notif.metadata.episodeRef
                              ? ` — S${(notif.metadata.episodeRef as { season: number }).season}E${(notif.metadata.episodeRef as { episode: number }).episode}`
                              : ""}
                          </Badge>
                        </div>
                      )}
                      {!!notif.metadata?.username && notif.type !== "user_registered" && (
                        <span className="text-xs text-text-muted/60 mt-0.5">
                          by {String(notif.metadata.username)}
                        </span>
                      )}
                      <p className="text-xs text-text-muted/70 mt-1">{formatDate(notif.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notif.readAt && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="rounded-md p-1.5 text-text-muted hover:text-primary transition-colors"
                          aria-label="Mark as read"
                        >
                          <CheckCheck size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="rounded-md p-1.5 text-text-muted hover:text-red-400 transition-colors"
                        aria-label="Delete notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-text-muted">
            Page {data.page} of {data.pages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
