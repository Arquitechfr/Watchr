import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";

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

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/news-sources");
      setSources(data);
    } catch (err) {
      console.error("Failed to load news sources:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">News Sources</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} className="mr-2" /> Add Source
        </Button>
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
                <Input value={formData.locale} onChange={(e) => setFormData({ ...formData, locale: e.target.value })} required />
              </div>
              <div className="md:col-span-4 flex gap-2">
                <Button type="submit">Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
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
                : sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-mono text-xs">{source.id}</TableCell>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell className="text-text-muted text-xs truncate max-w-xs">{source.url}</TableCell>
                      <TableCell>{source.locale}</TableCell>
                      <TableCell>
                        <Badge className={source.isActive ? "bg-success/20 text-success" : "bg-surface-light text-text-muted"}>
                          {source.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleToggle(source.id)} title="Toggle active">
                            <Power size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(source.id)} title="Delete">
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
    </div>
  );
}
