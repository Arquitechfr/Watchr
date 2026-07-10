import { useEffect, useState } from "react";
import { Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, Tv } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../lib/utils";

interface ShowRow {
  id: string;
  tmdbId: number;
  type: string;
  title: string;
  posterPath?: string;
  createdAt: string;
  updatedAt: string;
}

interface ShowsResponse {
  shows: ShowRow[];
  total: number;
  page: number;
  limit: number;
}

export function Shows() {
  const [data, setData] = useState<ShowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get("/admin/shows", { params });
      setData(data);
    } catch (err) {
      console.error("Failed to load shows:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search, typeFilter, page]);

  async function handleSync(tmdbId: number) {
    try {
      await api.post(`/admin/shows/${tmdbId}/sync`, { type: typeFilter || "tv" });
      load();
    } catch (err) {
      console.error("Failed to sync show:", err);
    }
  }

  async function handleDelete(showId: string) {
    if (!confirm("Delete this show from cache?")) return;
    try {
      await api.delete(`/admin/shows/${showId}`);
      load();
    } catch (err) {
      console.error("Failed to delete show:", err);
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Shows</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search shows..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All types</option>
          <option value="tv">TV</option>
          <option value="movie">Movie</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">TMDB ID</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Last Synced</TableHead>
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
                : data && data.shows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          icon={Tv}
                          title="No shows found"
                          description={search || typeFilter ? "Try adjusting your search or filters." : "No shows are cached in the database yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : data?.shows.map((show) => (
                    <TableRow key={show.id}>
                      <TableCell className="font-medium">{show.title}</TableCell>
                      <TableCell className="text-text-muted hidden md:table-cell">{show.tmdbId}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className="bg-primary/20 text-primary">{show.type}</Badge>
                      </TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">{formatDate(show.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleSync(show.tmdbId)} title="Force sync">
                            <RefreshCw size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(show.id)} title="Delete cache">
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
          <p className="text-sm text-text-muted">{data.total} shows total</p>
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
