import { View } from "react-native";
import { useAuthStore } from "../../store/authStore";
import {
  useCommentsForShow,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useLikeComment,
  useUnlikeComment,
} from "../../hooks/useComments";
import { ListCommentsQuery } from "../../services/comments.service";
import { useUIStore } from "../../store/uiStore";
import { log } from "../../utils/logger";
import { CommentsList } from "./CommentsList";
import { CommentInput } from "./CommentInput";

interface CommentsSectionProps {
  showId: string;
  query?: ListCommentsQuery;
}

export function CommentsSection({ showId, query }: CommentsSectionProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { showSnackbar } = useUIStore();
  const { data, isLoading } = useCommentsForShow(showId, query);
  const createComment = useCreateComment(showId, query);
  const updateComment = useUpdateComment(showId, query);
  const deleteComment = useDeleteComment(showId, query);
  const likeComment = useLikeComment(showId, query);
  const unlikeComment = useUnlikeComment(showId, query);

  const isPending =
    createComment.isPending ||
    updateComment.isPending ||
    deleteComment.isPending ||
    likeComment.isPending ||
    unlikeComment.isPending;

  const handleCreate = (content: string) => {
    createComment.mutate(
      { content },
      {
        onError: () => showSnackbar("Impossible d'ajouter le commentaire", "error"),
      },
    );
  };

  const handleReply = (content: string, parentId: string) => {
    createComment.mutate(
      { content, parentId },
      {
        onError: () => showSnackbar("Impossible d'ajouter la réponse", "error"),
      },
    );
  };

  const handleEdit = (id: string, content: string) => {
    updateComment.mutate(
      { id, content },
      {
        onError: () => showSnackbar("Impossible de modifier le commentaire", "error"),
      },
    );
  };

  const handleDelete = (id: string) => {
    deleteComment.mutate(id, {
      onError: () => showSnackbar("Impossible de supprimer le commentaire", "error"),
    });
  };

  const handleLike = (id: string) => {
    likeComment.mutate(id, {
      onError: () => showSnackbar("Impossible de liker", "error"),
    });
  };

  const handleUnlike = (id: string) => {
    unlikeComment.mutate(id, {
      onError: () => showSnackbar("Impossible de retirer le like", "error"),
    });
  };

  log("CommentsSection", "render", { showId, total: data?.total ?? 0 });

  return (
    <View className="flex-1">
      {isAuthenticated && (
        <View className="mb-4">
          <CommentInput
            placeholder="Ajouter un commentaire..."
            onSubmit={handleCreate}
            isPending={isPending}
          />
        </View>
      )}
      <CommentsList
        comments={data?.comments ?? []}
        isLoading={isLoading}
        isPending={isPending}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLike={handleLike}
        onUnlike={handleUnlike}
      />
    </View>
  );
}
