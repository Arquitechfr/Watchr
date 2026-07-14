import { View, Text, FlatList, RefreshControl, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useScrollToTop, CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState, useEffect, useRef } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { TopTabs, TopTab } from "../components/TopTabs";
import { UpcomingEpisodeRow } from "../components/UpcomingEpisodeRow";
import { UnwatchedEpisodeRow } from "../components/UnwatchedEpisodeRow";
import { WeekSectionHeader } from "../components/WeekSectionHeader";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { EpisodeCard } from "../components/EpisodeCard";
import { SearchBar } from "../components/SearchBar";
import { MainHeader } from "../components/MainHeader";
import { useUnwatchedShows } from "../hooks/useUnwatched";
import { useUpcomingEpisodes } from "../hooks/useUpcomingEpisodes";
import { useQuickMarkWatched } from "../hooks/useTracking";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useWidgetSync } from "../hooks/useWidgetSync";
import { useUIStore } from "../store/uiStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { UnwatchedShow, UnwatchedEpisode } from "../services/unwatched.service";
import { UpcomingEpisode } from "../services/upcoming.service";
import { isNetworkError } from "../services/api";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { Seo } from "../components/Seo";
import { ImportProgressBanner } from "../components/ImportProgressBanner";
import { log } from "../utils/logger";

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<{ Search: undefined }>,
  NativeStackNavigationProp<RootStackParamList, "ShowDetail" | "EpisodeDetail">
>;

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
    { key: "unwatched" as TopTab, label: t("navigation.unwatched") },
    { key: "upcoming" as TopTab, label: t("navigation.upcoming") },
  ];
}

