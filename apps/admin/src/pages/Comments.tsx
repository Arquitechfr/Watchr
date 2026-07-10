import { useEffect, useState } from "react";
import { Trash2, AlertTriangle, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../lib/utils";

interface CommentRow {
  id: string;
  userId: string;
  authorUsername: string;
  showId: string;
  content: string;
  isSpoiler: boolean;
  isHidden: boolean;
  reportCount: number;
  spoilerReportCount: number;
  likesCount: number;
  replyCount: number;
  createdAt: string;
}

interface CommentsResponse {
  comments: CommentRow[];
  total: number;
  page: number;
  limit: number;
}

export function Comments() {
  const [data, setData] = useState<CommentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [spoilerFilter, setSpoilerFilter] = useState("");
  const [hiddenFilter, setHiddenFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (spoilerFilter) params.isSpoiler = spoilerFilter;
      if (hiddenFilter) params.isHidden = hiddenFilter;
      const { data } = await api.get("/admin/comments", { params });
      setData(data);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [spoilerFilter, hiddenFilter, page]);

  async function handleDelete(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      await api.delete(`/admin/comments/${commentId}`);
      load();
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  }

  async function handleToggleSpoiler(comment: CommentRow) {
    try {
      await api.patch(`/admin/comments/${comment.id}/spoiler`, { isSpoiler: !comment.isSpoiler });
      load();
    } catch (err) {
      console.error("Failed to toggle spoiler:", err);
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Comments Moderation</h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <select
          value={spoilerFilter}
          onChange={(e) => {
            setSpoilerFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All comments</option>
          <option value="true">Spoilers only</option>
          <option value="false">Non-spoilers</option>
        </select>
        <select
          value={hiddenFilter}
          onChange={(e) => {
            setHiddenFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-border bg-background px-3 text-sm text-text w-full sm:w-auto"
        >
          <option value="">All visibility</option>
          <option value="true">Hidden only</option>
          <option value="false">Visible only</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="hidden md:table-cell">Spoiler</TableHead>
                <TableHead className="hidden md:table-cell">Hidden</TableHead>
                <TableHead className="hidden md:table-cell">Reports</TableHead>
                <TableHead className="hidden lg:table-cell">Likes</TableHead>
                <TableHead className="hidden lg:table-cell">Replies</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data && data.comments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0">
                        <EmptyState
                          icon={MessageSquare}
                          title="No comments found"
                          description={spoilerFilter || hiddenFilter ? "Try adjusting your filters." : "No comments have been posted yet."}
                        />
                      </TableCell>
                    </TableRow>
                  )
                : data?.comments.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell className="max-w-xs truncate">{comment.content}</TableCell>
                      <TableCell className="text-text-muted">{comment.authorUsername}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {comment.isSpoiler && (
                          <Badge className="bg-danger/20 text-danger">Spoiler</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {comment.isHidden && (
                          <Badge className="bg-warning/20 text-warning">Hidden</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {comment.reportCount > 0 && (
                          <span className="text-warning font-semibold">{comment.reportCount}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{comment.likesCount}</TableCell>
                      <TableCell className="hidden lg:table-cell">{comment.replyCount}</TableCell>
                      <TableCell className="text-text-muted text-xs hidden md:table-cell">{formatDate(comment.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleSpoiler(comment)}
                            title="Toggle spoiler"
                          >
                            <AlertTriangle size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(comment.id)}
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
          <p className="text-sm text-text-muted">{data.total} comments total</p>
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
    </div>
  );
}
