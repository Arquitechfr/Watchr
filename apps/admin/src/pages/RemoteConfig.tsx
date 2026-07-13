import { useEffect, useState } from "react";
import { Trash2, Edit } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Checkbox } from "../components/ui/Checkbox";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../lib/utils";

interface ConfigEntry {
  key: string;
  value: string;
  type: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

export function RemoteConfig() {
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ConfigEntry | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editType, setEditType] = useState("string");
  const [editDescription, setEditDescription] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/config");
      setConfig(data);
    } catch (err) {
      console.error("Failed to load config:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(entry: ConfigEntry) {
    setEditing(entry);
    setEditValue(entry.value);
    setEditType(entry.type);
    setEditDescription(entry.description ?? "");
  }

  async function handleSave() {
    if (!editing) return;
    try {
      await api.put(`/admin/config/${editing.key}`, { value: editValue, type: editType, description: editDescription });
      setEditing(null);
      load();
    } catch (err) {
      console.error("Failed to update config:", err);
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Delete config key "${key}"?`)) return;
    try {
      await api.delete(`/admin/config/${key}`);
      load();
    } catch (err) {
      console.error("Failed to delete config:", err);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Remote Config</h1>

      {editing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Edit: {editing.key}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Value</label>
              {editType === "boolean" ? (
                <div className="flex h-10 items-center">
                  <Checkbox
                    checked={editValue === "true"}
                    onChange={(e) => setEditValue(e.target.checked ? "true" : "false")}
                  />
                  <span className="ml-2 text-sm text-text">{editValue === "true" ? "true" : "false"}</span>
                </div>
              ) : (
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
              </select>
              {editType === "boolean" && editValue !== "true" && editValue !== "false" && (
                <p className="mt-1 text-xs text-text-muted">Value will be set to "false"</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Description</label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead className="hidden md:table-cell">Value</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden xl:table-cell">Description</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
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
                : config.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          title="No config entries found"
                          description="No remote config keys have been set. Use the CLI to seed default values."
                        />
                      </TableCell>
                    </TableRow>
                  )
                : config.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="font-mono text-xs font-medium">{entry.key}</TableCell>
                      <TableCell className="font-mono text-xs text-text-muted max-w-xs truncate hidden md:table-cell">{entry.value}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className="bg-surface-light text-text-muted">{entry.type}</Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-text-muted text-xs max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">{formatDate(entry.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(entry)} title="Edit">
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.key)} title="Delete">
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
