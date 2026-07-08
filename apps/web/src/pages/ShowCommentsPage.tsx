import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { CommentsList } from "../components/Comments/CommentsList";
import { CommentsSortBar } from "../components/Comments/CommentsSortBar";
import { CommentInput } from "../components/Comments/CommentInput";
import { useShowDetails } from "../hooks/useShowDetails";
import { useCommentsForShow } from "../hooks/useCommentsForShow";
import {
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
  useUnlikeComment,
  useAddReaction,
  useRemoveReaction,
} from "../hooks/useComments";
import { useCommentsRealtime } from "../hooks/useCommentsRealtime";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import type { CommentSort } from "../services/comments.service";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";

export function ShowCommentsPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { showSnackbar } = useUIStore();

  const seasonParam = searchParams.get("season");
  const episodeParam = searchParams.get("episode");
  const season = seasonParam ? Number(seasonParam) : undefined;
  const episode = episodeParam ? Number(episodeParam) : undefined;

  const [sort, setSort] = useState<CommentSort>("recent");

  const tmdbIdNum = Number(tmdbId);
  const { data: show, isLoading: isLoadingShow, isError: isShowError, refetch: refetchShow } = useShowDetails(tmdbIdNum);

  const query = season !== undefined && episode !== undefined ? { season, episode, sort } : { sort };
  const { data: commentsData, isLoading: isLoadingComments, isError: isCommentsError, refetch } = useCommentsForShow(
    show?.id ?? "",
    query,
  );
  const throttledRefresh = useRefreshRateLimit();

  useCommentsRealtime(show?.id ?? "");

  const createComment = useCreateComment(show?.id ?? "", query);
  const updateComment = useUpdateComment(show?.id ?? "", query);
  const deleteComment = useDeleteComment(show?.id ?? "", query);
  const likeComment = useLikeComment(show?.id ?? "", query);
  const unlikeComment = useUnlikeComment(show?.id ?? "", query);
  const addReaction = useAddReaction(show?.id ?? "", query);
  const removeReaction = useRemoveReaction(show?.id ?? "", query);

  const isPending =
    createComment.isPending ||
    updateComment.isPending ||
    deleteComment.isPending ||
    likeComment.isPending ||
    unlikeComment.isPending ||
    addReaction.isPending ||
    removeReaction.isPending;

  useEffect(() => {
    log("ShowComments", "mount", { showId: show?.id, season, episode });
  }, [show?.id, season, episode]);

  const subtitle = season !== undefined && episode !== undefined ? `S${season}E${episode}` : show?.title ?? "";
  const headerTitle = `${t("screens.showDetail.comments")} · ${subtitle}`;

  const handleCreate = (input: { content: string; images?: string[]; isSpoiler?: boolean }) => {
    createComment.mutate(
      { 
        content: input.content, 
        images: input.images, 
        isSpoiler: input.isSpoiler,
        ...(season !== undefined && episode !== undefined ? { episodeRef: { season, episode } } : {})
      },
      { onError: () => showSnackbar(t("screens.comments.addError"), "error") },
    );
  };

  const handleReply = (parentId: string) => {
    createComment.mutate(
      { 
        content: "", 
        parentId,
        ...(season !== undefined && episode !== undefined ? { episodeRef: { season, episode } } : {})
      },
      { onError: () => showSnackbar(t("screens.comments.replyError"), "error") },
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
      onError: () => showSnackbar(t("screens.comments.deleteError"), "error"),
    });
  };

  const handleLike = (id: string) => {
    likeComment.mutate(id, { onError: () => showSnackbar(t("screens.comments.likeError"), "error") });
  };

  const handleUnlike = (id: string) => {
    unlikeComment.mutate(id, {
      onError: () => showSnackbar(t("screens.comments.likeError"), "error"),
    });
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

  if (isLoadingShow) {
    return (
      <PageWrapper>
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-16 w-full" />
      </PageWrapper>
    );
  }

  if (isShowError || !show) {
    return (
      <PageWrapper>
        <NetworkError onRetry={() => throttledRefresh(refetchShow)} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-1 text-text hover:text-text-muted transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-text font-semibold text-lg flex-1 text-center mx-2 truncate">
          {headerTitle}
        </h1>
        <div className="w-8" />
      </div>

      <div className="px-4 pt-4">
        {season !== undefined && episode !== undefined && (
          <p className="text-text-muted mb-4">
            {show.title} — {t("screens.showDetail.season")} {season}, {t("screens.showDetail.episode")} {episode}
          </p>
        )}
        <CommentsSortBar sort={sort} onSortChange={setSort} />
        <div className="mt-4">
          {isLoadingComments ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : isCommentsError ? (
            <NetworkError onRetry={() => throttledRefresh(refetch)} />
          ) : (
            <CommentsList
              comments={commentsData?.comments ?? []}
              showId={show.id}
              title={show.title}
              season={season}
              episode={episode}
              isPending={isPending}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLike={handleLike}
              onUnlike={handleUnlike}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          )}
        </div>
        {isAuthenticated && (
          <div className="py-3 border-t border-border">
            <CommentInput
              placeholder={t("screens.comments.placeholder")}
              onSubmit={handleCreate}
              isPending={isPending}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
