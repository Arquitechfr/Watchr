import { useEffect, useState } from "react";
import { Trash2, Edit, Search, Plus, Copy, Check, X } from "lucide-react";
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

interface ConfigEntry {
  key: string;
  value: string;
  type: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

const TYPE_COLORS: Record<string, string> = {
  string: "bg-blue-500/20 text-blue-400",
  number: "bg-green-500/20 text-green-400",
  boolean: "bg-orange-500/20 text-orange-400",
  json: "bg-purple-500/20 text-purple-400",
};

export function RemoteConfig() {
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [editing, setEditing] = useState<ConfigEntry | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editType, setEditType] = useState("string");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addData, setAddData] = useState({ key: "", value: "", type: "string", description: "" });
  const [addError, setAddError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConfigEntry | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
    setEditError("");
  }

  function validateValue(value: string, type: string): string | null {
    if (type === "number" && isNaN(Number(value))) return "Value must be a valid number";
    if (type === "boolean" && value !== "true" && value !== "false") return "Value must be 'true' or 'false'";
    if (type === "json") {
      try {
        JSON.parse(value);
      } catch {
        return "Value must be valid JSON";
      }
    }
    return null;
  }

  async function handleSave() {
    if (!editing) return;
    const error = validateValue(editValue, editType);
    if (error) {
      setEditError(error);
      return;
    }
    setEditError("");
    try {
      await api.put(`/admin/config/${editing.key}`, { value: editValue, type: editType, description: editDescription });
      setEditing(null);
      load();
    } catch (err) {
      console.error("Failed to update config:", err);
      setEditError("Failed to save. Check console for details.");
    }
  }

  async function handleAdd() {
    if (!addData.key.trim()) {
      setAddError("Key is required");
      return;
    }
    const error = validateValue(addData.value, addData.type);
    if (error) {
      setAddError(error);
      return;
    }
    setAddError("");
    setAddSubmitting(true);
    try {
      await api.put(`/admin/config/${addData.key}`, {
        value: addData.value,
        type: addData.type,
        description: addData.description,
      });
      setShowAddForm(false);
      setAddData({ key: "", value: "", type: "string", description: "" });
      load();
    } catch (err) {
      console.error("Failed to create config:", err);
      setAddError("Failed to create. Key may already exist.");
    } finally {
      setAddSubmitting(false);
    }
  }

  async function toggleBoolean(entry: ConfigEntry) {
    const newValue = entry.value === "true" ? "false" : "true";
    setTogglingKey(entry.key);
    try {
      await api.put(`/admin/config/${entry.key}`, {
        value: newValue,
        type: entry.type,
        description: entry.description,
      });
      setConfig((prev) =>
        prev.map((c) => (c.key === entry.key ? { ...c, value: newValue } : c)),
      );
    } catch (err) {
      console.error("Failed to toggle config:", err);
    } finally {
      setTogglingKey(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/admin/config/${deleteTarget.key}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      console.error("Failed to delete config:", err);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  function copyToClipboard(entry: ConfigEntry) {
    navigator.clipboard.writeText(entry.value);
    setCopiedKey(entry.key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const filtered = config.filter((entry) => {
    if (search) {
      const q = search.toLowerCase();
      if (!entry.key.toLowerCase().includes(q) && !(entry.description ?? "").toLowerCase().includes(q)) return false;
    }
    if (typeFilter && entry.type !== typeFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Remote Config</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} className="mr-2" /> Add Key
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by key or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All types</option>
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="json">json</option>
        </select>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Config Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Key</label>
                <Input
                  value={addData.key}
                  onChange={(e) => setAddData({ ...addData, key: e.target.value })}
                  placeholder="e.g. feature_new_flag"
                  className="font-mono"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-text-muted">Type</label>
                <select
                  value={addData.type}
                  onChange={(e) => setAddData({ ...addData, type: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="json">json</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Value</label>
              {addData.type === "boolean" ? (
                <div className="flex h-10 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddData({ ...addData, value: addData.value === "true" ? "false" : "true" })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      addData.value === "true" ? "bg-primary" : "bg-surface-light"
                    }`}
                    aria-label="Toggle boolean value"
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        addData.value === "true" ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-text">{addData.value === "true" ? "true" : "false"}</span>
                </div>
              ) : addData.type === "json" ? (
                <textarea
                  value={addData.value}
                  onChange={(e) => setAddData({ ...addData, value: e.target.value })}
                  placeholder='{"key": "value"}'
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text font-mono"
                />
              ) : addData.type === "number" ? (
                <Input
                  type="number"
                  value={addData.value}
                  onChange={(e) => setAddData({ ...addData, value: e.target.value })}
                  placeholder="0"
                />
              ) : (
                <Input
                  value={addData.value}
                  onChange={(e) => setAddData({ ...addData, value: e.target.value })}
                  placeholder="Enter value"
                />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Description</label>
              <Input
                value={addData.description}
                onChange={(e) => setAddData({ ...addData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            {addError && <p className="text-sm text-danger">{addError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={addSubmitting}>
                {addSubmitting ? "Creating..." : "Create"}
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
              <span>Edit: <span className="font-mono">{editing.key}</span></span>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
                <X size={18} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Value</label>
              {editType === "boolean" ? (
                <div className="flex h-10 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditValue(editValue === "true" ? "false" : "true")}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      editValue === "true" ? "bg-primary" : "bg-surface-light"
                    }`}
                    aria-label="Toggle boolean value"
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        editValue === "true" ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-text">{editValue === "true" ? "true" : "false"}</span>
                </div>
              ) : editType === "json" ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text font-mono"
                />
              ) : editType === "number" ? (
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
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
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Description</label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Optional description" />
            </div>
            {editError && <p className="text-sm text-danger">{editError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config Table */}
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
                : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          icon={Search}
                          title={search || typeFilter ? "No matching config entries" : "No config entries found"}
                          description={search || typeFilter ? "Try adjusting your search or filters." : "No remote config keys have been set. Click 'Add Key' to create one."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : filtered.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="font-mono text-xs font-medium">{entry.key}</TableCell>
                      <TableCell className="text-xs text-text-muted max-w-xs truncate hidden md:table-cell">
                        {entry.type === "boolean" ? (
                          <button
                            onClick={() => toggleBoolean(entry)}
                            disabled={togglingKey === entry.key}
                            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                              entry.value === "true" ? "bg-primary" : "bg-surface-light"
                            }`}
                            aria-label={`Toggle ${entry.key}`}
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                                entry.value === "true" ? "translate-x-5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono truncate">{entry.value}</span>
                            <button
                              onClick={() => copyToClipboard(entry)}
                              className="text-text-muted hover:text-text shrink-0"
                              title="Copy value"
                            >
                              {copiedKey === entry.key ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={TYPE_COLORS[entry.type] ?? "bg-surface-light text-text-muted"}>
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-text-muted text-xs max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell className="text-text-muted text-xs hidden lg:table-cell">{formatDate(entry.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(entry)} title="Edit">
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(entry)} title="Delete">
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete config key "${deleteTarget?.key ?? ""}"`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete this config key? This action cannot be undone.
            {deleteTarget?.description && (
              <span className="block mt-2 text-text-muted">Description: {deleteTarget.description}</span>
            )}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
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
