import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Shield, ShieldOff, Ban } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { formatDate } from "../lib/utils";

interface UserRow {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
  hasCompletedOnboarding: boolean;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
}

export function Users() {
  const navigate = useNavigate();
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get("/admin/users", { params });
      setData(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [search, roleFilter, page]);

  async function handleAction(userId: string, action: "ban" | "unban" | "suspend") {
    try {
      await api.patch(`/admin/users/${userId}/status`, { action });
      load();
    } catch (err) {
      console.error("Failed to update user status:", err);
    }
  }

  async function handleRoleChange(userId: string, role: "user" | "admin") {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      load();
    } catch (err) {
      console.error("Failed to update user role:", err);
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="Search by email or username..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text"
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-text-muted">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.role === "admin"
                              ? "bg-primary/20 text-primary"
                              : "bg-surface-light text-text-muted"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-muted text-xs">
                        {formatDate(user.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-text-muted text-xs">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {user.role === "admin" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRoleChange(user.id, "user")}
                              title="Demote admin"
                            >
                              <ShieldOff size={16} />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRoleChange(user.id, "admin")}
                              title="Promote to admin"
                            >
                              <Shield size={16} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAction(user.id, "ban")}
                            title="Ban user"
                          >
                            <Ban size={16} />
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
          <p className="text-sm text-text-muted">
            {data.total} users total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="flex items-center px-3 text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
