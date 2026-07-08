import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox } from "lucide-react";
import { ScreenContainer } from "../components/ScreenContainer";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { PosterCard } from "../components/PosterCard";
import { ProgressBar } from "../components/ProgressBar";
import { useLibrary } from "../hooks/useLibrary";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";
import { getPosterUrl } from "../services/shows.service";
import type { LibraryItem } from "../services/library.service";
import type { SearchResultItem } from "../services/shows.service";

type LibraryTab = "tv" | "movie";

function LibraryTabs({ active, onChange }: { active: LibraryTab; onChange: (tab: LibraryTab) => void }) {
  const { t } = useI18n();
  const tabs = [
    { key: "tv" as LibraryTab, label: t("navigation.series") },
    { key: "movie" as LibraryTab, label: t("navigation.movies") },
  ];

  return (
    <div className="flex bg-muted rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 py-2 rounded-md ${active === tab.key ? "bg-primary" : ""}`}
        >
          <span
            className={`text-center text-sm font-medium ${
              active === tab.key ? "text-white" : "text-text-muted"
            }`}
          >
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function LibraryItemCard({ item, onPress }: { item: LibraryItem; onPress: () => void }) {
  const { t } = useI18n();
  const posterUrl = item.show.posterPath ? getPosterUrl(item.show.posterPath, 200) : null;

  const getStatusLabel = () => {
    switch (item.status) {
      case "watching":
        return t("screens.showDetail.inProgress");
      case "completed":
        return t("screens.showDetail.completed");
      case "plan_to_watch":
        return t("screens.showDetail.planToWatch");
      case "dropped":
        return t("screens.showDetail.dropped");
    }
  };

  return (
    <button
      onClick={onPress}
      className="flex-row bg-card rounded-lg p-3 mb-3 w-full text-left"
      style={{ gap: 12 }}
    >
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={item.show.title}
          className="w-16 h-24 rounded object-cover"
        />
      ) : (
        <div className="w-16 h-24 rounded bg-muted flex items-center justify-center">
          <span className="text-text-muted text-xs">No poster</span>
        </div>
      )}
      <div className="flex-1 flex flex-col justify-center">
        <span className="text-text font-semibold text-base mb-1 line-clamp-2">{item.show.title}</span>
        <span className="text-text-muted text-sm mb-1">{getStatusLabel()}</span>
        {item.show.type === "tv" && item.watchedEpisodes.length > 0 && (
          <span className="text-text-muted text-xs">
            {t("screens.showDetail.episodesWatched", { count: item.watchedEpisodes.length })}
          </span>
        )}
        {item.show.type === "tv" && (
          <div className="mt-2">
            <ProgressBar watched={item.watchedEpisodes.length} total={item.show.totalEpisodes ?? 0} />
          </div>
        )}
      </div>
    </button>
  );
}

export function LibraryPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<LibraryTab>("tv");
  const libraryViewMode = useUIStore((state) => state.libraryViewMode);

  const {
    data: libraryData,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLibrary(activeTab);

  const data: LibraryItem[] = libraryData?.pages?.flatMap((page) => page.data) ?? [];

  const handleRefresh = () => {
    refetch();
  };

  const handleLoadMore = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  const handleItemPress = (item: LibraryItem) => {
    navigate(`/show/${item.show.tmdbId}`);
  };

  const toSearchResultItem = useCallback((item: LibraryItem): SearchResultItem => ({
    tmdbId: item.show.tmdbId,
    type: item.show.type,
    title: item.show.title,
    posterPath: item.show.posterPath ?? undefined,
    source: "tmdb",
  }), []);

  const handleTabChange = (tab: LibraryTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const gridNumColumns = 3;
  const gridGap = 12;
  const gridPadding = 16;
  const gridCardWidth = `calc((100% - ${gridPadding * 2}px - ${gridGap * (gridNumColumns - 1)}px) / ${gridNumColumns})`;

  return (
    <ScreenContainer className="px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-text font-bold text-2xl">{t("navigation.library")}</h1>
        <ViewModeToggle />
      </div>

      <LibraryTabs active={activeTab} onChange={handleTabChange} />

      <div className="flex-1 mt-4">
        {isLoading && data.length === 0 ? (
          <div>
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-20 w-full mb-3" />
            ))}
          </div>
        ) : isError ? (
          <NetworkError onRetry={handleRefresh} />
        ) : !isFetchingNextPage && data.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("screens.library.emptyTitle")}
          />
        ) : libraryViewMode === "grid" ? (
          <div
            className="grid gap-3 pb-24"
            style={{
              gridTemplateColumns: `repeat(${gridNumColumns}, 1fr)`,
              gap: `${gridGap}px`,
            }}
          >
            {data.map((item) => (
              <PosterCard
                key={item.id}
                show={toSearchResultItem(item)}
                onPress={() => handleItemPress(item)}
                watched={item.show.type === "tv" ? item.watchedEpisodes.length : undefined}
                total={item.show.type === "tv" ? item.show.totalEpisodes : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {data.map((item) => (
              <LibraryItemCard key={item.id} item={item} onPress={() => handleItemPress(item)} />
            ))}
          </div>
        )}
        {hasNextPage && (
          <button
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
            className="w-full py-3 text-center text-text-muted text-sm hover:text-text transition-colors"
          >
            {isFetchingNextPage ? "..." : t("common.loadMore")}
          </button>
        )}
      </div>
    </ScreenContainer>
  );
}
