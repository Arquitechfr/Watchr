import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Comment } from "../../services/comments.service";
import { Avatar } from "../Avatar";
import { useI18n } from "../../i18n/useI18n";

interface CommentItemProps {
  comment: Comment;
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
  isOwnComment: boolean;
  isPending?: boolean;
}

export function CommentItem({
  comment,
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
  isOwnComment,
  isPending = false,
}: CommentItemProps) {
  const { t, dateFnsLocale } = useI18n();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  return (
    <div className="bg-surface rounded-lg p-3">
      <div className="flex items-start gap-3">
        <Avatar url={comment.authorAvatarUrl} username={comment.authorUsername} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-text font-medium text-sm">{comment.authorUsername}</span>
              <span className="text-text-muted text-xs">
                {format(new Date(comment.createdAt), "PP", { locale: dateFnsLocale })}
              </span>
            </div>
            {isOwnComment && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 text-text-muted hover:text-text"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-7 bg-surface border border-border rounded-lg shadow-lg z-10 py-1">
                    <button
                      onClick={() => { setEditing(true); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-light"
                    >
                      <Edit2 size={14} /> {t("common.edit")}
                    </button>
                    <button
                      onClick={() => { onDelete(comment.id); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface-light"
                    >
                      <Trash2 size={14} /> {t("common.delete")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full bg-background text-text rounded-md p-2 text-sm border border-border focus:outline-none focus:border-primary resize-none"
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { onEdit(comment.id, editContent); setEditing(false); }}
                  className="bg-primary text-background px-3 py-1 rounded text-xs font-medium"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditContent(comment.content); }}
                  className="text-text-muted px-3 py-1 rounded text-xs"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {comment.isSpoiler && (
                <span className="inline-block bg-danger/20 text-danger text-xs px-2 py-0.5 rounded mt-1">
                  {t("comments.spoiler")}
                </span>
              )}
              <p className="text-text text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
              {comment.images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {comment.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-20 h-20 rounded-md object-cover" />
                  ))}
                </div>
              )}

              {comment.reactions.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {comment.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => {
                        if (isPending) return;
                        if (r.reactedByMe && onRemoveReaction) {
                          onRemoveReaction(comment.id, r.emoji);
                        } else if (!r.reactedByMe && onAddReaction) {
                          onAddReaction(comment.id, r.emoji);
                        }
                      }}
                      disabled={isPending}
                      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                        r.reactedByMe ? "bg-primary/20 text-primary" : "bg-surface-light text-text-muted hover:bg-surface"
                      }`}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => (comment.likedByMe ? onUnlike(comment.id) : onLike(comment.id))}
                  className={`flex items-center gap-1 text-xs ${
                    comment.likedByMe ? "text-primary" : "text-text-muted hover:text-text"
                  }`}
                >
                  <Heart size={14} className={comment.likedByMe ? "fill-primary" : ""} />
                  {comment.likesCount > 0 && comment.likesCount}
                </button>
                {onReply && (
                  <button
                    onClick={() => onReply(comment.id)}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-text"
                  >
                    <MessageCircle size={14} />
                    {comment.replyCount > 0 && comment.replyCount}
                  </button>
                )}
                {comment.replyCount > 0 && onReply && (
                  <button
                    onClick={() => navigate(`/comments/${comment.id}`)}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("comments.viewThread")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
