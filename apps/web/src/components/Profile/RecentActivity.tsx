import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { RecentActivityItem } from "../../services/stats.service";
import { useI18n } from "../../i18n/useI18n";

interface RecentActivityProps {
  items: RecentActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  const navigate = useNavigate();
  const { t, dateFnsLocale } = useI18n();

  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-4">
        <p className="text-text font-semibold text-base mb-2">{t("screens.profile.activityTitle")}</p>
        <p className="text-text-muted text-sm">{t("screens.profile.activityEmpty")}</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-text font-semibold text-base mb-3">{t("screens.profile.activityTitle")}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.commentId}
            className="flex items-start gap-3 bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-light transition-colors"
            onClick={() => navigate(`/show/${item.tmdbId}`)}
          >
            <MessageSquare size={18} className="text-text-muted mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-text-muted text-xs mb-1">
                {t("screens.profile.activityCommentedOn", { title: item.showTitle })}
              </p>
              <p className="text-text text-sm line-clamp-2">{item.content}</p>
              <p className="text-text-muted text-xs mt-1">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: dateFnsLocale })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
