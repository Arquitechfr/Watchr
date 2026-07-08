import { useState } from "react";
import { Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "../components/layout/PageWrapper";
import { SearchBar } from "../components/SearchBar";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { FilterChips } from "../components/FilterChips";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { getPosterUrl } from "../services/shows.service";
import type { UnwatchedMovie } from "../services/unwatched.service";
import { useUnwatchedMovies } from "../hooks/useUnwatched";
import { useTrackingRealtime } from "../hooks/useTrackingRealtime";
import { useUpsertTracking } from "../hooks/useTracking";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";

export function MoviesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSnackbar } = useUIStore();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filter, setFilter] = useState("all");

  const { data, isLoading, isError, refetch } = useUnwatchedMovies();
  useTrackingRealtime();

  const upsertTracking = useUpsertTracking("", 0);

  const chips = [
    { key: "all", label: t("common.all") },
    { key: "watching", label: t("common.status.watching") },
    { key: "plan_to_watch", label: t("common.status.plan_to_watch") },
    { key: "dropped", label: t("common.status.dropped") },
  ];

  const filteredMovies: UnwatchedMovie[] = data?.movies.filter((m: UnwatchedMovie) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || m.status === filter;
    return matchesSearch && matchesFilter;
  }) ?? [];

  function handleMarkWatched(_showId: string, _tmdbId: number) {
    upsertTracking.mutate(
      { status: "completed" },
      {
        onSuccess: () => showSnackbar(t("screens.movies.markedWatched"), "success"),
        onError: () => showSnackbar(t("screens.movies.markError"), "error"),
      },
    );
  }

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-text font-bold text-2xl">{t("navigation.movies")}</h1>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      <div className="mb-3">
        <SearchBar value={search} onChange={setSearch} />
      </div>
      <div className="mb-4">
        <FilterChips chips={chips} activeChip={filter} onChipChange={setFilter} />
      </div>

      {isLoading && (
        <div className={viewMode === "grid" ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === "grid" ? "aspect-[2/3] w-full" : "h-20 w-full"} />
          ))}
        </div>
      )}
      {isError && <NetworkError onRetry={refetch} />}
      {!isLoading && !isError && filteredMovies.length === 0 && (
        <EmptyState icon={Inbox} title={t("screens.movies.empty")} subtitle={t("screens.movies.addFromSearch")} />
      )}
      {!isLoading && !isError && filteredMovies.length > 0 && (
        <>
          {viewMode === "list" ? (
            <div className="space-y-2">
              {filteredMovies.map((movie: UnwatchedMovie) => (
                <div
                  key={movie.showId}
                  className="flex items-center gap-3 bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-light transition-colors"
                  onClick={() => navigate(`/show/${movie.tmdbId}`)}
                >
                  <img
                    src={getPosterUrl(movie.posterPath, 92)}
                    alt={movie.title}
                    className="w-12 h-18 rounded-md object-cover shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-medium text-sm truncate">{movie.title}</p>
                    <p className="text-text-muted text-xs">
                      {movie.year && `${movie.year}`}
                      {movie.genres && movie.genres.length > 0 && ` • ${movie.genres.slice(0, 2).map((g: { id: number; name?: string }) => g.name).join(", ")}`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkWatched(movie.showId, movie.tmdbId); }}
                    className="bg-primary text-background px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary-dark transition-colors shrink-0"
                  >
                    {t("common.markWatched")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {filteredMovies.map((movie: UnwatchedMovie) => (
                <div
                  key={movie.showId}
                  className="cursor-pointer"
                  onClick={() => navigate(`/show/${movie.tmdbId}`)}
                >
                  <img
                    src={getPosterUrl(movie.posterPath, 200)}
                    alt={movie.title}
                    className="w-full aspect-[2/3] rounded-md object-cover hover:opacity-80 transition-opacity"
                    loading="lazy"
                  />
                  <p className="text-text text-xs mt-1 truncate">{movie.title}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
