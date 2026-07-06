import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { TopTabs, TopTab } from "../components/TopTabs";
import { UpcomingEpisodeRow } from "../components/UpcomingEpisodeRow";
import { UnwatchedEpisodeRow } from "../components/UnwatchedEpisodeRow";
import { WeekSectionHeader } from "../components/WeekSectionHeader";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useUnwatchedShows } from "../hooks/useUnwatched";
import { useUpcomingEpisodes } from "../hooks/useUpcomingEpisodes";
import { useQuickMarkWatched } from "../hooks/useTracking";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useUIStore } from "../store/uiStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { UnwatchedShow, UnwatchedEpisode } from "../services/unwatched.service";
import { UpcomingEpisode } from "../services/upcoming.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail" | "EpisodeDetail">;

interface FlattenedEpisode {
  showId: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  episode: UnwatchedEpisode;
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
  onMarkWatched,
  markingEpisodeKey,
}: {
  shows: UnwatchedShow[];
  isLoading: boolean;
  refetch: () => void;
  onEpisodePress: (item: FlattenedEpisode) => void;
  onMarkWatched?: (item: FlattenedEpisode) => void;
  markingEpisodeKey?: string;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();

  const episodes = useMemo(() => {
    const flat: FlattenedEpisode[] = shows.flatMap((show) =>
      show.unwatchedEpisodes.map((ep) => ({
        showId: show.showId,
        tmdbId: show.tmdbId,
        title: show.title,
        posterPath: show.posterPath,
        episode: ep,
      })),
    );
    flat.sort((a, b) => {
      const aDate = a.episode.airDate ? new Date(a.episode.airDate).getTime() : 0;
      const bDate = b.episode.airDate ? new Date(b.episode.airDate).getTime() : 0;
      return bDate - aDate;
    });
    return flat;
  }, [shows]);

  if (episodes.length === 0) {
    return (
      <EmptyState
        icon="checkmark-circle-outline"
        title={t("screens.home.noUnwatched")}
      />
    );
  }

  log("SeriesScreen:UnwatchedList", "flattened episodes", { count: episodes.length });

  return (
    <FlatList
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
            onPress={() => onEpisodePress(item)}
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
  onMarkWatched,
  markingEpisodeKey,
}: {
  data: { today: UpcomingEpisode[]; thisWeek: UpcomingEpisode[]; nextWeek: UpcomingEpisode[]; later: UpcomingEpisode[] } | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  onEpisodePress: (episode: UpcomingEpisode) => void;
  onMarkWatched?: (episode: UpcomingEpisode) => void;
  markingEpisodeKey?: string;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
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
    return <NetworkError isOffline={!("response" in error)} onRetry={() => refetch()} />;
  }

  const rows: { type: "header" | "episode"; title?: string; episode?: UpcomingEpisode }[] = [];
  if ((data?.today.length ?? 0) > 0) {
    rows.push({ type: "header", title: t("screens.upcoming.today") });
    data?.today.forEach((ep) => rows.push({ type: "episode", episode: ep }));
  }
  if ((data?.thisWeek.length ?? 0) > 0) {
    rows.push({ type: "header", title: t("screens.upcoming.thisWeek") });
    data?.thisWeek.forEach((ep) => rows.push({ type: "episode", episode: ep }));
  }
  if ((data?.nextWeek.length ?? 0) > 0) {
    rows.push({ type: "header", title: t("screens.upcoming.nextWeek") });
    data?.nextWeek.forEach((ep) => rows.push({ type: "episode", episode: ep }));
  }
  if ((data?.later.length ?? 0) > 0) {
    rows.push({ type: "header", title: t("screens.upcoming.later") });
    data?.later.forEach((ep) => rows.push({ type: "episode", episode: ep }));
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title={t("screens.upcoming.empty")}
        subtitle={t("screens.upcoming.emptySubtitle")}
      />
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item, index) => (item.type === "header" ? `header-${index}` : `${item.episode?.showId}-${index}`)}
      renderItem={({ item }) => {
        if (item.type === "header") {
          return <WeekSectionHeader title={item.title ?? ""} />;
        }
        const ep = item.episode!;
        const epKey = `${ep.showId}-${ep.season}-${ep.episode}`;
        return (
          <UpcomingEpisodeRow
            episode={ep}
            onPress={() => onEpisodePress(ep)}
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
  const showSnackbar = useUIStore((state) => state.showSnackbar);
  const tabs = useTabs();
  const [activeTab, setActiveTab] = useState<TopTab>("unwatched");
  const { data: unwatchedData, isLoading: isUnwatchedLoading, isError: isUnwatchedError, error: unwatchedError, refetch: refetchUnwatched } = useUnwatchedShows();
  const { data: upcomingData, isLoading: isUpcomingLoading, isError: _isUpcomingError, error: upcomingError, refetch: refetchUpcoming } = useUpcomingEpisodes();
  const quickMarkWatched = useQuickMarkWatched();
  const throttledRefreshUnwatched = useRefreshRateLimit();
  const throttledRefreshUpcoming = useRefreshRateLimit();

  const markingEpisodeKey = quickMarkWatched.isPending && quickMarkWatched.variables
    ? `${quickMarkWatched.variables.showId}-${quickMarkWatched.variables.season}-${quickMarkWatched.variables.episode}`
    : undefined;

  log("SeriesScreen", "state", {
    activeTab,
    unwatchedCount: unwatchedData?.shows.length ?? 0,
    isUnwatchedLoading,
    isUnwatchedError,
    upcomingKeys: upcomingData ? Object.keys(upcomingData) : null,
  });

  function handleEpisodePress(item: FlattenedEpisode) {
    if (!item.tmdbId) return;
    navigation.navigate("ShowDetail", {
      tmdbId: item.tmdbId,
      title: item.title,
    });
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
    navigation.navigate("ShowDetail", {
      tmdbId: episode.tmdbId,
      title: episode.title,
    });
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-text mb-4">{t("navigation.series")}</Text>

      <TopTabs tabs={tabs} active={activeTab} onChange={(tab) => {
        log("SeriesScreen", "tab changed", tab);
        setActiveTab(tab);
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
            <NetworkError isOffline={!unwatchedError || !("response" in unwatchedError)} onRetry={() => refetchUnwatched()} />
          ) : (
            <UnwatchedList
              shows={unwatchedData?.shows ?? []}
              isLoading={isUnwatchedLoading}
              refetch={() => throttledRefreshUnwatched(refetchUnwatched)}
              onEpisodePress={handleEpisodePress}
              onMarkWatched={handleMarkUnwatchedEpisode}
              markingEpisodeKey={markingEpisodeKey}
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
            onMarkWatched={handleMarkUpcomingWatched}
            markingEpisodeKey={markingEpisodeKey}
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
