import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  UserPlus,
  MessageSquare,
  Star,
  Inbox,
  Flag,
  Download,
  CheckCheck,
} from "lucide-react";
import { useAdminNotificationStore, type FeedNotification } from "../store/adminNotificationStore";
import { cn } from "../lib/utils";

const TYPE_ICONS: Record<string, typeof Bell> = {
  user_registered: UserPlus,
  new_comment: MessageSquare,
  new_rating: Star,
  new_contact: Inbox,
  new_report: Flag,
  import_completed: Download,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-text-muted",
  warning: "text-yellow-400",
  critical: "text-red-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    dropdownOpen,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    setDropdownOpen,
  } = useAdminNotificationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dropdownOpen) {
      fetchNotifications(10);
    }
  }, [dropdownOpen, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, setDropdownOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative flex items-center justify-center rounded-md p-2 text-text-muted hover:bg-surface-light hover:text-text transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute top-full z-50 mt-2 w-80 rounded-lg border border-border bg-surface shadow-lg right-0 md:left-full md:right-auto">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-text">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onMarkRead={() => markAsRead(notif.id)}
                  onClick={() => {
                    if (!notif.readAt) markAsRead(notif.id);
                    setDropdownOpen(false);
                    navigateToResource(navigate, notif);
                  }}
                />
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                setDropdownOpen(false);
                navigate("/admin-feed");
              }}
              className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function navigateToResource(navigate: ReturnType<typeof useNavigate>, notif: FeedNotification) {
  const meta = notif.metadata as Record<string, string>;
  switch (notif.type) {
    case "user_registered":
      if (meta.refId) navigate(`/users/${meta.refId}`);
      else navigate("/users");
      break;
    case "new_comment":
      if (meta.showId) navigate(`/shows/${meta.showId}`);
      else navigate("/comments");
      break;
    case "new_rating":
      if (meta.showId) navigate(`/shows/${meta.showId}`);
      else navigate("/shows");
      break;
    case "new_contact":
      navigate("/contact");
      break;
    case "new_report":
      navigate("/reports");
      break;
    case "import_completed":
      navigate("/imports");
      break;
  }
}

function NotificationItem({
  notif,
  onMarkRead,
  onClick,
}: {
  notif: FeedNotification;
  onMarkRead: () => void;
  onClick: () => void;
}) {
  const Icon = TYPE_ICONS[notif.type] ?? Bell;

  return (
    <div
      className={cn(
        "flex gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-surface-light/50 cursor-pointer",
        !notif.readAt && "bg-primary/5",
      )}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <div className="shrink-0">
        <Icon size={18} className={cn(SEVERITY_COLORS[notif.severity] ?? "text-text-muted")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{notif.title}</p>
        <p className="text-xs text-text-muted line-clamp-2">{notif.message}</p>
        {!!notif.metadata?.showTitle && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-text-muted/60">
              {String(notif.metadata.showTitle)}
              {notif.metadata.episodeRef
                ? ` — S${(notif.metadata.episodeRef as { season: number }).season}E${(notif.metadata.episodeRef as { episode: number }).episode}`
                : ""}
            </span>
          </div>
        )}
        <p className="text-[10px] text-text-muted/70 mt-0.5">{timeAgo(notif.createdAt)}</p>
      </div>
      {!notif.readAt && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
          }}
          className="shrink-0 text-text-muted hover:text-primary transition-colors"
          aria-label="Mark as read"
        >
          <CheckCheck size={14} />
        </button>
      )}
    </div>
  );
}
