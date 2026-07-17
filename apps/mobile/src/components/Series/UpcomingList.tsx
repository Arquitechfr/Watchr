import { View, FlatList, RefreshControl } from "react-native";
import { EmptyState } from "../EmptyState";
import { NetworkError } from "../NetworkError";
import { Skeleton } from "../Skeleton";
import { EpisodeCard } from "../EpisodeCard";
import { UpcomingEpisodeRow } from "../UpcomingEpisodeRow";
import { WeekSectionHeader } from "../WeekSectionHeader";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { getNetworkErrorVariant } from "../../services/api";
import type { UpcomingEpisode } from "../../services/upcoming.service";

interface UpcomingListProps {
  data: { today: UpcomingEpisode[]; thisWeek: UpcomingEpisode[]; nextWeek: UpcomingEpisode[]; later: UpcomingEpisode[] } | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  onEpisodePress: (episode: UpcomingEpisode) => void;
  onTitlePress: (tmdbId: number, title: string) => void;
  onMarkWatched?: (episode: UpcomingEpisode) => void;
  markingEpisodeKey?: string;
  viewMode: "list" | "grid";
  cardWidth: number;
  gridNumColumns: number;
  searchQuery: string;
  listRef: React.RefObject<FlatList | null>;
  onAddPress: () => void;
}

export function UpcomingList({
  data,
  isLoading,
  error,
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
}: UpcomingListProps) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const filterByQuery = (eps: UpcomingEpisode[]): UpcomingEpisode[] => {
    if (searchQuery.trim().length >= 3) {
      const q = searchQuery.trim().toLowerCase();
      return eps.filter((ep) => ep.title.toLowerCase().includes(q));
    }
    return eps;
  };

  if (isLoading) {
    return (
      <View>
        {[...Array(5)].map((_, index) => (
          <Skeleton key={index} width="100%" height={80} className="mb-2" borderRadius={8} />
        ))}
      </View>
    );
  }

  if (error) {
    return <NetworkError variant={getNetworkErrorVariant(error)} onRetry={() => refetch()} />;
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
          icon="calendar-outline"
          title={t("screens.upcoming.empty")}
          subtitle={t("screens.upcoming.emptySubtitle")}
          actionLabel={t("screens.series.addBtn")}
          onAction={onAddPress}
        />
      );
    }

    const todayEps = filterByQuery(data?.today ?? []);
    const todayKeys = new Set(todayEps.map((ep) => `${ep.showId}-${ep.season}-${ep.episode}`));

    return (
      <FlatList
        key={`grid-${gridNumColumns}`}
        ref={listRef}
        data={allEpisodes}
        keyExtractor={(item, index) => `${item.showId}-${item.season}-${item.episode}-${index}`}
        numColumns={gridNumColumns}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const epKey = `${item.showId}-${item.season}-${item.episode}`;
          return (
            <View style={{ width: cardWidth, marginBottom: 12 }}>
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
                onTitlePress={() => onTitlePress(item.tmdbId, item.title)}
                onMarkWatched={onMarkWatched ? () => onMarkWatched(item) : undefined}
                isMarking={markingEpisodeKey === epKey}
                width={cardWidth}
              />
            </View>
          );
        }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
      />
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
        icon="calendar-outline"
        title={t("screens.upcoming.empty")}
        subtitle={t("screens.upcoming.emptySubtitle")}
        actionLabel={t("screens.series.addBtn")}
        onAction={onAddPress}
      />
    );
  }

  return (
    <FlatList
      key="list"
      ref={listRef}
      data={rows}
      keyExtractor={(item, index) => (item.type === "header" ? `header-${index}` : `${item.episode?.showId}-${index}`)}
      renderItem={({ item }) => {
        if (item.type === "header") {
          return <WeekSectionHeader title={item.title ?? ""} count={item.count} />;
        }
        const ep = item.episode!;
        const epKey = `${ep.showId}-${ep.season}-${ep.episode}`;
        const isNew = today.some((e) => `${e.showId}-${e.season}-${e.episode}` === epKey);
        return (
          <UpcomingEpisodeRow
            episode={ep}
            isNew={isNew}
            onPress={() => onEpisodePress(ep)}
            onTitlePress={() => onTitlePress(ep.tmdbId, ep.title)}
            onMarkWatched={onMarkWatched ? () => onMarkWatched(ep) : undefined}
            isMarking={markingEpisodeKey === epKey}
          />
        );
      }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
    />
  );
}
