import { CommentsList } from "./CommentsList";
import { CommentsSortBar } from "./CommentsSortBar";
import { CommentInput } from "./CommentInput";
import type { Comment, CommentSort } from "../../services/comments.service";
import { useI18n } from "../../i18n/useI18n";

interface CommentsSectionProps {
  comments: Comment[];
  showId: string;
  title: string;
  season?: number;
  episode?: number;
  sort: CommentSort;
  onSortChange: (sort: CommentSort) => void;
  onLike: (id: string) => void;
  onUnlike: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string, images?: string[], isSpoiler?: boolean) => void;
  onSubmit: (input: { content: string; images?: string[]; isSpoiler?: boolean }) => void;
  onReply?: (parentId: string) => void;
  onAddReaction?: (id: string, emoji: string) => void;
  onRemoveReaction?: (id: string, emoji: string) => void;
  isPending?: boolean;
}

export function CommentsSection({
  comments,
  showId,
  title,
  season,
  episode,
  sort,
  onSortChange,
  onLike,
  onUnlike,
  onDelete,
  onEdit,
  onSubmit,
  onReply,
  onAddReaction,
  onRemoveReaction,
  isPending = false,
}: CommentsSectionProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text font-semibold text-sm">
          {t("comments.title")} ({comments.length})
        </h3>
      </div>
      <CommentInput onSubmit={onSubmit} isPending={isPending} />
      <CommentsSortBar sort={sort} onSortChange={onSortChange} />
      {comments.length === 0 ? (
        <p className="text-text-muted text-sm text-center py-8">{t("comments.empty")}</p>
      ) : (
        <CommentsList
          comments={comments}
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
          isPending={isPending}
        />
      )}
    </div>
  );
}
