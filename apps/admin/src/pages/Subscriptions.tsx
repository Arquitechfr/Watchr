import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Star,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  Crown,
  Gift,
  Ban,
  Settings,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { formatDate } from "../lib/utils";
import { logError } from "../lib/logger";

// ─── Types ───

interface SubscriptionStats {
  totalVip: number;
  totalFree: number;
  newVip7d: number;
  newVip30d: number;
  totalRevenue: number;
  estimatedMrr: number;
}

interface SubscriptionRow {
  id: string;
  username: string;
  email: string;
  subscriptionPlan: "free" | "vip";
  revolutCustomerId?: string;
  revolutSubscriptionId?: string;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionsResponse {
  users: SubscriptionRow[];
  total: number;
  page: number;
  limit: number;
}

interface VipFeature {
  id: string;
  icon: string;
  labelKey: string;
  translations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type Tab = "overview" | "subscriptions" | "features" | "config";

// ─── Component ───

export function Subscriptions() {
  const [tab, setTab] = useState<Tab>("overview");

  const tabs: { key: Tab; label: string; icon: typeof CreditCard }[] = [
    { key: "overview", label: "Overview", icon: TrendingUp },
    { key: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { key: "features", label: "VIP Features", icon: Star },
    { key: "config", label: "Config", icon: Settings },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Crown className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">Subscriptions</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "subscriptions" && <SubscriptionsTab />}
      {tab === "features" && <FeaturesTab />}
      {tab === "config" && <ConfigTab />}
    </div>
  );
}

// ─── Overview Tab ───

function OverviewTab() {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/admin/subscriptions/stats");
        setStats(data);
      } catch (err) {
        logError("Failed to load subscription stats", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpis = [
    { label: "Total VIP", value: stats?.totalVip, icon: Crown, color: "text-primary" },
    { label: "Total Free", value: stats?.totalFree, icon: UsersIcon, color: "text-text-muted" },
    { label: "New VIP (7d)", value: stats?.newVip7d, icon: TrendingUp, color: "text-green-400" },
    { label: "New VIP (30d)", value: stats?.newVip30d, icon: TrendingUp, color: "text-green-400" },
    { label: "Est. Revenue", value: stats ? `€${stats.totalRevenue.toFixed(2)}` : undefined, icon: CreditCard, color: "text-primary" },
    { label: "Est. MRR", value: stats ? `€${stats.estimatedMrr.toFixed(2)}` : undefined, icon: TrendingUp, color: "text-primary" },
  ];

  const totalUsers = (stats?.totalVip ?? 0) + (stats?.totalFree ?? 0);
  const vipPercentage = totalUsers > 0 ? ((stats?.totalVip ?? 0) / totalUsers * 100).toFixed(1) : "0";

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <div className="flex items-center gap-3">
              <kpi.icon className={kpi.color} size={20} />
              <div>
                <p className="text-xs text-text-muted">{kpi.label}</p>
                {loading ? (
                  <Skeleton width={50} height={20} />
                ) : (
                  <p className="text-xl font-bold">{kpi.value ?? 0}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VIP Conversion</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton width="100%" height={40} />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-muted">VIP rate</span>
                <span className="text-sm font-bold text-primary">{vipPercentage}%</span>
              </div>
              <div className="h-4 rounded-full bg-surface-light overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${vipPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-muted">
                <span>{stats?.totalVip ?? 0} VIP</span>
                <span>{stats?.totalFree ?? 0} Free</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Subscriptions Tab ───

function SubscriptionsTab() {
  const [data, setData] = useState<SubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "vip">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SubscriptionRow | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<SubscriptionRow | null>(null);
  const [overridePlan, setOverridePlan] = useState<"free" | "vip">("vip");
  const [overrideReason, setOverrideReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/subscriptions", {
        params: { page, limit: 20, search: search || undefined, plan: planFilter },
      });
      setData(data);
    } catch (err) {
      logError("Failed to load subscriptions", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setActionLoading(cancelTarget.id);
    try {
      await api.post(`/admin/subscriptions/${cancelTarget.id}/cancel`);
      setCancelTarget(null);
      load();
    } catch (err) {
      logError("Failed to cancel subscription", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleOverride() {
    if (!overrideTarget || !overrideReason.trim()) return;
    setActionLoading(overrideTarget.id);
    try {
      await api.post(`/admin/subscriptions/${overrideTarget.id}/override`, {
        plan: overridePlan,
        reason: overrideReason,
      });
      setOverrideTarget(null);
      setOverrideReason("");
      load();
    } catch (err) {
      logError("Failed to override subscription", err);
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value as "all" | "free" | "vip");
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="all">All plans</option>
          <option value="vip">VIP only</option>
          <option value="free">Free only</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Revolut Sub ID</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.users.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          icon={Search}
                          title={search || planFilter !== "all" ? "No matching subscriptions" : "No subscriptions found"}
                          description="Try adjusting your search or filters."
                        />
                      </TableCell>
                    </TableRow>
                  )
                  : data?.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-text">{user.username}</span>
                          <span className="text-xs text-text-muted">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.subscriptionPlan === "vip" ? (
                          <Badge className="bg-primary/20 text-primary">
                            <Star size={10} className="mr-1" /> VIP
                          </Badge>
                        ) : (
                          <Badge className="bg-surface-light text-text-muted">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="font-mono text-xs text-text-muted">
                          {user.revolutSubscriptionId ? user.revolutSubscriptionId.slice(0, 12) + "…" : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-text-muted text-xs">
                        {formatDate(user.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.subscriptionPlan === "vip" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setCancelTarget(user)}
                              title="Cancel subscription"
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} className="text-danger" />}
                            </Button>
                          )}
                          {user.subscriptionPlan === "free" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setOverrideTarget(user);
                                setOverridePlan("vip");
                                setOverrideReason("");
                              }}
                              title="Grant VIP"
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} className="text-primary" />}
                            </Button>
                          )}
                          {user.subscriptionPlan === "vip" && !user.revolutSubscriptionId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setOverrideTarget(user);
                                setOverridePlan("free");
                                setOverrideReason("");
                              }}
                              title="Revoke VIP"
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} className="text-danger" />}
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

