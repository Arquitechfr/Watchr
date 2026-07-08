import { useNavigate } from "react-router-dom";
import { getPosterUrl } from "../../services/shows.service";
import type { FavoriteItem } from "../../services/favorites.service";
import { useI18n } from "../../i18n/useI18n";

interface FavoriteCarouselProps {
  items: FavoriteItem[];
  type: "tv" | "movie";
  onRefetch?: () => void;
}

export function FavoriteCarousel({ items, type, onRefetch }: FavoriteCarouselProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const sectionTitle = type === "tv" ? t("screens.profile.favoritesTvSection") : t("screens.profile.favoritesMovieSection");

  if (!items || items.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-6 text-center">
        <p className="text-text-muted text-sm">{t("screens.profile.favoritesEmpty")}</p>
        <p className="text-text-muted text-xs mt-1">{t("screens.profile.favoritesAddHint")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center flex-1">
          <p className="text-text font-semibold text-base">{sectionTitle}</p>
        </div>
        <button onClick={() => navigate(`/library?tab=${type}`)} className="text-primary text-sm">
          {t("common.seeAll")}
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {items.map((fav) => (
          <div
            key={fav.id}
            onClick={() => navigate(`/show/${fav.tmdbId}`)}
            className="shrink-0 cursor-pointer"
          >
            {fav.posterPath ? (
              <img
                src={getPosterUrl(fav.posterPath, 150)}
                alt={fav.title}
                className="w-24 h-36 rounded-md object-cover hover:opacity-80 transition-opacity"
                loading="lazy"
              />
            ) : (
              <div className="w-24 h-36 bg-surface-light rounded-md flex items-center justify-center">
                <span className="text-text-muted text-xs text-center px-1">{fav.title}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
