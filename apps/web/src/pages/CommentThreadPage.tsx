import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MessageSquare, RefreshCw } from "lucide-react";
import { useState } from "react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { CommentItem } from "../components/Comments/CommentItem";
import { CommentInput } from "../components/Comments/CommentInput";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useComment, useReplies, useLikeComment, useUnlikeComment, useDeleteComment, useUpdateComment, useCreateComment, useAddReaction, useRemoveReaction } from "../hooks/useComments";
import type { Comment } from "../services/comments.service";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";

export function CommentThreadPage() {
  const { commentId } = useParams<{ commentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { showId: string; title: string; season?: number; episode?: number } | undefined;
  const { t } = useI18n();
  const userId = useAuthStore((s) => s.userId);
  const { showSnackbar } = useUIStore();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: parentComment, isLoading: isLoadingParent, isError: isErrorParent, refetch: refetchParent } = useComment(commentId!);
  const { data: repliesData, isLoading: isLoadingReplies, refetch: refetchReplies } = useReplies(commentId!, page, limit);

  const showId = state?.showId ?? "";
  const title = state?.title ?? "";
  const season = state?.season;
  const episode = state?.episode;
  
  const query = season !== undefined && episode !== undefined ? { season, episode } : undefined;

  const likeComment = useLikeComment(showId, query);
  const unlikeComment = useUnlikeComment(showId, query);
  const deleteComment = useDeleteComment(showId, query);
  const updateComment = useUpdateComment(showId, query);
  const createReply = useCreateComment(showId, query);
  const addReaction = useAddReaction(showId, query);
  const removeReaction = useRemoveReaction(showId, query);

  const isPending =
    createReply.isPending ||
    updateComment.isPending ||
    deleteComment.isPending ||
    likeComment.isPending ||
    unlikeComment.isPending ||
    addReaction.isPending ||
    removeReaction.isPending;

  const replies = repliesData?.replies ?? [];
  const totalReplies = repliesData?.total ?? 0;
  const hasMore = page * limit < totalReplies;

  const handleReply = (input: { content: string; images?: string[]; isSpoiler?: boolean }) => {
    createReply.mutate(
      { 
        ...input, 
        parentId: commentId,
        ...(season !== undefined && episode !== undefined ? { episodeRef: { season, episode } } : {})
      },
      {
        onSuccess: () => {
          refetchReplies();
        },
        onError: () => showSnackbar(t("screens.comments.replyError"), "error"),
      },
    );
  };

  const handleEdit = (id: string, content: string, images?: string[], isSpoiler?: boolean) => {
    updateComment.mutate(
      { id, content, images, isSpoiler },
      { onError: () => showSnackbar(t("screens.comments.editError"), "error") },
    );
  };

  const handleDelete = (id: string) => {
    deleteComment.mutate(id, {
      onSuccess: () => {
        refetchReplies();
      },
      onError: () => showSnackbar(t("screens.comments.deleteError"), "error"),
    });
  };

  const handleLike = (id: string) => {
    likeComment.mutate(id, { onError: () => showSnackbar(t("screens.comments.likeError"), "error") });
  };

  const handleUnlike = (id: string) => {
    unlikeComment.mutate(id, { onError: () => showSnackbar(t("screens.comments.likeError"), "error") });
  };

  const handleAddReaction = (id: string, emoji: string) => {
    addReaction.mutate(
      { id, emoji },
      { onError: () => showSnackbar(t("screens.comments.likeError"), "error") },
    );
  };

  const handleRemoveReaction = (id: string, emoji: string) => {
    removeReaction.mutate(
      { id, emoji },
      { onError: () => showSnackbar(t("screens.comments.likeError"), "error") },
    );
  };

  const handleRefresh = () => {
    refetchParent();
    refetchReplies();
  };

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
        <NetworkError onRetry={handleRefresh} />
      </PageWrapper>
    );
  }

  const headerTitle = `${t("screens.comments.title")} · ${title || "Show"}`;

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-text">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-text font-bold text-xl flex-1 truncate">{headerTitle}</h1>
        <button
          onClick={handleRefresh}
          className="text-text-muted hover:text-text"
          disabled={isLoadingParent || isLoadingReplies}
        >
          <RefreshCw size={20} className={isLoadingReplies ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Parent comment */}
      <div className="mb-6">
        <CommentItem
          comment={parentComment}
          showId={showId}
          title={title}
          season={season}
          episode={episode}
          isPending={isPending}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onLike={handleLike}
          onUnlike={handleUnlike}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
          isOwnComment={parentComment.userId === userId}
          variant="parent"
        />
        <hr className="mt-6 border-border" />
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
          {replies.length === 0 && (
            <div className="py-8 text-center">
              <MessageSquare size={40} className="mx-auto text-text-muted mb-2" />
              <p className="text-text-muted text-sm">{t("screens.comments.noReplies")}</p>
            </div>
          )}
          {replies.map((reply: Comment) => (
            <div key={reply.id} className="flex">
              <div className="border-l-2 border-border ml-4 pl-4 flex-1 mb-2 mt-1">
                <CommentItem
                  comment={reply}
                  showId={showId}
                  title={title}
                  season={season}
                  episode={episode}
                  isPending={isPending}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  onUnlike={handleUnlike}
                  onAddReaction={handleAddReaction}
                  onRemoveReaction={handleRemoveReaction}
                  isOwnComment={reply.userId === userId}
                  variant="reply"
                />
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-3 text-primary font-semibold text-center hover:bg-surface-light rounded-lg transition-colors"
            >
              {t("common.seeAll")}
            </button>
          )}
        </div>
      )}

      {/* Reply input */}
      {userId && (
        <div className="mt-4 pt-4 border-t border-border">
          <CommentInput
            placeholder={t("common.reply")}
            onSubmit={handleReply}
            isPending={isPending}
          />
        </div>
      )}
    </PageWrapper>
  );
}
