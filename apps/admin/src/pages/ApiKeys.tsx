import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KeyRound, Search, ChevronLeft, ChevronRight, Ban, Trash2, X } from "lucide-react";
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
import { logError } from "../lib/logger";

interface ApiKeyUser {
  id: string;
  email: string;
  username: string;
}

interface ApiKeyRow {
  id: string;
  user: ApiKeyUser | null;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface ApiKeysResponse {
  data: ApiKeyRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function ApiKeys() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdFilter = searchParams.get("userId") ?? "";

  const [data, setData] = useState<ApiKeysResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (userIdFilter) params.userId = userIdFilter;
      const { data } = await api.get<ApiKeysResponse>("/admin/api-keys", { params });
      setData(data);
    } catch (err) {
      logError("Failed to load API keys", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search, page, userIdFilter]);

  function clearUserFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("userId");
    setSearchParams(next, { replace: true });
    setPage(1);
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget) return;
    setRevokeSubmitting(true);
    try {
      await api.post(`/admin/api-keys/${revokeTarget.id}/revoke`);
      setRevokeTarget(null);
      toast("API key revoked successfully", "success");
      load();
    } catch (err) {
      logError("Failed to revoke API key", err);
      toast("Failed to revoke API key", "error");
    } finally {
      setRevokeSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/admin/api-keys/${deleteTarget.id}`);
      setDeleteTarget(null);
      toast("API key deleted successfully", "success");
      load();
    } catch (err) {
      logError("Failed to delete API key", err);
      toast("Failed to delete API key", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const totalPages = data?.pagination.pages ?? 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by user email or username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
      </div>

      {userIdFilter && (
        <div className="flex items-center gap-2 mb-4 rounded-md border border-primary/30 bg-primary/10 px-4 py-2">
          <span className="text-sm text-text">Filtered by user</span>
          <Badge className="bg-primary/20 text-primary">{userIdFilter}</Badge>
          <Button variant="ghost" size="sm" onClick={clearUserFilter} className="ml-auto">
            <X size={14} className="mr-1" /> Clear filter
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Key Prefix</TableHead>
                <TableHead className="hidden md:table-cell">Scopes</TableHead>
                <TableHead className="hidden lg:table-cell">Last Used</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data && data.data.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <EmptyState
                          icon={KeyRound}
                          title="No API keys found"
                          description={search || userIdFilter ? "Try adjusting your search or filters." : "No API keys have been created yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : data?.data.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        {key.user ? (
                          <div>
                            <p className="text-sm font-medium">{key.user.username}</p>
                            <p className="text-xs text-text-muted">{key.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-text-muted italic">Orphaned key</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="rounded bg-surface-light px-1.5 py-0.5 text-xs text-text-muted">{key.keyPrefix}…</code>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex gap-1">
                          {key.scopes.map((scope) => (
                            <Badge
                              key={scope}
                              className={scope === "write" ? "bg-orange-500/20 text-orange-400" : "bg-primary/20 text-primary"}
                            >
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">
                        {formatDate(key.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">
                        {formatDate(key.createdAt)}
                      </TableCell>
                      <TableCell>
                        {key.revokedAt ? (
                          <Badge className="bg-red-500/20 text-red-400">Revoked</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRevokeTarget(key)}
                            disabled={!!key.revokedAt}
                            title="Revoke"
                          >
                            <Ban size={16} className={key.revokedAt ? "text-text-muted/40" : "text-orange-400"} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(key)}
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
          <p className="text-sm text-text-muted">{data.pagination.total} API keys total</p>
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

      <Dialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke API key"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to revoke the key <span className="font-medium text-text">{revokeTarget?.name}</span>
            {revokeTarget?.user ? (
              <> for <span className="font-medium text-text">{revokeTarget.user.email}</span></>
            ) : null}?
          </p>
          <p className="text-sm text-text-muted">
            The key will stop working immediately, but the record will be kept for audit purposes. This action can be undone by creating a new key.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button
              onClick={handleRevokeConfirm}
              disabled={revokeSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {revokeSubmitting ? "Revoking..." : "Revoke key"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete API key"
      >
        <div className="space-y-4">
          <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3">
            <p className="text-sm text-red-400 font-medium">This action is irreversible.</p>
            <p className="text-sm text-text-muted mt-1">
              Unlike revoking, deleting will permanently remove the key <span className="font-medium text-text">{deleteTarget?.name}</span>
              {deleteTarget?.user ? (
                <> for <span className="font-medium text-text">{deleteTarget.user.email}</span></>
              ) : null}. The key record will no longer be visible in this list.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSubmitting ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
