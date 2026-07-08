import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { CommentItem } from "../components/Comments/CommentItem";
import { CommentInput } from "../components/Comments/CommentInput";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useQuery } from "@tanstack/react-query";
import { getCommentById, listRepliesForComment } from "../services/comments.service";
import type { Comment, ListRepliesResult } from "../services/comments.service";
import { useLikeComment, useUnlikeComment, useDeleteComment, useUpdateComment, useCreateComment } from "../hooks/useComments";
import { useAuthStore } from "../store/authStore";
import { useI18n } from "../i18n/useI18n";

export function CommentThreadPage() {
  const { commentId } = useParams<{ commentId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const userId = useAuthStore((s) => s.userId);

  const { data: parentComment, isLoading: isLoadingParent, isError: isErrorParent } = useQuery<Comment>({
    queryKey: ["comments", "thread", commentId],
    queryFn: () => getCommentById(commentId!),
    enabled: !!commentId,
  });

  const { data: repliesData, isLoading: isLoadingReplies } = useQuery<ListRepliesResult>({
    queryKey: ["comments", "replies", commentId],
    queryFn: () => listRepliesForComment(commentId!),
    enabled: !!commentId,
  });

  const likeComment = useLikeComment(parentComment?.showId ?? "");
  const unlikeComment = useUnlikeComment(parentComment?.showId ?? "");
  const deleteComment = useDeleteComment(parentComment?.showId ?? "");
  const updateComment = useUpdateComment(parentComment?.showId ?? "");
  const createReply = useCreateComment(parentComment?.showId ?? "");

  if (isLoadingParent) {
    return (
      <PageWrapper>
        <Skeleton className="h-24 w-full" />
      </PageWrapper>
    );
  }

  if (isErrorParent || !parentComment) {
    return (
      <PageWrapper>
        <NetworkError />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-text font-bold text-xl">{t("comments.thread")}</h1>
      </div>

      {/* Parent comment */}
      <div className="mb-6">
        <CommentItem
          comment={parentComment}
          onLike={(id) => likeComment.mutate(id)}
          onUnlike={(id) => unlikeComment.mutate(id)}
          onDelete={(id) => deleteComment.mutate(id)}
          onEdit={(id, content) => updateComment.mutate({ id, content })}
          isOwnComment={parentComment.userId === userId}
        />
      </div>

      {/* Reply input */}
      <div className="mb-4">
        <CommentInput
          placeholder={t("comments.writeReply")}
          onSubmit={(input) => createReply.mutate({ ...input, parentId: commentId })}
        />
      </div>

      {/* Replies */}
      {isLoadingReplies ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {repliesData?.replies.length === 0 && (
            <p className="text-text-muted text-sm text-center py-4">{t("comments.noReplies")}</p>
          )}
          {repliesData?.replies.map((reply: Comment) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onLike={(id) => likeComment.mutate(id)}
              onUnlike={(id) => unlikeComment.mutate(id)}
              onDelete={(id) => deleteComment.mutate(id)}
              onEdit={(id, content) => updateComment.mutate({ id, content })}
              isOwnComment={reply.userId === userId}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