function UnwatchedList({
  shows,
  isLoading,
  refetch,
  onEpisodePress,
  onTitlePress,
  onMarkWatched,
  markingEpisodeKey,
  viewMode,
  cardWidth,
  searchQuery,
  listRef,
  onAddPress,
}: {
  shows: UnwatchedShow[];
  isLoading: boolean;
  refetch: () => void;
  onEpisodePress: (item: FlattenedEpisode) => void;
  onTitlePress: (tmdbId: number, title: string) => void;
  onMarkWatched?: (item: FlattenedEpisode) => void;
  markingEpisodeKey?: string;
  viewMode: "list" | "grid";
  cardWidth: number;
  searchQuery: string;
  listRef: React.RefObject<FlatList | null>;
  onAddPress: () => void;
}) {
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
        key="grid"
        ref={listRef}
        data={episodes}
        keyExtractor={(item, index) => `${item.showId}-${item.episode.season}-${item.episode.episode}-${index}`}
        numColumns={3}
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

function UpcomingList({
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
  searchQuery,
  listRef,
  onAddPress,
}: {
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
  searchQuery: string;
  listRef: React.RefObject<FlatList | null>;
  onAddPress: () => void;
}) {
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
    return <NetworkError isOffline={isNetworkError(error)} onRetry={() => refetch()} />;
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
        key="grid"
        ref={listRef}
        data={allEpisodes}
        keyExtractor={(item, index) => `${item.showId}-${item.season}-${item.episode}-${index}`}
        numColumns={3}
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
        contentContainerStyle={{ paddingBottom: 24 }}
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
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

export function SeriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const colors = useThemeColors();
  const showSnackbar = useUIStore((state) => state.showSnackbar);
  const libraryViewMode = useUIStore((state) => state.libraryViewMode);
  const hydrateLibraryViewMode = useUIStore((state) => state.hydrateLibraryViewMode);
  const { width: windowWidth } = useWindowDimensions();
  const tabs = useTabs();
  const flatListRef = useRef<FlatList>(null);
  useScrollToTop(flatListRef);
  const [activeTab, setActiveTab] = useState<TopTab>("unwatched");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    hydrateLibraryViewMode();
  }, []);

  const gridNumColumns = 3;
  const gridGap = 12;
  const gridPadding = 16;
  const cardWidth = (windowWidth - gridPadding * 2 - gridGap * (gridNumColumns - 1)) / gridNumColumns;
  const { data: unwatchedData, isLoading: isUnwatchedLoading, isError: isUnwatchedError, error: unwatchedError, refetch: refetchUnwatched } = useUnwatchedShows();
  const { data: upcomingData, isLoading: isUpcomingLoading, isError: _isUpcomingError, error: upcomingError, refetch: refetchUpcoming } = useUpcomingEpisodes();
  const quickMarkWatched = useQuickMarkWatched();
  const throttledRefreshUnwatched = useRefreshRateLimit();
  const throttledRefreshUpcoming = useRefreshRateLimit();
  useWidgetSync();

  const markingEpisodeKey = quickMarkWatched.isPending && quickMarkWatched.variables
    ? `${quickMarkWatched.variables.showId}-${quickMarkWatched.variables.season}-${quickMarkWatched.variables.episode}`
    : undefined;

  if (__DEV__) {
    log("SeriesScreen", "state", {
      activeTab,
      unwatchedCount: unwatchedData?.shows.length ?? 0,
      isUnwatchedLoading,
      isUnwatchedError,
      upcomingKeys: upcomingData ? Object.keys(upcomingData) : null,
    });
  }

  function handleEpisodePress(item: FlattenedEpisode) {
    if (!item.tmdbId) return;
    navigation.navigate("EpisodeDetail", {
      showId: item.showId,
      tmdbId: item.tmdbId,
      season: item.episode.season,
      episodeNumber: item.episode.episode,
      title: item.title,
    });
  }

  function handleTitlePress(tmdbId: number, title: string) {
    if (!tmdbId) return;
    navigation.navigate("ShowDetail", { tmdbId, title });
  }

  function handleViewLibrary() {
    navigation.navigate("Library", { tab: "tv" });
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
    navigation.navigate("EpisodeDetail", {
      showId: episode.showId,
      tmdbId: episode.tmdbId,
      season: episode.season,
      episodeNumber: episode.episode,
      title: episode.title,
    });
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Seo title={t("seo.series")} />
      <MainHeader
        rightElement={
          <>
            <TouchableOpacity onPress={() => setIsSearchVisible(!isSearchVisible)} className="p-1">
              <Ionicons name={isSearchVisible ? "search" : "search-outline"} size={24} color={colors.text} />
            </TouchableOpacity>
            <ViewModeToggle />
          </>
        }
      />

      <ImportProgressBanner />

      {isSearchVisible && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("screens.series.searchPlaceholder")}
          onClose={() => {
            setSearchQuery("");
            setIsSearchVisible(false);
          }}
        />
      )}

      <TopTabs tabs={tabs} active={activeTab} onChange={(tab) => {
        log("SeriesScreen", "tab changed", tab);
        setActiveTab(tab);
        if (tab === "unwatched") {
          throttledRefreshUnwatched(refetchUnwatched);
        } else if (tab === "upcoming") {
          throttledRefreshUpcoming(refetchUpcoming);
        }
      }} />

      {activeTab === "unwatched" && (
        <View className="flex-1">
          {isUnwatchedLoading ? (
            <View>
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} width="100%" height={80} className="mb-2" borderRadius={8} />
              ))}
            </View>
          ) : isUnwatchedError ? (
            <NetworkError isOffline={isNetworkError(unwatchedError)} onRetry={() => refetchUnwatched()} />
          ) : (
            <UnwatchedList
              shows={unwatchedData?.shows ?? []}
              isLoading={isUnwatchedLoading}
              refetch={() => throttledRefreshUnwatched(refetchUnwatched)}
              onEpisodePress={handleEpisodePress}
              onTitlePress={handleTitlePress}
              onMarkWatched={handleMarkUnwatchedEpisode}
              markingEpisodeKey={markingEpisodeKey}
              viewMode={libraryViewMode}
              cardWidth={cardWidth}
              searchQuery={searchQuery}
              listRef={flatListRef}
              onAddPress={() => navigation.navigate("Search")}
            />
          )}
        </View>
      )}

      {activeTab === "upcoming" && (
        <View className="flex-1">
          <UpcomingList
            data={upcomingData}
            isLoading={isUpcomingLoading}
            error={upcomingError}
            refetch={() => throttledRefreshUpcoming(refetchUpcoming)}
            onEpisodePress={handleUpcomingPress}
            onTitlePress={handleTitlePress}
            onMarkWatched={handleMarkUpcomingWatched}
            markingEpisodeKey={markingEpisodeKey}
            viewMode={libraryViewMode}
            cardWidth={cardWidth}
            searchQuery={searchQuery}
            listRef={flatListRef}
            onAddPress={() => navigation.navigate("Search")}
          />
        </View>
      )}

      <TouchableOpacity
        onPress={handleViewLibrary}
        className="bg-card rounded-lg p-4 mb-4 items-center"
      >
        <Text className="text-primary font-semibold">{t("screens.series.viewAll")}</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
