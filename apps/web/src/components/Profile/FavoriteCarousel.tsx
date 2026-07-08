import { useNavigate } from "react-router-dom";
import { getPosterUrl } from "../../services/shows.service";
import type { FavoriteItem } from "../../services/favorites.service";

interface FavoriteCarouselProps {
  favorites: FavoriteItem[];
}

export function FavoriteCarousel({ favorites }: FavoriteCarouselProps) {
  const navigate = useNavigate();

  if (favorites.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
      {favorites.map((fav) => (
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
  );
}
