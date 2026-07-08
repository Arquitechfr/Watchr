import { View } from "react-native";
import { useAuthStore } from "../../store/authStore";
import {
  useCommentsForShow,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
  useUnlikeComment,
  useAddReaction,
  useRemoveReaction,
} from "../../hooks/useComments";
import { ListCommentsQuery } from "../../services/comments.service";
import { useUIStore } from "../../store/uiStore";
import { log } from "../../utils/logger";
import { CommentsList } from "./CommentsList";
import { CommentInput } from "./CommentInput";
import { useI18n } from "../../i18n/useI18n";

interface CommentsSectionProps {
  showId: string;
  query?: ListCommentsQuery;
}

export function CommentsSection({ showId, query }: CommentsSectionProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const { data, isLoading } = useCommentsForShow(showId, query);
  const createComment = useCreateComment(showId, query);
  const updateComment = useUpdateComment(showId, query);
  const deleteComment = useDeleteComment(showId, query);
  const likeComment = useLikeComment(showId, query);
  const unlikeComment = useUnlikeComment(showId, query);
  const addReaction = useAddReaction(showId, query);
  const removeReaction = useRemoveReaction(showId, query);

  const isPending =
    createComment.isPending ||
    updateComment.isPending ||
    deleteComment.isPending ||
    likeComment.isPending ||
    unlikeComment.isPending ||
    addReaction.isPending ||
    removeReaction.isPending;

  const handleCreate = (content: string, images?: string[], isSpoiler?: boolean) => {
    createComment.mutate(
      { 
        content, 
        images, 
        isSpoiler,
        ...(query?.season !== undefined && query?.episode !== undefined ? { episodeRef: { season: query.season, episode: query.episode } } : {})
      },
      {
        onError: () => showSnackbar(t("screens.comments.addError"), "error"),
      },
    );
  };

  const handleReply = (content: string, parentId: string) => {
    createComment.mutate(
      { 
        content, 
        parentId,
        ...(query?.season !== undefined && query?.episode !== undefined ? { episodeRef: { season: query.season, episode: query.episode } } : {})
      },
      {
        onError: () => showSnackbar(t("screens.comments.replyError"), "error"),
      },
    );
  };

  const handleEdit = (id: string, content: string, images?: string[], isSpoiler?: boolean) => {
    updateComment.mutate(
      { id, content, images, isSpoiler },
      {
        onError: () => showSnackbar(t("screens.comments.editError"), "error"),
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteComment.mutate(id, {
      onError: () => showSnackbar(t("screens.comments.deleteError"), "error"),
    });
  };

  const handleLike = (id: string) => {
    likeComment.mutate(id, {
      onError: () => showSnackbar(t("screens.comments.likeError"), "error"),
    });
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

  log("CommentsSection", "render", { showId, total: data?.total ?? 0 });

  return (
    <View className="flex-1">
      {isAuthenticated && (
        <View className="mb-4">
          <CommentInput
            placeholder={t("screens.comments.placeholder")}
            onSubmit={handleCreate}
            isPending={isPending}
          />
        </View>
      )}
      <CommentsList
        comments={data?.comments ?? []}
        showId={showId}
        isLoading={isLoading}
        isPending={isPending}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLike={handleLike}
        onUnlike={handleUnlike}
        onAddReaction={handleAddReaction}
        onRemoveReaction={handleRemoveReaction}
      />
    </View>
  );
}
