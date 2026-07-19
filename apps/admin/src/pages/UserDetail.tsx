import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Tv, Heart, Star, Download, Trash2, MessageCircleX, ChevronLeft, ChevronRight, KeyRound } from "lucide-react";
import api from "../lib/api";
import { useUserNavigationStore } from "../store/userNavigationStore";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { formatDate } from "../lib/utils";

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
  pt: "🇵🇹",
  de: "🇩🇪",
  it: "🇮🇹",
  ar: "🇸🇦",
};

const PLATFORM_LABELS: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
};

const PLATFORM_ICONS: Record<string, string> = {
  ios: "📱",
  android: "🤖",
  web: "🌐",
};

interface UserDetail {
  id: string;
  email: string;
  username: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  preferredLanguage?: string;
  themePreference: string;
  hasCompletedOnboarding: boolean;
  googleLinked: boolean;
  isBanned: boolean;
  bannedAt: string | null;
  suspendedUntil: string | null;
  banReason: string | null;
  signupPlatform?: string | null;
  trackingCount: number;
  favoritesCount: number;
  ratingsCount: number;
  importJobsCount: number;
  recentComments: Array<{ id: string; content: string; showId: string; createdAt: string }>;
}

interface BanHistoryEntry {
  id: string;
  action: string;
  reason: string;
  delayHours: number;
  scheduledAt: string;
  executedAt: string | null;
  status: string;
}

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canGoNext, canGoPrev, nextUser, prevUser } = useUserNavigationStore();

  function handlePrevUser() {
    const prevId = prevUser();
    if (prevId) navigate(`/users/${prevId}`);
  }

  function handleNextUser() {
    const nextId = nextUser();
    if (nextId) navigate(`/users/${nextId}`);
  }
  const [user, setUser] = useState<UserDetail | null>(null);
  const [banHistory, setBanHistory] = useState<BanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [commentsDialog, setCommentsDialog] = useState(false);
  const [commentsConfirmStep, setCommentsConfirmStep] = useState<1 | 2>(1);
  const [commentsSubmitting, setCommentsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [userRes, historyRes] = await Promise.all([
          api.get(`/admin/users/${id}`),
          api.get(`/admin/users/${id}/ban-history`),
        ]);
        setUser(userRes.data);
        setBanHistory(historyRes.data);
      } catch (err) {
        console.error("Failed to load user:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Skeleton height={32} className="mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={100} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return <p>User not found</p>;

  async function handleDeleteUser() {
    setDeleteSubmitting(true);
    try {
      await api.delete(`/admin/users/${id}`);
      navigate("/users");
    } catch (err) {
      console.error("Failed to delete user:", err);
      setDeleteSubmitting(false);
    }
  }

  async function handleDeleteAllComments() {
    setCommentsSubmitting(true);
    try {
      await api.delete(`/admin/users/${id}/comments`);
      setCommentsDialog(false);
      setCommentsConfirmStep(1);
      setUser((prev) => prev ? { ...prev, recentComments: [] } : prev);
    } catch (err) {
      console.error("Failed to delete user comments:", err);
    } finally {
      setCommentsSubmitting(false);
    }
  }

  function openCommentsDialog() {
    setCommentsConfirmStep(1);
    setCommentsDialog(true);
  }

  function closeCommentsDialog() {
    setCommentsDialog(false);
    setCommentsConfirmStep(1);
  }

  const statCards = [
    { label: "Tracking", value: user.trackingCount, icon: Tv },
    { label: "Favorites", value: user.favoritesCount, icon: Heart },
    { label: "Ratings", value: user.ratingsCount, icon: Star },
    { label: "Import Jobs", value: user.importJobsCount, icon: Download },
    { label: "Comments", value: user.recentComments.length, icon: MessageSquare },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={() => navigate("/users")}>
          <ArrowLeft size={16} className="mr-2" /> Back to Users
        </Button>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevUser}
            disabled={!canGoPrev()}
            title="Previous user"
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextUser}
            disabled={!canGoNext()}
            title="Next user"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-background">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          <p className="text-text-muted">{user.email}</p>
          <div className="flex gap-2 mt-1">
            <Badge className="bg-primary/20 text-primary">{user.role}</Badge>
            {user.googleLinked && (
              <Badge className="bg-surface-light text-text-muted">Google linked</Badge>
            )}
            {user.isBanned && (
              <Badge className="bg-red-500/20 text-red-400">Banned</Badge>
            )}
            {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
              <Badge className="bg-orange-500/20 text-orange-400">
                Suspended until {formatDate(user.suspendedUntil)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(`/api-keys?userId=${user.id}`)}
        >
          <KeyRound size={16} className="mr-2" />
          View API Keys
        </Button>
      </div>

      {user.role !== "admin" && (
        <div className="flex flex-col sm:flex-row justify-end gap-3 mb-6">
          <Button
            onClick={openCommentsDialog}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <MessageCircleX size={16} className="mr-2" />
            Delete all comments
          </Button>
          <Button
            onClick={() => setDeleteDialog(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 size={16} className="mr-2" />
            Delete account
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <stat.icon className="text-primary" size={20} />
              <div>
                <p className="text-xs text-text-muted">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Joined</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Last Login</span>
              <span>{formatDate(user.lastLoginAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Language</span>
              <span>{user.preferredLanguage ? `${LANGUAGE_FLAGS[user.preferredLanguage] ?? ""} ${user.preferredLanguage}` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Theme</span>
              <span>{user.themePreference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Onboarding</span>
              <span>{user.hasCompletedOnboarding ? "Completed" : "Pending"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Signup Platform</span>
              <span>{user.signupPlatform ? `${PLATFORM_ICONS[user.signupPlatform] ?? "❓"} ${PLATFORM_LABELS[user.signupPlatform] ?? user.signupPlatform}` : "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.recentComments.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No comments"
                description="This user hasn't posted any comments yet."
              />
            ) : (
              user.recentComments.map((comment) => (
                <div key={comment.id} className="border-b border-border pb-2 last:border-0">
                  <p className="text-sm line-clamp-2">{comment.content}</p>
                  <p className="text-xs text-text-muted mt-1">{formatDate(comment.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Ban History</CardTitle>
          </CardHeader>
          <CardContent>
            {banHistory.length === 0 ? (
              <EmptyState
                title="No ban actions recorded"
                description="This user has a clean record with no ban or suspension history."
              />
            ) : (
              <div className="space-y-3">
                {banHistory.map((entry) => (
                  <div key={entry.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            entry.action === "ban"
                              ? "bg-red-500/20 text-red-400"
                              : entry.action === "suspend"
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-green-500/20 text-green-400"
                          }
                        >
                          {entry.action}
                        </Badge>
                        <Badge
                          className={
                            entry.status === "executed"
                              ? "bg-surface-light text-text-muted"
                              : entry.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-gray-500/20 text-gray-400"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-text-muted">{formatDate(entry.scheduledAt)}</span>
                    </div>
                    <p className="mt-2 text-sm">{entry.reason}</p>
                    {entry.delayHours > 0 && (
                      <p className="mt-1 text-xs text-text-muted">
                        Delay: {entry.delayHours}h
                      </p>
                    )}
                    {entry.executedAt && (
                      <p className="mt-1 text-xs text-text-muted">
                        Executed: {formatDate(entry.executedAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        title={`Delete ${user.username}`}
      >
        <div className="space-y-4">
          <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3">
            <p className="text-sm text-red-400 font-medium">This action is irreversible.</p>
            <p className="text-sm text-text-muted mt-1">
              The user account and all associated data will be permanently deleted, including:
            </p>
            <ul className="text-sm text-text-muted mt-2 space-y-1 pl-4 list-disc">
              <li>Comments, likes and reactions</li>
              <li>Watch history and favorites</li>
              <li>Ratings and reviews</li>
              <li>Import jobs and pending reviews</li>
              <li>Trakt link and ban history</li>
              <li>Reports submitted by this user</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSubmitting ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={commentsDialog}
        onClose={closeCommentsDialog}
        title={`Delete all comments from ${user.username}`}
      >
        <div className="space-y-4">
          {commentsConfirmStep === 1 ? (
            <>
              <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-sm text-red-400 font-medium">Warning</p>
                <p className="text-sm text-text-muted mt-1">
                  This will permanently delete <span className="font-bold text-text">all comments</span> posted by {user.username}, along with their likes, reactions, and associated reports.
                </p>
                <p className="text-sm text-text-muted mt-2">
                  The user account itself will not be deleted.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeCommentsDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setCommentsConfirmStep(2)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-sm text-red-400 font-bold">Final confirmation</p>
                <p className="text-sm text-text-muted mt-1">
                  Are you absolutely sure? This action cannot be undone. All comments will be permanently removed.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCommentsConfirmStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleDeleteAllComments}
                  disabled={commentsSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {commentsSubmitting ? "Deleting comments..." : "Yes, delete all comments"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
