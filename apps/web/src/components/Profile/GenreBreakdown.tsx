import type { GenreStat } from "../../services/stats.service";

interface GenreBreakdownProps {
  genres: GenreStat[];
}

export function GenreBreakdown({ genres }: GenreBreakdownProps) {
  if (genres.length === 0) return null;

  const maxCount = Math.max(...genres.map((g) => g.count));

  return (
    <div className="space-y-2">
      {genres.slice(0, 10).map((genre) => (
        <div key={genre.id} className="flex items-center gap-3">
          <span className="text-text-muted text-xs w-24 truncate">{genre.name}</span>
          <div className="flex-1 h-3 bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(genre.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-text-muted text-xs w-8 text-right">{genre.count}</span>
        </div>
      ))}
    </div>
  );
}
