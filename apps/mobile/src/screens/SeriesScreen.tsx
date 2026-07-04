import { View, Text, FlatList, RefreshControl, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { TopTabs, TopTab } from "../components/TopTabs";
import { UpcomingEpisodeRow } from "../components/UpcomingEpisodeRow";
import { WeekSectionHeader } from "../components/WeekSectionHeader";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useUnwatchedShows } from "../hooks/useUnwatched";
import { useUpcomingEpisodes } from "../hooks/useUpcomingEpisodes";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { RootStackParamList } from "../navigation/RootNavigator";
import { UnwatchedShow } from "../services/unwatched.service";
import { UpcomingEpisode } from "../services/upcoming.service";
import { getPosterUrl } from "../services/shows.service";
import { colors } from "../theme/colors";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";

function getStatusLabel(t: ReturnType<typeof useI18n>["t"], status: UnwatchedShow["status"]): string {
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail" | "EpisodeDetail">;

function useTabs() {
  const { t } = useI18n();
  return [
    { key: "unwatched" as TopTab, label: t("navigation.unwatched") },
    { key: "upcoming" as TopTab, label: t("navigation.upcoming") },
  ];
}

function UnwatchedShowCard({
  show,
  onPress,
}: {
  show: UnwatchedShow;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const posterUrl = getPosterUrl(show.posterPath, 200);
  const episodeCount = show.unwatchedEpisodes.length;
  const isActive = show.status === "watching" && episodeCount > 0;

  log("SeriesScreen:UnwatchedShowCard", "render", {
    title: show.title,
    status: show.status,
    isEnded: show.isEnded,
    episodeCount,
    isActive,
  });

  return (
    <TouchableOpacity
      className={`flex-row items-center rounded-lg p-3 mb-3 active:opacity-70 ${
        isActive ? "bg-surface border-l-4 border-primary" : "bg-surface"
      }`}
      onPress={onPress}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          className="w-14 h-20 rounded-lg bg-surface-light"
          resizeMode="cover"
        />
      ) : (
        <View className="w-14 h-20 rounded-lg bg-surface-light items-center justify-center">
          <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className="text-text font-semibold mb-1" numberOfLines={1}>
          {show.title}
        </Text>
        {isActive ? (
          <View className="flex-row items-center">
            <Ionicons name="play-circle" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text className="text-primary text-sm font-medium">
              {episodeCount} {t("screens.showDetail.episodes").toLowerCase()} {t("screens.home.unwatched")}
            </Text>
          </View>
        ) : episodeCount > 0 ? (
          <Text className="text-text-muted text-sm">
            {episodeCount} {t("screens.showDetail.episodes").toLowerCase()} {t("screens.home.unwatched")}
          </Text>
        ) : show.status === "watching" && !show.isEnded ? (
          <View>
            <Text className="text-text font-medium text-sm">{t("screens.showDetail.inProgress")}</Text>
            <Text className="text-primary text-xs">{t("screens.home.upcoming")}</Text>
          </View>
        ) : (
          <Text className="text-text-muted text-sm">{getStatusLabel(t, show.status)}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function UnwatchedList({
  shows,
  upcomingShowIds,
  isLoading,
  refetch,
  onShowPress,
  onViewLibrary,
}: {
  shows: UnwatchedShow[];
  upcomingShowIds: Set<string>;
  isLoading: boolean;
  refetch: () => void;
  onShowPress: (show: UnwatchedShow) => void;
  onViewLibrary: () => void;
}) {
  const { t } = useI18n();
  if (shows.length === 0) {
    return (
      <EmptyState
        icon="tv-outline"
        title={t("screens.list.empty")}
        subtitle={t("screens.list.addFromSearch")}
      />
    );
  }

  log("SeriesScreen:UnwatchedList", "input shows", shows.map((s) => ({ showId: s.showId, title: s.title, status: s.status, isEnded: s.isEnded, unwatchedCount: s.unwatchedEpisodes.length })));
  log("SeriesScreen:UnwatchedList", "upcomingShowIds", Array.from(upcomingShowIds));

  const activeShows = shows
    .filter((s) => s.status === "watching" && (s.unwatchedEpisodes.length > 0 || upcomingShowIds.has(s.showId)))
    .sort((a, b) => b.unwatchedEpisodes.length - a.unwatchedEpisodes.length);

  const otherShows = shows
    .filter((s) => !(s.status === "watching" && (s.unwatchedEpisodes.length > 0 || upcomingShowIds.has(s.showId))) && s.unwatchedEpisodes.length > 0)
    .sort((a, b) => b.unwatchedEpisodes.length - a.unwatchedEpisodes.length);

  log("SeriesScreen:UnwatchedList", "activeShows", activeShows.map((s) => ({ title: s.title, unwatchedCount: s.unwatchedEpisodes.length, hasUpcoming: upcomingShowIds.has(s.showId) })));
  log("SeriesScreen:UnwatchedList", "otherShows", otherShows.map((s) => ({ title: s.title, status: s.status, isEnded: s.isEnded, unwatchedCount: s.unwatchedEpisodes.length })));

  const rows: { type: "header" | "show"; title?: string; show?: UnwatchedShow }[] = [];
  if (activeShows.length > 0) {
    rows.push({ type: "header", title: t("screens.showDetail.inProgress") });
    activeShows.forEach((s) => rows.push({ type: "show", show: s }));
  }
  if (otherShows.length > 0) {
    rows.push({ type: "header", title: t("screens.home.continueWatching") });
    otherShows.forEach((s) => rows.push({ type: "show", show: s }));
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item, index) => (item.type === "header" ? `header-${index}` : `${item.show?.showId}-${index}`)}
      renderItem={({ item }) => {
        if (item.type === "header") {
          return <WeekSectionHeader title={item.title ?? ""} />;
        }
        return <UnwatchedShowCard show={item.show!} onPress={() => onShowPress(item.show!)} />;
      }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListFooterComponent={
        <TouchableOpacity
          onPress={onViewLibrary}
          className="bg-card rounded-lg p-4 mt-4 items-center"
        >
          <Text className="text-primary font-semibold">{t("screens.series.viewAll")}</Text>
        </TouchableOpacity>
      }
    />
  );
}

function UpcomingList({
  data,
  isLoading,
  error,
  refetch,
  onEpisodePress,
}: {
  data: { today: UpcomingEpisode[]; thisWeek: UpcomingEpisode[]; nextWeek: UpcomingEpisode[]; later: UpcomingEpisode[] } | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  onEpisodePress: (episode: UpcomingEpisode) => void;
}) {
  const { t } = useI18n();
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
        return (
          <UpcomingEpisodeRow
            episode={item.episode!}
            onPress={() => onEpisodePress(item.episode!)}
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
  const tabs = useTabs();
  const [activeTab, setActiveTab] = useState<TopTab>("unwatched");
  const { data: unwatchedData, isLoading: isUnwatchedLoading, isError: isUnwatchedError, error: unwatchedError, refetch: refetchUnwatched } = useUnwatchedShows();
  const { data: upcomingData, isLoading: isUpcomingLoading, isError: _isUpcomingError, error: upcomingError, refetch: refetchUpcoming } = useUpcomingEpisodes();
  const throttledRefreshUnwatched = useRefreshRateLimit();
  const throttledRefreshUpcoming = useRefreshRateLimit();

  const upcomingShowIds = useMemo(() => {
    if (!upcomingData) return new Set<string>();
    const all = [
      ...upcomingData.today,
      ...upcomingData.thisWeek,
      ...upcomingData.nextWeek,
      ...upcomingData.later,
    ];
    return new Set(all.map((ep) => ep.showId));
  }, [upcomingData]);

  log("SeriesScreen", "state", {
    activeTab,
    unwatchedCount: unwatchedData?.shows.length ?? 0,
    isUnwatchedLoading,
    isUnwatchedError,
    upcomingKeys: upcomingData ? Object.keys(upcomingData) : null,
  });

  function handleShowPress(show: UnwatchedShow) {
    if (!show.tmdbId) return;
    navigation.navigate("ShowDetail", {
      tmdbId: show.tmdbId,
      title: show.title,
    });
  }

  function handleViewLibrary() {
    navigation.navigate("Library");
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
              upcomingShowIds={upcomingShowIds}
              isLoading={isUnwatchedLoading}
              refetch={() => throttledRefreshUnwatched(refetchUnwatched)}
              onShowPress={handleShowPress}
              onViewLibrary={handleViewLibrary}
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
          />
        </View>
      )}
    </ScreenContainer>
  );
}
