import { useState, useEffect, useMemo } from "react";
import { Inbox, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "../components/layout/PageWrapper";
import { SearchBar } from "../components/SearchBar";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { FilterChips, FilterChipOption } from "../components/FilterChips";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { PosterCard } from "../components/PosterCard";
import { MovieCard } from "../components/MovieCard";
import { getPosterUrl, type SearchResultItem } from "../services/shows.service";
import type { UnwatchedMovie } from "../services/unwatched.service";
import { useUnwatchedMovies } from "../hooks/useUnwatched";
import { useTrackingRealtime } from "../hooks/useTrackingRealtime";
import { useQuickMarkMovieWatched } from "../hooks/useTracking";
import { useUIStore } from "../store/uiStore";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useI18n } from "../i18n/useI18n";
import { WatchStatus } from "../services/tracking.service";

function getStatusLabel(t: ReturnType<typeof useI18n>["t"], status: WatchStatus): string {
  switch (status) {
    case "watching":
      return t("screens.showDetail.inProgress");
    case "completed":
      return t("screens.showDetail.completed");
    case "plan_to_watch":
      return t("screens.showDetail.planToWatch");
    case "dropped":
      return t("screens.showDetail.dropped");
  }
}

const statusColorMap: Record<WatchStatus, string> = {
  watching: "text-primary",
  completed: "text-success",
  plan_to_watch: "text-text-muted",
  dropped: "text-error",
};

export function MoviesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { showSnackbar, libraryViewMode, setLibraryViewMode, hydrateLibraryViewMode } = useUIStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);

  const { data, isLoading, isError, error, refetch } = useUnwatchedMovies();
  useTrackingRealtime();
  const quickMarkMovieWatched = useQuickMarkMovieWatched();
  const throttledRefresh = useRefreshRateLimit();
  const movies: UnwatchedMovie[] = data?.movies ?? [];

  useEffect(() => {
    hydrateLibraryViewMode();
  }, []);

  const genreOptions = useMemo<FilterChipOption[]>(() => {
    const genreMap = new Map<number, string>();
    for (const movie of movies) {
      for (const genre of movie.genres ?? []) {
        if (genre.id && genre.name) {
          genreMap.set(genre.id, genre.name);
        }
      }
    }
    return Array.from(genreMap.entries()).map(([id, name]) => ({ label: name, value: id }));
  }, [movies]);

  const yearOptions = useMemo<FilterChipOption[]>(() => {
    const yearSet = new Set<number>();
    for (const movie of movies) {
      if (movie.year) yearSet.add(movie.year);
    }
    return Array.from(yearSet).sort((a, b) => b - a).map((year) => ({ label: String(year), value: year }));
  }, [movies]);

  const filteredMovies = useMemo<UnwatchedMovie[]>(() => {
    let result = movies;
    if (searchQuery.trim().length >= 3) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(q));
    }
    if (selectedGenre !== undefined) {
      result = result.filter((m) => m.genres?.some((g) => g.id === selectedGenre));
    }
    if (selectedYear !== undefined) {
      result = result.filter((m) => m.year === selectedYear);
    }
    return result;
  }, [movies, searchQuery, selectedGenre, selectedYear]);

  const isFiltering = searchQuery.trim().length >= 3 || selectedGenre !== undefined || selectedYear !== undefined;

  const markingMovieId = quickMarkMovieWatched.isPending && quickMarkMovieWatched.variables
    ? quickMarkMovieWatched.variables.showId
    : undefined;

  function handleMarkMovieWatched(movie: UnwatchedMovie) {
    quickMarkMovieWatched.mutate(
      { showId: movie.showId },
      {
        onSuccess: () => showSnackbar(t("screens.movies.markedWatched"), "success"),
        onError: () => showSnackbar(t("screens.movies.markError"), "error"),
      },
    );
  }

  function handleViewLibrary() {
    navigate("/library?tab=movie");
  }

  function handleCloseSearch() {
    setSearchQuery("");
    setSelectedGenre(undefined);
    setSelectedYear(undefined);
    setIsSearchVisible(false);
  }

  const toSearchResultItem = (movie: UnwatchedMovie): SearchResultItem => ({
    tmdbId: movie.tmdbId,
    type: "movie",
    title: movie.title,
    posterPath: movie.posterPath ?? undefined,
    firstAirDate: movie.year ? `${movie.year}-01-01` : undefined,
    source: "tmdb",
  });

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-text font-bold text-2xl">{t("navigation.movies")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className="p-2 text-text hover:text-primary transition-colors"
          >
            <Search size={24} />
          </button>
          <ViewModeToggle />
        </div>
      </div>

      {isSearchVisible && (
        <>
          <div className="mb-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("screens.movies.searchPlaceholder")}
              onClose={handleCloseSearch}
            />
          </div>
          {genreOptions.length > 0 && (
            <div className="mb-3">
              <FilterChips
                chips={genreOptions}
                activeChip={selectedGenre}
                onChipChange={(v) => setSelectedGenre(v as number | undefined)}
                allLabel={t("screens.movies.filterAll")}
                showAllOption
              />
            </div>
          )}
          {yearOptions.length > 0 && (
            <div className="mb-3">
              <FilterChips
                chips={yearOptions}
                activeChip={selectedYear}
                onChipChange={(v) => setSelectedYear(v as number | undefined)}
                allLabel={t("screens.movies.filterAll")}
                showAllOption
              />
            </div>
          )}
        </>
      )}

      {isLoading && (
        <div className={libraryViewMode === "grid" ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={libraryViewMode === "grid" ? "aspect-[2/3] w-full" : "h-20 w-full"} />
          ))}
        </div>
      )}

      {isError && (
        <NetworkError onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && filteredMovies.length === 0 && (
        <EmptyState
          icon={isFiltering ? Search : Inbox}
          title={isFiltering ? t("screens.movies.noResults") : t("screens.movies.empty")}
          subtitle={isFiltering ? undefined : t("screens.movies.addFromSearch")}
        />
      )}

      {!isLoading && !isError && filteredMovies.length > 0 && (
        <>
          {libraryViewMode === "grid" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {filteredMovies.map((movie) => {
                const genreNames = (movie.genres ?? []).filter((g) => g.name).slice(0, 2).map((g) => g.name!);
                return (
                  <PosterCard
                    key={movie.showId}
                    show={toSearchResultItem(movie)}
                    onPress={() => {
                      if (!movie.tmdbId) return;
                      navigate(`/show/${movie.tmdbId}`);
                    }}
                    genres={genreNames}
                    statusLabel={getStatusLabel(t, movie.status)}
                    statusColor={statusColorMap[movie.status]}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.showId}
                  movie={movie}
                  onPress={() => {
                    if (!movie.tmdbId) return;
                    navigate(`/show/${movie.tmdbId}`);
                  }}
                  onMarkWatched={() => handleMarkMovieWatched(movie)}
                  isMarking={markingMovieId === movie.showId}
                />
              ))}
            </div>
          )}
        </>
      )}

      <button
        onClick={handleViewLibrary}
        className="w-full bg-surface rounded-lg p-4 mt-4 text-primary font-semibold hover:bg-surface-light transition-colors"
      >
        {t("screens.movies.viewAll")}
      </button>
    </PageWrapper>
  );
}
