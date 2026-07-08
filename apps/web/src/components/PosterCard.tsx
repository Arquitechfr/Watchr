import { useNavigate } from "react-router-dom";
import { getPosterUrl } from "../services/shows.service";
import { ProgressBar } from "./ProgressBar";
import type { LibraryItem } from "../services/library.service";

interface PosterCardProps {
  item: LibraryItem;
}

export function PosterCard({ item }: PosterCardProps) {
  const navigate = useNavigate();
  const posterUrl = getPosterUrl(item.show.posterPath ?? undefined, 200);
  const watchedCount = item.watchedEpisodes.length;
  const total = item.show.totalEpisodes ?? 0;

  const statusColors: Record<string, string> = {
    watching: "bg-primary",
    completed: "bg-success",
    plan_to_watch: "bg-blue-500",
    dropped: "bg-danger",
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
      onClick={() => navigate(`/show/${item.show.tmdbId}`)}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={item.show.title}
          className="w-full aspect-[2/3] object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-[2/3] bg-surface-light flex items-center justify-center">
          <span className="text-text-muted text-xs text-center px-2">{item.show.title}</span>
        </div>
      )}
      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium text-white ${statusColors[item.status] ?? "bg-gray-500"}`}>
        {item.status.replace(/_/g, " ")}
      </div>
      {item.show.type === "tv" && total > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <ProgressBar watched={watchedCount} total={total} />
          <p className="text-white text-xs mt-1">
            {watchedCount}/{total}
          </p>
        </div>
      )}
    </div>
  );
}
