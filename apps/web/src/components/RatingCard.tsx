import { Users } from "lucide-react";
import { RatingStars } from "./RatingStars";
import type { RatingsForShow } from "../services/ratings.service";
import { useI18n } from "../i18n/useI18n";

interface RatingCardProps {
  showId: string;
  ratings: RatingsForShow | undefined;
  onRate: (value: number) => void;
  episodeRef?: { season: number; episode: number };
}

export function RatingCard({ ratings, onRate, episodeRef }: RatingCardProps) {
  const { t } = useI18n();

  const userRating = episodeRef
    ? ratings?.user.episodes.find((e) => e.season === episodeRef.season && e.episode === episodeRef.episode)?.value ?? null
    : ratings?.user.show ?? null;

  const community = episodeRef
    ? ratings?.community.episodes.find((e) => e.season === episodeRef.season && e.episode === episodeRef.episode)
    : ratings?.community.show;

  return (
    <div className="bg-surface rounded-lg p-4">
      <h3 className="text-text font-semibold text-sm mb-3">{t("screens.showDetail.yourRating")}</h3>
      <RatingStars value={userRating} onChange={onRate} size={20} />

      {community && community.count > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <Users size={16} className="text-text-muted" />
          <span className="text-text-muted text-xs">
            {t("screens.showDetail.communityRating")}: {community.average.toFixed(1)}/10 ({community.count})
          </span>
        </div>
      )}
    </div>
  );
}
