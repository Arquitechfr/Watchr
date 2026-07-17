import { View, Text, FlatList, TouchableOpacity, useWindowDimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useScrollToTop, CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState, useEffect, useRef } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { SegmentedControl } from "../components/SegmentedControl";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { SearchBar } from "../components/SearchBar";
import { MainHeader } from "../components/MainHeader";
import { UnwatchedList, type FlattenedEpisode } from "../components/Series/UnwatchedList";
import { UpcomingList } from "../components/Series/UpcomingList";
import { useUnwatchedShows } from "../hooks/useUnwatched";
import { useUpcomingEpisodes } from "../hooks/useUpcomingEpisodes";
import { useQuickMarkWatched } from "../hooks/useTracking";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useWidgetSync } from "../hooks/useWidgetSync";
import { useUIStore } from "../store/uiStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { UpcomingEpisode } from "../services/upcoming.service";
import { isNetworkError } from "../services/api";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { Seo } from "../components/Seo";
import { ImportProgressBanner } from "../components/ImportProgressBanner";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { log } from "../utils/logger";

type TopTab = "unwatched" | "upcoming";

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<{ Search: undefined }>,
  NativeStackNavigationProp<RootStackParamList, "ShowDetail" | "EpisodeDetail">
>;

function useTabs() {
  const { t } = useI18n();
  return [
    { key: "unwatched" as TopTab, label: t("navigation.unwatched") },
    { key: "upcoming" as TopTab, label: t("navigation.upcoming") },
  ];
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

  const breakpoint = useBreakpoint();
  const isDesktopWeb = Platform.OS === "web" && breakpoint !== "mobile";
  const gridNumColumns = breakpoint === "wide" ? 7 : breakpoint === "desktop" ? 6 : isDesktopWeb ? 5 : 3;
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
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
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

      <SegmentedControl options={tabs} active={activeTab} onChange={(tab) => {
        log("SeriesScreen", "tab changed", tab);
        setActiveTab(tab as TopTab);
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
              gridNumColumns={gridNumColumns}
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
            gridNumColumns={gridNumColumns}
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
