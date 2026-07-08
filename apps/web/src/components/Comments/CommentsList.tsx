import type { Comment } from "../../services/comments.service";
import { CommentItem } from "./CommentItem";
import { useAuthStore } from "../../store/authStore";

interface CommentsListProps {
  comments: Comment[];
  onLike: (id: string) => void;
  onUnlike: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onReply?: (parentId: string) => void;
}

export function CommentsList({
  comments,
  onLike,
  onUnlike,
  onDelete,
  onEdit,
  onReply,
}: CommentsListProps) {
  const userId = useAuthStore((s) => s.userId);

  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onLike={onLike}
          onUnlike={onUnlike}
          onDelete={onDelete}
          onEdit={onEdit}
          onReply={onReply}
          isOwnComment={comment.userId === userId}
        />
      ))}
    </div>
  );
}
