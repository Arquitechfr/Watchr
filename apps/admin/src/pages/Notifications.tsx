import { useEffect, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import api from "../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDate } from "../lib/utils";

interface HistoryEntry {
  id: string;
  type: string;
  title: string;
  body: string;
  targetCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface HistoryResponse {
  logs: HistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

export function Notifications() {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    body: "",
    target: "all" as "all" | "locale",
    locale: "",
  });
  const [targetedForm, setTargetedForm] = useState({
    userId: "",
    title: "",
    body: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>("");

  async function loadHistory() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/notifications/history", { params: { page: 1, limit: 10 } });
      setHistory(data);
    } catch (err) {
      console.error("Failed to load notification history:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleBroadcast(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    try {
      const payload: Record<string, unknown> = {
        title: broadcastForm.title,
        body: broadcastForm.body,
        target: broadcastForm.target,
      };
      if (broadcastForm.target === "locale" && broadcastForm.locale) {
        payload.locale = broadcastForm.locale;
      }
      const { data } = await api.post("/admin/notifications/broadcast", payload);
      setResult(`Sent: ${data.successCount} success, ${data.failureCount} failed out of ${data.targetCount}`);
      setBroadcastForm({ title: "", body: "", target: "all", locale: "" });
      loadHistory();
    } catch (err) {
      setResult("Broadcast failed");
      console.error("Broadcast failed:", err);
    } finally {
      setSending(false);
    }
  }

  async function handleTargeted(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    try {
      await api.post("/admin/notifications/targeted", targetedForm);
      setResult("Notification sent successfully");
      setTargetedForm({ userId: "", title: "", body: "" });
      loadHistory();
    } catch (err) {
      setResult("Targeted notification failed");
      console.error("Targeted send failed:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {result && (
        <div className="mb-4 rounded-md border border-border bg-surface px-4 py-3 text-sm">
          {result}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Broadcast Push</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Title</label>
                <Input value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })} required maxLength={200} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Body</label>
                <Input value={broadcastForm.body} onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })} required maxLength={500} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Target</label>
                <select
                  value={broadcastForm.target}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, target: e.target.value as "all" | "locale" })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
                >
                  <option value="all">All users</option>
                  <option value="locale">By locale</option>
                </select>
              </div>
              {broadcastForm.target === "locale" && (
                <div>
                  <label className="mb-1.5 block text-sm text-text-muted">Locale</label>
                  <Input value={broadcastForm.locale} onChange={(e) => setBroadcastForm({ ...broadcastForm, locale: e.target.value })} placeholder="en, fr, es..." />
                </div>
              )}
              <Button type="submit" disabled={sending}>
                <Send size={16} className="mr-2" /> Send Broadcast
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targeted Push</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTargeted} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">User ID</label>
                <Input value={targetedForm.userId} onChange={(e) => setTargetedForm({ ...targetedForm, userId: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Title</label>
                <Input value={targetedForm.title} onChange={(e) => setTargetedForm({ ...targetedForm, title: e.target.value })} required maxLength={200} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Body</label>
                <Input value={targetedForm.body} onChange={(e) => setTargetedForm({ ...targetedForm, body: e.target.value })} required maxLength={500} />
              </div>
              <Button type="submit" disabled={sending}>
                <Send size={16} className="mr-2" /> Send to User
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : history?.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className="bg-primary/20 text-primary">{log.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.title}</TableCell>
                      <TableCell className="text-text-muted">{log.targetCount}</TableCell>
                      <TableCell className="text-success">{log.successCount}</TableCell>
                      <TableCell className="text-danger">{log.failureCount}</TableCell>
                      <TableCell className="text-text-muted text-xs">{formatDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
