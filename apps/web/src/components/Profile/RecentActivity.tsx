import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { RecentActivityItem } from "../../services/stats.service";
import { useI18n } from "../../i18n/useI18n";

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const navigate = useNavigate();
  const { dateFnsLocale } = useI18n();

  if (activities.length === 0) return null;

  return (
    <div className="space-y-2">
      {activities.map((activity, i) => (
        <div
          key={`${activity.commentId}-${i}`}
          className="flex items-start gap-3 bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-light transition-colors"
          onClick={() => navigate(`/show/${activity.tmdbId}`)}
        >
          <MessageSquare size={18} className="text-text-muted mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-text text-sm line-clamp-2">{activity.content}</p>
            <p className="text-text-muted text-xs mt-1">
              {activity.showTitle} • {format(new Date(activity.createdAt), "PP", { locale: dateFnsLocale })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
