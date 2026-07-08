import { useState } from "react";
import { Star, Users } from "lucide-react";
import { RatingStars } from "./RatingStars";
import type { RatingsForShow, CommunityRating } from "../services/ratings.service";
import { useI18n } from "../i18n/useI18n";

interface RatingCardProps {
  showId?: string;
  ratings?: RatingsForShow | undefined;
  onRate?: (value: number) => void;
  episodeRef?: { season: number; episode: number };
  value?: number | null;
  onChange?: (value: number) => void;
  communityData?: CommunityRating | null;
}

export function RatingCard({ ratings, onRate, episodeRef, value, onChange, communityData }: RatingCardProps) {
  const { t } = useI18n();
  const [showStars, setShowStars] = useState(false);

  const isCommunity = communityData !== undefined;

  const userRating = isCommunity
    ? null
    : episodeRef
      ? ratings?.user.episodes.find((e) => e.season === episodeRef.season && e.episode === episodeRef.episode)?.value ?? null
      : ratings?.user.show ?? null;

  const community = isCommunity
    ? communityData
    : episodeRef
      ? ratings?.community.episodes.find((e) => e.season === episodeRef.season && e.episode === episodeRef.episode)
      : ratings?.community.show;

  const communityRating = community?.average ?? null;
  const communityCount = community?.count ?? 0;

  const displayValue: number | null = isCommunity
    ? (communityData?.average ?? null)
    : (value ?? userRating ?? null);

  const handleStarChange = (starValue: number) => {
    if (onChange) {
      onChange(starValue);
    } else if (onRate) {
      onRate(starValue);
    }
  };

  const handleCardClick = () => {
    if (!isCommunity && (onChange || onRate)) {
      setShowStars((prev) => !prev);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-surface rounded-lg p-4 ${!isCommunity && (onChange || onRate) ? "cursor-pointer" : ""}`}
    >
      <h3 className="text-text-muted text-xs uppercase tracking-wider mb-2">
        {isCommunity ? t("screens.showDetail.communityRating") : t("screens.showDetail.yourRating")}
      </h3>

      {showStars && !isCommunity ? (
        <RatingStars value={displayValue} onChange={handleStarChange} size={28} />
      ) : (
        <div className="flex items-center">
          {displayValue !== null ? (
            <>
              <Star size={32} className="fill-primary text-primary" />
              <span className="text-text font-bold text-2xl ml-2">
                {displayValue.toFixed(1)}
              </span>
              <span className="text-text-muted text-sm ml-1">/5</span>
            </>
          ) : (
            <div className="flex items-center py-1">
              <Star size={28} className="text-text-muted" />
              <span className="text-text-muted ml-2 text-sm">
                {isCommunity ? t("screens.showDetail.noRating") : t("screens.showDetail.tapToRate")}
              </span>
            </div>
          )}
        </div>
      )}

      {isCommunity && communityCount > 0 && (
        <p className="text-text-muted text-xs mt-1">
          {t("screens.showDetail.votes", { count: communityCount })}
        </p>
      )}

      {!isCommunity && communityRating !== null && communityCount > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-text-muted" />
            <span className="text-text-muted text-xs font-medium uppercase">
              {t("screens.showDetail.communityRating")}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-text font-bold text-lg">{communityRating.toFixed(1)}</span>
            <span className="text-text-muted text-sm">/5</span>
            <span className="text-text-muted text-xs ml-2">
              {t("screens.showDetail.votes", { count: communityCount })}
            </span>
          </div>
        </div>
      )}

      {!isCommunity && communityRating === null && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-text-muted" />
            <span className="text-text-muted text-xs">
              {t("screens.showDetail.noRating")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