      {/* Pagination */}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-text-muted">
            {((page - 1) * data.limit) + 1}–{Math.min(page * data.limit, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="flex items-center px-3 text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={`Cancel VIP subscription for ${cancelTarget?.username ?? ""}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            This will cancel the Revolut subscription and downgrade the user to Free. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Cancel</Button>
            <Button
              onClick={handleCancel}
              disabled={actionLoading === cancelTarget?.id}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading === cancelTarget?.id ? "Cancelling..." : "Cancel subscription"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Override Dialog */}
      <Dialog
        open={!!overrideTarget}
        onClose={() => setOverrideTarget(null)}
        title={`${overridePlan === "vip" ? "Grant" : "Revoke"} VIP for ${overrideTarget?.username ?? ""}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            {overridePlan === "vip"
              ? "This will manually grant VIP status without going through Revolut. The user will have VIP until manually revoked."
              : "This will revoke VIP status. If the user has a Revolut subscription, it will be cancelled."}
          </p>
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Reason (required)</label>
            <Input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. Support ticket #123, promotional grant..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
            <Button
              onClick={handleOverride}
              disabled={!overrideReason.trim() || actionLoading === overrideTarget?.id}
            >
              {actionLoading === overrideTarget?.id ? "Processing..." : overridePlan === "vip" ? "Grant VIP" : "Revoke VIP"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ─── Features Tab ───

function FeaturesTab() {
  const [features, setFeatures] = useState<VipFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addData, setAddData] = useState({ icon: "star-outline", label: "", description: "" });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editing, setEditing] = useState<VipFeature | null>(null);
  const [editData, setEditData] = useState({ icon: "", label: "", description: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VipFeature | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/vip-features");
      setFeatures(data);
    } catch (err) {
      logError("Failed to load VIP features", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!addData.label.trim()) return;
    setAddSubmitting(true);
    try {
      await api.post("/admin/vip-features", { icon: addData.icon, label: addData.label, description: addData.description || undefined });
      setShowAddForm(false);
      setAddData({ icon: "star-outline", label: "", description: "" });
      load();
    } catch (err) {
      logError("Failed to create VIP feature", err);
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editing || !editData.label.trim()) return;
    setEditSubmitting(true);
    try {
      await api.patch(`/admin/vip-features/${editing.id}`, {
        icon: editData.icon,
        label: editData.label,
        description: editData.description || undefined,
      });
      setEditing(null);
      load();
    } catch (err) {
      logError("Failed to update VIP feature", err);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleToggleActive(feature: VipFeature) {
    try {
      await api.patch(`/admin/vip-features/${feature.id}`, { isActive: !feature.isActive });
      load();
    } catch (err) {
      logError("Failed to toggle feature", err);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/admin/vip-features/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      logError("Failed to delete VIP feature", err);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  async function handleReorder(direction: "up" | "down", index: number) {
    const newOrder = [...features];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;

    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setFeatures(newOrder);

    setReordering(true);
    try {
      await api.patch("/admin/vip-features/reorder", { ids: newOrder.map((f) => f.id) });
    } catch (err) {
      logError("Failed to reorder features", err);
      load();
    } finally {
      setReordering(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-lg font-semibold">VIP Features</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} className="mr-2" /> Add Feature
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New VIP Feature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Icon (Ionicons name)</label>
                <Input
                  value={addData.icon}
                  onChange={(e) => setAddData({ ...addData, icon: e.target.value })}
                  placeholder="e.g. star-outline"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Label (English)</label>
                <Input
                  value={addData.label}
                  onChange={(e) => setAddData({ ...addData, label: e.target.value })}
                  placeholder="e.g. Ad-free experience"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Description (English, optional)</label>
              <Input
                value={addData.description}
                onChange={(e) => setAddData({ ...addData, description: e.target.value })}
                placeholder="e.g. Enjoy Watchr without any advertisements"
              />
            </div>
            <p className="text-xs text-text-muted">
              The label and description will be automatically translated into all 14 supported languages using AI.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={addSubmitting || !addData.label.trim()}>
                {addSubmitting ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Creating & translating...</>
                ) : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {editing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Edit Feature</span>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
                <X size={18} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Icon</label>
                <Input
                  value={editData.icon}
                  onChange={(e) => setEditData({ ...editData, icon: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Label (English)</label>
                <Input
                  value={editData.label}
                  onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Description (English, optional)</label>
              <Input
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="e.g. Enjoy Watchr without any advertisements"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Label Translations</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(editing.translations).map(([lang, text]) => (
                  <Badge key={lang} className="bg-surface-light text-text-muted">
                    <span className="font-bold mr-1">{lang}:</span> {text}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-1">
                Changing the English label or description will re-translate all languages.
              </p>
            </div>
            {Object.keys(editing.descriptionTranslations).length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Description Translations</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(editing.descriptionTranslations).map(([lang, text]) => (
                    <Badge key={lang} className="bg-surface-light text-text-muted">
                      <span className="font-bold mr-1">{lang}:</span> {text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleEdit} disabled={editSubmitting || !editData.label.trim()}>
                {editSubmitting ? "Saving & translating..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Label (EN)</TableHead>
                <TableHead className="hidden lg:table-cell">Description (EN)</TableHead>
                <TableHead className="hidden md:table-cell">Translations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : features.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          icon={Star}
                          title="No VIP features"
                          description="Click 'Add Feature' to create your first VIP feature."
                        />
                      </TableCell>
                    </TableRow>
                  )
                  : features.map((feature, index) => (
                    <TableRow key={feature.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleReorder("up", index)}
                            disabled={reordering || index === 0}
                            className="text-text-muted hover:text-text disabled:opacity-30"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => handleReorder("down", index)}
                            disabled={reordering || index === features.length - 1}
                            className="text-text-muted hover:text-text disabled:opacity-30"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{feature.icon}</TableCell>
                      <TableCell className="font-medium">{feature.translations.en ?? feature.labelKey}</TableCell>
                      <TableCell className="hidden lg:table-cell text-text-muted text-xs max-w-xs truncate">
                        {feature.descriptionTranslations.en ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(feature.translations).map((lang) => (
                            <Badge key={lang} className="bg-surface-light text-text-muted text-[10px]">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleActive(feature)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            feature.isActive ? "bg-primary" : "bg-surface-light"
                          }`}
                          aria-label="Toggle active"
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                              feature.isActive ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(feature);
                              setEditData({ icon: feature.icon, label: feature.translations.en ?? "", description: feature.descriptionTranslations.en ?? "" });
                            }}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(feature)}
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

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete feature "${deleteTarget?.translations.en ?? deleteTarget?.labelKey ?? ""}"`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete this VIP feature? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={handleDelete}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ─── Config Tab ───

function ConfigTab() {
  const [config, setConfig] = useState<Record<string, { value: string; description: string }>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const CONFIG_KEYS = [
    { key: "revolut_plan_variation_id", label: "Revolut Plan Variation ID", description: "The variation ID for the monthly VIP plan in Revolut" },
    { key: "revolut_plan_id", label: "Revolut Plan ID", description: "The plan ID for Watchr VIP in Revolut" },
  ];

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/admin/config");
        const map: Record<string, { value: string; description: string }> = {};
        for (const entry of data) {
          map[entry.key] = { value: entry.value, description: entry.description ?? "" };
        }
        setConfig(map);
      } catch (err) {
        logError("Failed to load config", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(key: string) {
    setSaving(true);
    try {
      const entry = config[key];
      await api.put(`/admin/config/${key}`, {
        value: editValue,
        type: "string",
        description: entry?.description ?? "",
      });
      setConfig({ ...config, [key]: { ...entry!, value: editValue } });
      setEditing(null);
    } catch (err) {
      logError("Failed to save config", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Revolut Configuration</h2>
      <Card>
        <CardContent className="space-y-4">
          {loading
            ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} width="100%" height={60} />)
            : CONFIG_KEYS.map(({ key, label, description }) => (
              <div key={key} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-text">{label}</p>
                    <p className="text-xs text-text-muted">{description}</p>
                  </div>
                </div>
                {editing === key ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Button size="sm" onClick={() => handleSave(key)} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 text-xs text-text-muted bg-surface-light rounded px-3 py-2 font-mono truncate">
                      {config[key]?.value ?? "—"}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(key);
                        setEditValue(config[key]?.value ?? "");
                      }}
                    >
                      <Edit size={14} className="mr-1" /> Edit
                    </Button>
                  </div>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Monthly Price</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            The monthly VIP price is displayed as €3.99/month in the app. To change it, update the Revolut plan variation in your Revolut dashboard and update the plan variation ID above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
