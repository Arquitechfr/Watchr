import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, Power, Search, Edit } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { LanguageSelect } from "../components/ui/LanguageSelect";
import { LANGUAGE_FLAGS } from "../lib/languages";

interface NewsSource {
  id: string;
  name: string;
  url: string;
  locale: string;
  isActive: boolean;
}

export function NewsSources() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: "", name: "", url: "", locale: "en" });
  const [search, setSearch] = useState("");
  const [localeFilter, setLocaleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editDialog, setEditDialog] = useState<NewsSource | null>(null);
  const [editData, setEditData] = useState({ name: "", url: "", locale: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (localeFilter) params.locale = localeFilter;
      if (statusFilter) params.isActive = statusFilter;
      const { data } = await api.get("/admin/news-sources", { params });
      setSources(data);
    } catch (err) {
      console.error("Failed to load news sources:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search, localeFilter, statusFilter]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post("/admin/news-sources", formData);
      setShowForm(false);
      setFormData({ id: "", name: "", url: "", locale: "en" });
      load();
    } catch (err) {
      console.error("Failed to create news source:", err);
    }
  }

  async function handleDelete(sourceId: string) {
    if (!confirm("Delete this news source?")) return;
    try {
      await api.delete(`/admin/news-sources/${sourceId}`);
      load();
    } catch (err) {
      console.error("Failed to delete news source:", err);
    }
  }

  async function handleToggle(sourceId: string) {
    try {
      await api.patch(`/admin/news-sources/${sourceId}/toggle`);
      load();
    } catch (err) {
      console.error("Failed to toggle news source:", err);
    }
  }

  function openEdit(source: NewsSource) {
    setEditDialog(source);
    setEditData({ name: source.name, url: source.url, locale: source.locale });
  }

  async function handleEditSubmit() {
    if (!editDialog) return;
    setEditSubmitting(true);
    try {
      await api.patch(`/admin/news-sources/${editDialog.id}`, editData);
      setEditDialog(null);
      load();
    } catch (err) {
      console.error("Failed to update news source:", err);
    } finally {
      setEditSubmitting(false);
    }
  }

  const locales = [...new Set(sources.map((s) => s.locale))].sort();
  const isGrouped = localeFilter === "" && search === "" && statusFilter === "";
  const grouped = isGrouped
    ? locales.map((loc) => ({
        locale: loc,
        items: sources.filter((s) => s.locale === loc),
      }))
    : [{ locale: "", items: sources }];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">News Sources</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-2" /> Add Source
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={localeFilter}
          onChange={(e) => setLocaleFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All locales</option>
          {locales.map((loc) => (
            <option key={loc} value={loc}>
              {LANGUAGE_FLAGS[loc] ?? ""} {loc}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create News Source</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">ID</label>
                <Input value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Name</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">URL</label>
                <Input type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Locale</label>
                <LanguageSelect
                  value={formData.locale}
                  onChange={(val) => setFormData({ ...formData, locale: val })}
                  placeholder="Select language..."
                  required
                />
              </div>
              <div className="md:col-span-4 flex gap-2">
                <Button type="submit">Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isGrouped ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <Card key={group.locale}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {group.locale && (
                    <span className="text-lg">{LANGUAGE_FLAGS[group.locale] ?? ""}</span>
                  )}
                  <span>{group.locale || "Other"}</span>
                  <Badge className="bg-surface-light text-text-muted">{group.items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SourceTable
                  sources={group.items}
                  loading={loading}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={openEdit}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <SourceTable
              sources={sources}
              loading={loading}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={openEdit}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editDialog}
        onClose={() => setEditDialog(null)}
        title={`Edit ${editDialog?.name ?? ""}`}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Name</label>
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">URL</label>
            <Input
              type="url"
              value={editData.url}
              onChange={(e) => setEditData({ ...editData, url: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Locale</label>
            <LanguageSelect
              value={editData.locale}
              onChange={(val) => setEditData({ ...editData, locale: val })}
              placeholder="Select language..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SourceTable({
  sources,
  loading,
  onToggle,
  onDelete,
  onEdit,
}: {
  sources: NewsSource[];
  loading: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (source: NewsSource) => void;
}) {
  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden md:table-cell">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">URL</TableHead>
            <TableHead className="hidden md:table-cell">Locale</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
                <TableCell key={j}><Skeleton height={20} /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (sources.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title="No news sources found"
        description="No news sources match your filters. Click 'Add Source' to create one."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden md:table-cell">ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">URL</TableHead>
          <TableHead className="hidden md:table-cell">Locale</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((source) => (
          <TableRow key={source.id}>
            <TableCell className="font-mono text-xs hidden md:table-cell">{source.id}</TableCell>
            <TableCell className="font-medium">{source.name}</TableCell>
            <TableCell className="text-text-muted text-xs truncate max-w-xs hidden md:table-cell">{source.url}</TableCell>
            <TableCell className="hidden md:table-cell">
              <span className="flex items-center gap-1">
                {LANGUAGE_FLAGS[source.locale] ?? ""} {source.locale}
              </span>
            </TableCell>
            <TableCell>
              <Badge className={source.isActive ? "bg-success/20 text-success" : "bg-surface-light text-text-muted"}>
                {source.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(source)} title="Edit">
                  <Edit size={16} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onToggle(source.id)} title="Toggle active">
                  <Power size={16} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(source.id)} title="Delete">
                  <Trash2 size={16} className="text-danger" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
