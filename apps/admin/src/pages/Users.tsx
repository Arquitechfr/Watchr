import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Shield, ShieldOff, Ban, Users as UsersIcon } from "lucide-react";
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

interface UserRow {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  hasCompletedOnboarding: boolean;
  isBanned: boolean;
  bannedAt: string | null;
  suspendedUntil: string | null;
  banReason: string | null;
  preferredLanguage?: string;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧 EN",
  fr: "🇫🇷 FR",
  es: "🇪🇸 ES",
  pt: "🇵🇹 PT",
  de: "🇩🇪 DE",
  it: "🇮🇹 IT",
  ar: "🇸🇦 AR",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
  ar: "Arabic",
};

function getStatusBadge(user: UserRow) {
  if (user.isBanned) {
    return <Badge className="bg-red-500/20 text-red-400">Banned</Badge>;
  }
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    return (
      <Badge className="bg-orange-500/20 text-orange-400">
        Suspended until {formatDate(user.suspendedUntil)}
      </Badge>
    );
  }
  return <Badge className="bg-green-500/20 text-green-400">Active</Badge>;
}

interface BanDialogState {
  open: boolean;
  userId: string;
  username: string;
  preferredLanguage?: string;
}

export function Users() {
  const navigate = useNavigate();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [banDialog, setBanDialog] = useState<BanDialogState | null>(null);
  const [dialogAction, setDialogAction] = useState<"ban" | "unban" | "suspend" | "unsuspend">("ban");
  const [dialogReason, setDialogReason] = useState("");
  const [dialogDelay, setDialogDelay] = useState(0);
  const [dialogDuration, setDialogDuration] = useState(7);
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get("/admin/users", { params });
      setData(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search, roleFilter, page]);

  async function handleRoleChange(userId: string, role: "user" | "admin") {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      load();
    } catch (err) {
      console.error("Failed to update user role:", err);
    }
  }

  function openBanDialog(user: UserRow) {
    setBanDialog({
      open: true,
      userId: user.id,
      username: user.username,
      preferredLanguage: user.preferredLanguage,
    });
    setDialogAction("ban");
    setDialogReason("");
    setDialogDelay(0);
    setDialogDuration(7);
  }

  function closeBanDialog() {
    setBanDialog(null);
  }

  async function submitBanAction() {
    if (!banDialog) return;
    if ((dialogAction === "ban" || dialogAction === "suspend") && !dialogReason.trim()) return;

    setDialogSubmitting(true);
    try {
      await api.patch(`/admin/users/${banDialog.userId}/status`, {
        action: dialogAction,
        reason: dialogReason.trim(),
        delayHours: dialogDelay,
        durationDays: dialogAction === "suspend" ? dialogDuration : undefined,
      });
      closeBanDialog();
      load();
    } catch (err) {
      console.error("Failed to update user status:", err);
    } finally {
      setDialogSubmitting(false);
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;
  const langLabel = banDialog?.preferredLanguage
    ? `${LANGUAGE_FLAGS[banDialog.preferredLanguage] ?? banDialog.preferredLanguage} — ${LANGUAGE_NAMES[banDialog.preferredLanguage] ?? banDialog.preferredLanguage}`
    : "Unknown";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by email or username..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
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
                : data && data.users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          icon={UsersIcon}
                          title="No users found"
                          description={search || roleFilter ? "Try adjusting your search or filters." : "No users have registered yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : data?.users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      <TableCell className="font-medium">
                        {user.username}
                        {user.preferredLanguage && (
                          <span className="ml-2 text-xs text-text-muted">
                            {LANGUAGE_FLAGS[user.preferredLanguage] ?? user.preferredLanguage}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell">{user.email}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          className={
                            user.role === "admin"
                              ? "bg-primary/20 text-primary"
                              : "bg-surface-light text-text-muted"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">
                        {formatDate(user.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {user.role === "admin" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRoleChange(user.id, "user")}
                              title="Demote admin"
                            >
                              <ShieldOff size={16} />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRoleChange(user.id, "admin")}
                              title="Promote to admin"
                            >
                              <Shield size={16} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openBanDialog(user)}
                            title="Manage ban/suspend"
                          >
                            <Ban size={16} />
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
          <p className="text-sm text-text-muted">
            {data.total} users total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="flex items-center px-3 text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={!!banDialog?.open}
        onClose={closeBanDialog}
        title={`Manage ${banDialog?.username ?? ""}`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md bg-surface-light px-3 py-2">
            <span className="text-sm text-text-muted">User language:</span>
            <span className="text-sm font-medium text-text">{langLabel}</span>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-muted">Action</label>
            <select
              value={dialogAction}
              onChange={(e) => setDialogAction(e.target.value as typeof dialogAction)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
            >
              <option value="ban">Ban (permanent)</option>
              <option value="unban">Unban</option>
              <option value="suspend">Suspend (temporary)</option>
              <option value="unsuspend">Unsuspend</option>
            </select>
          </div>

          {(dialogAction === "ban" || dialogAction === "suspend") && (
            <>
              <div>
                <label className="mb-1 block text-sm text-text-muted">
                  Reason (in {LANGUAGE_NAMES[banDialog?.preferredLanguage ?? "en"] ?? "English"})
                </label>
                <textarea
                  value={dialogReason}
                  onChange={(e) => setDialogReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
                  placeholder="Enter the reason for this action..."
                />
                <p className="mt-1 text-xs text-text-muted">{dialogReason.length}/500</p>
              </div>

              <div>
                <label className="mb-1 block text-sm text-text-muted">Delay before execution</label>
                <select
                  value={dialogDelay}
                  onChange={(e) => setDialogDelay(Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
                >
                  <option value={0}>Immediate</option>
                  <option value={1}>1 hour</option>
                  <option value={6}>6 hours</option>
                  <option value={24}>24 hours</option>
                  <option value={48}>48 hours</option>
                  <option value={72}>72 hours</option>
                </select>
              </div>
            </>
          )}

          {dialogAction === "suspend" && (
            <div>
              <label className="mb-1 block text-sm text-text-muted">Duration (days)</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={dialogDuration}
                onChange={(e) => setDialogDuration(Number(e.target.value))}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeBanDialog}>
              Cancel
            </Button>
            <Button
              onClick={submitBanAction}
              disabled={
                dialogSubmitting ||
                ((dialogAction === "ban" || dialogAction === "suspend") && !dialogReason.trim())
              }
            >
              {dialogDelay > 0 ? "Schedule" : "Execute now"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
