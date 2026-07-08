import type { Comment } from "../../services/comments.service";
import { CommentItem } from "./CommentItem";
import { useAuthStore } from "../../store/authStore";

interface CommentsListProps {
  comments: Comment[];
  showId: string;
  title: string;
  season?: number;
  episode?: number;
  onLike: (id: string) => void;
  onUnlike: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string, images?: string[], isSpoiler?: boolean) => void;
  onReply?: (parentId: string) => void;
  onAddReaction?: (id: string, emoji: string) => void;
  onRemoveReaction?: (id: string, emoji: string) => void;
  isPending?: boolean;
}

export function CommentsList({
  comments,
  showId,
  title,
  season,
  episode,
  onLike,
  onUnlike,
  onDelete,
  onEdit,
  onReply,
  onAddReaction,
  onRemoveReaction,
  isPending = false,
}: CommentsListProps) {
  const userId = useAuthStore((s) => s.userId);

  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          showId={showId}
          title={title}
          season={season}
          episode={episode}
          onLike={onLike}
          onUnlike={onUnlike}
          onDelete={onDelete}
          onEdit={onEdit}
          onReply={onReply}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
          isOwnComment={comment.userId === userId}
          isPending={isPending}
        />
      ))}
    </div>
  );
}
