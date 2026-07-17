import { View, FlatList, RefreshControl } from "react-native";
import { useMemo } from "react";
import { EmptyState } from "../EmptyState";
import { Skeleton } from "../Skeleton";
import { EpisodeCard } from "../EpisodeCard";
import { UnwatchedEpisodeRow } from "../UnwatchedEpisodeRow";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { log } from "../../utils/logger";
import type { UnwatchedShow, UnwatchedEpisode } from "../../services/unwatched.service";

export interface FlattenedEpisode {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  episode: UnwatchedEpisode;
  network?: string;
  isNew?: boolean;
}

interface UnwatchedListProps {
  shows: UnwatchedShow[];
  isLoading: boolean;
  refetch: () => void;
  onEpisodePress: (item: FlattenedEpisode) => void;
  onTitlePress: (tmdbId: number, title: string) => void;
  onMarkWatched?: (item: FlattenedEpisode) => void;
  markingEpisodeKey?: string;
  viewMode: "list" | "grid";
  cardWidth: number;
  gridNumColumns: number;
  searchQuery: string;
  listRef: React.RefObject<FlatList | null>;
  onAddPress: () => void;
}

export function UnwatchedList({
  shows,
  isLoading,
  refetch,
  onEpisodePress,
  onTitlePress,
  onMarkWatched,
  markingEpisodeKey,
  viewMode,
  cardWidth,
  gridNumColumns,
  searchQuery,
  listRef,
  onAddPress,
}: UnwatchedListProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const episodes = useMemo(() => {
    const flat: FlattenedEpisode[] = shows.flatMap((show) =>
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
    flat.sort((a, b) => {
      const aDate = a.episode.airDate ? new Date(a.episode.airDate).getTime() : 0;
      const bDate = b.episode.airDate ? new Date(b.episode.airDate).getTime() : 0;
      return bDate - aDate;
    });
    if (searchQuery.trim().length >= 3) {
      const q = searchQuery.trim().toLowerCase();
      return flat.filter((ep) => ep.title.toLowerCase().includes(q));
    }
    return flat;
  }, [shows, searchQuery]);

  if (episodes.length === 0) {
    return (
      <EmptyState
        icon="checkmark-circle-outline"
        title={t("screens.home.noUnwatched")}
        subtitle={t("screens.home.noUnwatchedSubtitle")}
        actionLabel={t("screens.series.addBtn")}
        onAction={onAddPress}
      />
    );
  }

  if (__DEV__) {
    log("SeriesScreen:UnwatchedList", "flattened episodes", { count: episodes.length });
  }

  if (viewMode === "grid") {
    return (
      <FlatList
        key={`grid-${gridNumColumns}`}
        ref={listRef}
        data={episodes}
        keyExtractor={(item, index) => `${item.showId}-${item.episode.season}-${item.episode.episode}-${index}`}
        numColumns={gridNumColumns}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const epKey = `${item.showId}-${item.episode.season}-${item.episode.episode}`;
          return (
            <View style={{ width: cardWidth, marginBottom: 12 }}>
              <EpisodeCard
                posterPath={item.posterPath}
                title={item.title}
                season={item.episode.season}
                episode={item.episode.episode}
                episodeName={item.episode.name}
                isNew={item.isNew}
                airDate={item.episode.airDate}
                onPress={() => onEpisodePress(item)}
                onTitlePress={() => onTitlePress(item.tmdbId, item.title)}
                onMarkWatched={onMarkWatched ? () => onMarkWatched(item) : undefined}
                isMarking={markingEpisodeKey === epKey}
                width={cardWidth}
              />
            </View>
          );
        }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    );
  }

  return (
    <FlatList
      key="list"
      ref={listRef}
      data={episodes}
      keyExtractor={(item, index) => `${item.showId}-${item.episode.season}-${item.episode.episode}-${index}`}
      renderItem={({ item }) => {
        const epKey = `${item.showId}-${item.episode.season}-${item.episode.episode}`;
        return (
          <UnwatchedEpisodeRow
            showId={item.showId}
            tmdbId={item.tmdbId}
            title={item.title}
            posterPath={item.posterPath}
            episode={item.episode}
            isNew={item.isNew}
            onPress={() => onEpisodePress(item)}
            onTitlePress={() => onTitlePress(item.tmdbId, item.title)}
            onMarkWatched={onMarkWatched ? () => onMarkWatched(item) : undefined}
            isMarking={markingEpisodeKey === epKey}
          />
        );
      }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
