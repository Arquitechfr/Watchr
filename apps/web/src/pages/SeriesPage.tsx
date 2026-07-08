import { useState, useEffect } from "react";
import { Search as SearchIcon, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "../components/layout/PageWrapper";
import { TopTabs } from "../components/TopTabs";
import { SearchBar } from "../components/SearchBar";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { UnwatchedEpisodeRow } from "../components/UnwatchedEpisodeRow";
import { UpcomingEpisodeRow } from "../components/UpcomingEpisodeRow";
import { WeekSectionHeader } from "../components/WeekSectionHeader";
import { EpisodeCard } from "../components/EpisodeCard";
import { useUnwatchedShows } from "../hooks/useUnwatched";
import { useUpcomingEpisodes } from "../hooks/useUpcomingEpisodes";
import { useQuickMarkWatched } from "../hooks/useTracking";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";
import type { UnwatchedShow, UnwatchedEpisode } from "../services/unwatched.service";
import type { UpcomingEpisode } from "../services/upcoming.service";
import { log } from "../utils/logger";

interface FlattenedEpisode {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  episode: UnwatchedEpisode;
  network?: string;
  isNew?: boolean;
}

function useTabs() {
  const { t } = useI18n();
  return [
    { key: "unwatched" as const, label: t("navigation.unwatched") },
    { key: "upcoming" as const, label: t("navigation.upcoming") },
  ];
}

function UnwatchedList({
  shows,
  isLoading,
  refetch,
  onEpisodePress,
  onMarkWatched,
  markingEpisodeKey,
  viewMode,
  cardWidth,
  searchQuery,
}: {
  shows: UnwatchedShow[];
  isLoading: boolean;
  refetch: () => void;
  onEpisodePress: (item: FlattenedEpisode) => void;
  onMarkWatched?: (item: FlattenedEpisode) => void;
  markingEpisodeKey?: string;
  viewMode: "list" | "grid";
  cardWidth: number;
  searchQuery: string;
}) {
  const { t } = useI18n();

  let episodes = shows.flatMap((show) =>
    show.unwatchedEpisodes.map((ep, index) => ({
      showId: show.showId,
      tmdbId: show.tmdbId,
      title: show.title,
      posterPath: show.posterPath,
      episode: ep,
      network: show.network,
      isNew: index === 0,
    })),
  );
  episodes.sort((a, b) => {
    const aDate = a.episode.airDate ? new Date(a.episode.airDate).getTime() : 0;
    const bDate = b.episode.airDate ? new Date(b.episode.airDate).getTime() : 0;
    return bDate - aDate;
  });
  if (searchQuery.trim().length >= 3) {
    const q = searchQuery.trim().toLowerCase();
    episodes = episodes.filter((ep) => ep.title.toLowerCase().includes(q));
  }

  if (episodes.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={t("screens.home.noUnwatched")}
      />
    );
  }

  log("SeriesPage:UnwatchedList", "flattened episodes", { count: episodes.length });

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-3 gap-3 pb-6">
        {episodes.map((item) => {
          const epKey = `${item.showId}-${item.episode.season}-${item.episode.episode}`;
          return (
            <div key={epKey} style={{ width: cardWidth }}>
              <EpisodeCard
                posterPath={item.posterPath}
                title={item.title}
                season={item.episode.season}
                episode={item.episode.episode}
                episodeName={item.episode.name}
                isNew={item.isNew}
                airDate={item.episode.airDate}
                onPress={() => onEpisodePress(item)}
                onMarkWatched={onMarkWatched ? () => onMarkWatched(item) : undefined}
                isMarking={markingEpisodeKey === epKey}
                width={cardWidth}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-6">
      {episodes.map((item) => {
        const epKey = `${item.showId}-${item.episode.season}-${item.episode.episode}`;
        return (
          <UnwatchedEpisodeRow
            key={epKey}
            showId={item.showId}
            tmdbId={item.tmdbId}
            title={item.title}
            posterPath={item.posterPath}
            episode={item.episode}
            isNew={item.isNew}
            onPress={() => onEpisodePress(item)}
            onMarkWatched={onMarkWatched ? () => onMarkWatched && onMarkWatched(item) : undefined}
            isMarking={markingEpisodeKey === epKey}
          />
        );
      })}
    </div>
  );
}

function UpcomingList({
  data,
  isLoading,
  error,
  refetch,
  onEpisodePress,
  onMarkWatched,
  markingEpisodeKey,
  viewMode,
  cardWidth,
  searchQuery,
}: {
  data: { today: UpcomingEpisode[]; thisWeek: UpcomingEpisode[]; nextWeek: UpcomingEpisode[]; later: UpcomingEpisode[] } | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  onEpisodePress: (episode: UpcomingEpisode) => void;
  onMarkWatched?: (episode: UpcomingEpisode) => void;
  markingEpisodeKey?: string;
  viewMode: "list" | "grid";
  cardWidth: number;
  searchQuery: string;
}) {
  const { t } = useI18n();

  const filterByQuery = (eps: UpcomingEpisode[]): UpcomingEpisode[] => {
    if (searchQuery.trim().length >= 3) {
      const q = searchQuery.trim().toLowerCase();
      return eps.filter((ep) => ep.title.toLowerCase().includes(q));
    }
    return eps;
  };

  if (isLoading) {
    return (
      <div>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full mb-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return <NetworkError onRetry={refetch} />;
  }

  if (viewMode === "grid") {
    const allEpisodes: UpcomingEpisode[] = [
      ...filterByQuery(data?.today ?? []),
      ...filterByQuery(data?.thisWeek ?? []),
      ...filterByQuery(data?.nextWeek ?? []),
      ...filterByQuery(data?.later ?? []),
    ];

    if (allEpisodes.length === 0) {
      return (
        <EmptyState
          icon={SearchIcon}
          title={t("screens.upcoming.empty")}
          subtitle={t("screens.upcoming.emptySubtitle")}
        />
      );
    }

    const todayEps = filterByQuery(data?.today ?? []);
    const todayKeys = new Set(todayEps.map((ep) => `${ep.showId}-${ep.season}-${ep.episode}`));

    return (
      <div className="grid grid-cols-3 gap-3 pb-6">
        {allEpisodes.map((item) => {
          const epKey = `${item.showId}-${item.season}-${item.episode}`;
          return (
            <div key={epKey} style={{ width: cardWidth }}>
              <EpisodeCard
                posterPath={item.posterPath}
                title={item.title}
                season={item.season}
                episode={item.episode}
                episodeName={item.name}
                isNew={todayKeys.has(epKey)}
                network={item.network}
                airDate={item.airDate}
                onPress={() => onEpisodePress(item)}
                onMarkWatched={onMarkWatched ? () => onMarkWatched(item) : undefined}
                isMarking={markingEpisodeKey === epKey}
                width={cardWidth}
              />
            </div>
          );
        })}
      </div>
    );
  }

  const rows: { type: "header" | "episode"; title?: string; count?: number; episode?: UpcomingEpisode }[] = [];
  const today = filterByQuery(data?.today ?? []);
  const thisWeek = filterByQuery(data?.thisWeek ?? []);
  const nextWeek = filterByQuery(data?.nextWeek ?? []);
  const later = filterByQuery(data?.later ?? []);
  if (today.length > 0) {
    rows.push({ type: "header", title: t("screens.upcoming.today"), count: today.length });
    today.forEach((ep) => rows.push({ type: "episode", episode: ep }));
  }
  if (thisWeek.length > 0) {
    rows.push({ type: "header", title: t("screens.upcoming.thisWeek"), count: thisWeek.length });
    thisWeek.forEach((ep) => rows.push({ type: "episode", episode: ep }));
  }
  if (nextWeek.length > 0) {
    rows.push({ type: "header", title: t("screens.upcoming.nextWeek"), count: nextWeek.length });
    nextWeek.forEach((ep) => rows.push({ type: "episode", episode: ep }));
  }
  if (later.length > 0) {
    rows.push({ type: "header", title: t("screens.upcoming.later"), count: later.length });
    later.forEach((ep) => rows.push({ type: "episode", episode: ep }));
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={SearchIcon}
        title={t("screens.upcoming.empty")}
        subtitle={t("screens.upcoming.emptySubtitle")}
      />
    );
  }

  return (
    <div className="space-y-2 pb-6">
      {rows.map((item, index) => {
        if (item.type === "header") {
          return <WeekSectionHeader key={`header-${index}`} title={item.title ?? ""} count={item.count} />;
        }
        const ep = item.episode!;
        const epKey = `${ep.showId}-${ep.season}-${ep.episode}`;
        const isNew = today.some((e) => `${e.showId}-${e.season}-${e.episode}` === epKey);
        return (
          <UpcomingEpisodeRow
            key={epKey}
            episode={ep}
            onPress={() => onEpisodePress(ep)}
            onMarkWatched={onMarkWatched ? () => onMarkWatched(ep) : undefined}
            isMarking={markingEpisodeKey === epKey}
          />
        );
      })}
    </div>
  );
}

export function SeriesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const showSnackbar = useUIStore((state) => state.showSnackbar);
  const libraryViewMode = useUIStore((state) => state.libraryViewMode);
  const setLibraryViewMode = useUIStore((state) => state.setLibraryViewMode);
  const hydrateLibraryViewMode = useUIStore((state) => state.hydrateLibraryViewMode);
  const tabs = useTabs();
  const [activeTab, setActiveTab] = useState<"unwatched" | "upcoming">("unwatched");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [windowWidth, setWindowWidth] = useState(1024);

  useEffect(() => {
    hydrateLibraryViewMode();
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    setWindowWidth(window.innerWidth);
    return () => window.removeEventListener("resize", handleResize);
  }, [hydrateLibraryViewMode]);

  const gridNumColumns = 3;
  const gridGap = 12;
  const gridPadding = 16;
  const cardWidth = (windowWidth - gridPadding * 2 - gridGap * (gridNumColumns - 1)) / gridNumColumns;
  const { data: unwatchedData, isLoading: isUnwatchedLoading, isError: isUnwatchedError, error: unwatchedError, refetch: refetchUnwatched } = useUnwatchedShows();
  const { data: upcomingData, isLoading: isUpcomingLoading, isError: _isUpcomingError, error: upcomingError, refetch: refetchUpcoming } = useUpcomingEpisodes();
  const quickMarkWatched = useQuickMarkWatched();
  const throttledRefreshUnwatched = useRefreshRateLimit();
  const throttledRefreshUpcoming = useRefreshRateLimit();

  const markingEpisodeKey = quickMarkWatched.isPending && quickMarkWatched.variables
    ? `${quickMarkWatched.variables.showId}-${quickMarkWatched.variables.season}-${quickMarkWatched.variables.episode}`
    : undefined;

  log("SeriesPage", "state", {
    activeTab,
    unwatchedCount: unwatchedData?.shows.length ?? 0,
    isUnwatchedLoading,
    isUnwatchedError,
    upcomingKeys: upcomingData ? Object.keys(upcomingData) : null,
  });

  function handleEpisodePress(item: FlattenedEpisode) {
    if (!item.tmdbId) return;
    navigate(`/show/${item.tmdbId}/season/${item.episode.season}/episode/${item.episode.episode}`);
  }

  function handleViewLibrary() {
    navigate("/library?tab=tv");
  }

  function handleMarkUpcomingWatched(episode: UpcomingEpisode) {
    quickMarkWatched.mutate(
      { showId: episode.showId, season: episode.season, episode: episode.episode },
      {
        onSuccess: () => showSnackbar(t("screens.upcoming.markedWatched"), "success"),
        onError: () => showSnackbar(t("screens.upcoming.markError"), "error"),
      },
    );
  }

  function handleMarkUnwatchedEpisode(item: FlattenedEpisode) {
    quickMarkWatched.mutate(
      { showId: item.showId, season: item.episode.season, episode: item.episode.episode },
      {
        onSuccess: () => showSnackbar(t("screens.upcoming.markedWatched"), "success"),
        onError: () => showSnackbar(t("screens.upcoming.markError"), "error"),
      },
    );
  }

  function handleUpcomingPress(episode: UpcomingEpisode) {
    if (!episode.tmdbId) return;
    navigate(`/show/${episode.tmdbId}/season/${episode.season}/episode/${episode.episode}`);
  }

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-text font-bold text-2xl">{t("navigation.series")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className="p-1 text-text-muted hover:text-text transition-colors"
          >
            <SearchIcon size={24} />
          </button>
          <ViewModeToggle />
        </div>
      </div>

      {isSearchVisible && (
        <div className="mb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("screens.series.searchPlaceholder")}
            onClose={() => {
              setSearchQuery("");
              setIsSearchVisible(false);
            }}
          />
        </div>
      )}

      <TopTabs tabs={tabs} activeTab={activeTab} onTabChange={(key: string) => {
        const tab = key as "unwatched" | "upcoming";
        log("SeriesPage", "tab changed", tab);
        setActiveTab(tab);
        if (tab === "unwatched") {
          throttledRefreshUnwatched(refetchUnwatched);
        } else if (tab === "upcoming") {
          throttledRefreshUpcoming(refetchUpcoming);
        }
      }} />

      {activeTab === "unwatched" && (
        <div>
          {isUnwatchedLoading ? (
            <div>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full mb-2" />
              ))}
            </div>
          ) : isUnwatchedError ? (
            <NetworkError onRetry={() => refetchUnwatched()} />
          ) : (
            <UnwatchedList
              shows={unwatchedData?.shows ?? []}
              isLoading={isUnwatchedLoading}
              refetch={() => throttledRefreshUnwatched(refetchUnwatched)}
              onEpisodePress={handleEpisodePress}
              onMarkWatched={handleMarkUnwatchedEpisode}
              markingEpisodeKey={markingEpisodeKey}
              viewMode={libraryViewMode}
              cardWidth={cardWidth}
              searchQuery={searchQuery}
            />
          )}
        </div>
      )}

      {activeTab === "upcoming" && (
        <div>
          <UpcomingList
            data={upcomingData}
            isLoading={isUpcomingLoading}
            error={upcomingError}
            refetch={() => throttledRefreshUpcoming(refetchUpcoming)}
            onEpisodePress={handleUpcomingPress}
            onMarkWatched={handleMarkUpcomingWatched}
            markingEpisodeKey={markingEpisodeKey}
            viewMode={libraryViewMode}
            cardWidth={cardWidth}
            searchQuery={searchQuery}
          />
        </div>
      )}

      <button
        onClick={handleViewLibrary}
        className="w-full bg-card rounded-lg p-4 mb-4 text-primary font-semibold hover:bg-card-hover transition-colors"
      >
        {t("screens.series.viewAll")}
      </button>
    </PageWrapper>
  );
}
