import { useEffect, useState } from "react";
import { Trash2, AlertTriangle, ChevronLeft, ChevronRight, MessageSquare, MessageCircleX, Sparkles } from "lucide-react";
import api from "../lib/api";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Dialog } from "../components/ui/Dialog";
import { formatDate } from "../lib/utils";
import { logError } from "../lib/logger";

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
  const [allCommentsDialog, setAllCommentsDialog] = useState(false);
  const [allCommentsConfirmStep, setAllCommentsConfirmStep] = useState<1 | 2>(1);
  const [allCommentsSubmitting, setAllCommentsSubmitting] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<{ commentId: string; sentiment: string; confidence: number; suggestedAction: string; reason: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (spoilerFilter) params.isSpoiler = spoilerFilter;
      if (hiddenFilter) params.isHidden = hiddenFilter;
      const { data } = await api.get("/admin/comments", { params });
      setData(data);
    } catch (err) {
      logError("Failed to load comments", err);
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
      logError("Failed to delete comment", err);
    }
  }

  async function handleToggleSpoiler(comment: CommentRow) {
    try {
      await api.patch(`/admin/comments/${comment.id}/spoiler`, { isSpoiler: !comment.isSpoiler });
      load();
    } catch (err) {
      logError("Failed to toggle spoiler", err);
    }
  }

  async function handleAiAnalyze(commentId: string) {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await api.post(`/admin/ai/analyze-comment/${commentId}`);
      setAiAnalysis({ commentId, ...res.data });
    } catch (err) {
      logError("Failed to analyze comment", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleDeleteAllComments() {
    setAllCommentsSubmitting(true);
    try {
      await api.delete("/admin/comments/all");
      setAllCommentsDialog(false);
      setAllCommentsConfirmStep(1);
      load();
    } catch (err) {
      logError("Failed to delete all comments", err);
    } finally {
      setAllCommentsSubmitting(false);
    }
  }

  function openAllCommentsDialog() {
    setAllCommentsConfirmStep(1);
    setAllCommentsDialog(true);
  }

  function closeAllCommentsDialog() {
    setAllCommentsDialog(false);
    setAllCommentsConfirmStep(1);
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Comments Moderation</h1>
        {data && data.total > 0 && (
          <Button
            onClick={openAllCommentsDialog}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <MessageCircleX size={16} className="mr-2" />
            Delete all comments
          </Button>
        )}
      </div>

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
                            onClick={() => handleAiAnalyze(comment.id)}
                            title="AI analyze"
                            disabled={aiLoading}
                          >
                            <Sparkles size={16} className="text-primary" />
                          </Button>
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

      {aiAnalysis && (
        <Card className="mt-4 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-primary" />
              <h3 className="font-semibold text-text">AI Comment Analysis</h3>
              <Badge className="bg-primary/20 text-primary capitalize">{aiAnalysis.sentiment}</Badge>
              <Badge className="bg-surface-light text-text-muted capitalize">{aiAnalysis.suggestedAction}</Badge>
            </div>
            <p className="text-sm text-text-muted">{aiAnalysis.reason}</p>
            <p className="text-xs text-text-muted mt-2">Confidence: {(aiAnalysis.confidence * 100).toFixed(0)}%</p>
          </CardContent>
        </Card>
      )}

      {aiLoading && (
        <Card className="mt-4 border-primary/30">
          <CardContent className="p-4 flex items-center gap-2">
            <Sparkles size={18} className="text-primary animate-pulse" />
            <p className="text-sm text-text-muted">Analyzing comment with AI…</p>
          </CardContent>
        </Card>
      )}

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

      <Dialog
        open={allCommentsDialog}
        onClose={closeAllCommentsDialog}
        title="Delete ALL comments"
      >
        <div className="space-y-4">
          {allCommentsConfirmStep === 1 ? (
            <>
              <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-sm text-red-400 font-medium">Warning</p>
                <p className="text-sm text-text-muted mt-1">
                  This will permanently delete <span className="font-bold text-text">every comment</span> on the platform — {data?.total ?? 0} comments in total — along with all likes, reactions, and reports.
                </p>
                <p className="text-sm text-text-muted mt-2">
                  This affects all users and all shows. User accounts will not be deleted.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeAllCommentsDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setAllCommentsConfirmStep(2)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-sm text-red-400 font-bold">Final confirmation</p>
                <p className="text-sm text-text-muted mt-1">
                  Are you absolutely sure? This action cannot be undone. All {data?.total ?? 0} comments will be permanently removed from the platform.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAllCommentsConfirmStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleDeleteAllComments}
                  disabled={allCommentsSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {allCommentsSubmitting ? "Deleting all comments..." : "Yes, delete everything"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
