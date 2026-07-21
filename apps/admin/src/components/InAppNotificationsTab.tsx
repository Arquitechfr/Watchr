import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Bell, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { PageSelector } from "../components/ui/PageSelector";
import { ImageUpload } from "../components/ui/ImageUpload";
import { ShowPicker } from "../components/ui/ShowPicker";
import { formatDate } from "../lib/utils";
import { logError } from "../lib/logger";

interface InAppNotificationEntry {
  id: string;
  type: string;
  title: string;
  body: string;
  imageUrl: string | null;
  data: Record<string, unknown> | null;
  target: string;
  locale: string | null;
  userId: string | null;
  dismissCount: number;
  createdAt: string;
}

interface InAppListResponse {
  notifications: InAppNotificationEntry[];
  total: number;
  page: number;
  limit: number;
}

type DeepLinkValue = { screen: string; params: Record<string, unknown> } | { url: string } | null;

export function InAppNotificationsTab() {
  const [list, setList] = useState<InAppListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    body: "",
    target: "all" as "all" | "locale" | "user",
    locale: "",
    userId: "",
    imageUrl: "",
    deepLink: null as DeepLinkValue,
    alsoPush: false,
  });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/in-app-notifications", { params: { page, limit: 20 } });
      setList(data);
    } catch (err) {
      logError("Failed to load in-app notifications", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        body: form.body,
        target: form.target,
      };
      if (form.target === "locale" && form.locale) payload.locale = form.locale;
      if (form.target === "user" && form.userId) payload.userId = form.userId;
      if (form.imageUrl) payload.imageUrl = form.imageUrl;
      if (form.deepLink && "screen" in form.deepLink) {
        payload.deepLinkScreen = form.deepLink.screen;
        payload.deepLinkParams = form.deepLink.params;
      } else if (form.deepLink && "url" in form.deepLink) {
        payload.customUrl = form.deepLink.url;
      }
      await api.post("/admin/in-app-notifications", payload);
      setResult("In-app notification created successfully");
      setForm({ title: "", body: "", target: "all", locale: "", userId: "", imageUrl: "", deepLink: null, alsoPush: false });
      loadList();
      if (form.alsoPush) {
        try {
          const pushPayload: Record<string, unknown> = {
            title: form.title,
            body: form.body,
            target: form.target === "user" ? "all" : form.target,
          };
          if (form.target === "locale" && form.locale) pushPayload.locale = form.locale;
          if (form.deepLink && "screen" in form.deepLink) {
            pushPayload.deepLinkScreen = form.deepLink.screen;
            pushPayload.deepLinkParams = form.deepLink.params;
          } else if (form.deepLink && "url" in form.deepLink) {
            pushPayload.customUrl = form.deepLink.url;
          }
          if (form.imageUrl) pushPayload.imageUrl = form.imageUrl;
          await api.post("/admin/notifications/broadcast", pushPayload);
          setResult("In-app notification + push notification created successfully");
        } catch (pushErr) {
          logError("Push notification creation failed", pushErr);
        }
      }
    } catch (err) {
      setResult("Failed to create in-app notification");
      logError("Create failed", err);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/admin/in-app-notifications/${id}`);
      setDeleteId(null);
      loadList();
    } catch (err) {
      logError("Delete failed", err);
    }
  }

  const totalPages = list ? Math.ceil(list.total / list.limit) : 0;

  return (
    <div>
      {result && (
        <div className="mb-4 rounded-md border border-border bg-surface px-4 py-3 text-sm">
          {result}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Create In-App Notification</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1.5">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  maxLength={200}
                  placeholder="Notification title"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">Body</label>
                <Input
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                  maxLength={500}
                  placeholder="Notification message"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Target</label>
                <select
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value as "all" | "locale" | "user" })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
                >
                  <option value="all">All users</option>
                  <option value="locale">By locale</option>
                  <option value="user">Specific user</option>
                </select>
              </div>
              {form.target === "locale" && (
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">Locale</label>
                  <Input
                    value={form.locale}
                    onChange={(e) => setForm({ ...form, locale: e.target.value })}
                    placeholder="e.g. en, fr"
                  />
                </div>
              )}
              {form.target === "user" && (
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">User ID</label>
                  <Input
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    placeholder="User ID or email"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-text-muted mb-1.5">Deep Link (optional)</label>
                <PageSelector
                  value={form.deepLink ?? undefined}
                  onChange={(val) =>
                    setForm({ ...form, deepLink: val ?? null })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">Image (optional)</label>
                <ImageUpload
                  value={form.imageUrl || undefined}
                  onChange={(url) => setForm({ ...form, imageUrl: url ?? "" })}
                />
                {form.imageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={form.imageUrl} alt="preview" className="h-10 w-10 rounded object-cover" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, imageUrl: "" })}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={form.alsoPush}
                  onChange={(e) => setForm({ ...form, alsoPush: e.target.checked })}
                  className="rounded border-border"
                />
                Also send push notification
              </label>
              <Button type="submit" disabled={sending}>
                {sending ? <Loader2 className="animate-spin" size={16} /> : <Bell size={16} />}
                <span className="ml-2">Create Notification</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image Picker (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <ShowPicker
              onSelect={(posterUrl) => setForm({ ...form, imageUrl: posterUrl })}
            />
            {form.imageUrl && (
              <div className="mt-4">
                <p className="text-sm text-text-muted mb-2 flex items-center gap-1">
                  <ImageIcon size={14} /> Selected image
                </p>
                <img src={form.imageUrl} alt="selected" className="h-24 w-24 rounded-lg object-cover" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>In-App Notifications History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} width="100%" height={48} />
              ))}
            </div>
          ) : !list || list.notifications.length === 0 ? (
            <EmptyState title="No in-app notifications" description="Create one to get started." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dismisses</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.notifications.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {n.imageUrl && (
                            <img src={n.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-text-muted truncate max-w-[200px]">{n.body}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/20 text-primary">{n.target}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500/20 text-blue-400">{n.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{n.dismissCount}</TableCell>
                      <TableCell className="text-sm text-text-muted">{formatDate(n.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(n.id)}
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-text-muted">
                    Page {page} of {totalPages} ({list.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="rounded-lg border border-border bg-surface p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete notification?</h3>
            <p className="text-sm text-text-muted mb-4">This will remove the notification and all associated dismissals. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
