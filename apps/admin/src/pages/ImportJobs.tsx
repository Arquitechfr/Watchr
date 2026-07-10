import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDate } from "../lib/utils";

interface ImportRow {
  id: string;
  username: string;
  email: string;
  source: string;
  status: string;
  progress: number;
  createdAt: string;
  completedAt: string | null;
}

interface ImportsResponse {
  jobs: ImportRow[];
  total: number;
  page: number;
  limit: number;
}

interface ImportStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  bySource: { source: string; count: number }[];
}

export function ImportJobs() {
  const [data, setData] = useState<ImportsResponse | null>(null);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      const [jobsRes, statsRes] = await Promise.all([
        api.get("/admin/imports", { params }),
        api.get("/admin/imports/stats"),
      ]);
      setData(jobsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load imports:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, page]);

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const statusColors: Record<string, string> = {
    completed: "bg-success/20 text-success",
    failed: "bg-danger/20 text-danger",
    pending: "bg-primary/20 text-primary",
    processing: "bg-primary/20 text-primary",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Import Jobs</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-xs text-text-muted">Total</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-muted">Completed</p>
            <p className="text-xl font-bold text-success">{stats.completed}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-muted">Failed</p>
            <p className="text-xl font-bold text-danger">{stats.failed}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-muted">Pending</p>
            <p className="text-xl font-bold text-primary">{stats.pending}</p>
          </Card>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton height={20} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <p className="font-medium">{job.username}</p>
                        <p className="text-xs text-text-muted">{job.email}</p>
                      </TableCell>
                      <TableCell className="text-text-muted">{job.source}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[job.status] ?? "bg-surface-light text-text-muted"}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.progress}%</TableCell>
                      <TableCell className="text-text-muted text-xs">{formatDate(job.createdAt)}</TableCell>
                      <TableCell className="text-text-muted text-xs">{formatDate(job.completedAt)}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-text-muted">{data.total} jobs total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="flex items-center px-3 text-sm text-text-muted">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
