import { useI18n } from "../../i18n/useI18n";
import type { CommentSort } from "../../services/comments.service";

interface CommentsSortBarProps {
  sort: CommentSort;
  onSortChange: (sort: CommentSort) => void;
}

export function CommentsSortBar({ sort, onSortChange }: CommentsSortBarProps) {
  const { t } = useI18n();

  const options: Array<{ key: CommentSort; label: string }> = [
    { key: "recent", label: t("comments.sortRecent") },
    { key: "liked", label: t("comments.sortLiked") },
    { key: "replied", label: t("comments.sortReplied") },
    { key: "relevant", label: t("comments.sortRelevant") },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSortChange(opt.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            sort === opt.key
              ? "bg-primary text-background"
              : "bg-surface text-text-muted hover:text-text"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
