import { View, Text, FlatList, RefreshControl, TouchableOpacity, Image, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState, useEffect, useCallback } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { MainHeader } from "../components/MainHeader";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { PosterCard } from "../components/PosterCard";
import { ProgressBar } from "../components/ProgressBar";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { LibraryItem } from "../services/library.service";
import { useLibrary } from "../hooks/useLibrary";
import { getPosterUrl, SearchResultItem } from "../services/shows.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { useUIStore } from "../store/uiStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { Seo } from "../components/Seo";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;
type LibraryRoute = RouteProp<RootStackParamList, "Library">;

type LibraryTab = "tv" | "movie";

function LibraryTabs({ active, onChange }: { active: LibraryTab; onChange: (tab: LibraryTab) => void }) {
  const { t } = useI18n();
  const tabs = [
    { key: "tv" as LibraryTab, label: t("navigation.series") },
    { key: "movie" as LibraryTab, label: t("navigation.movies") },
  ];

  return (
    <View className="flex-row bg-muted rounded-lg p-1">
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onChange(tab.key)}
          className={`flex-1 py-2 rounded-md ${active === tab.key ? "bg-primary" : ""}`}
        >
          <Text
            className={`text-center text-sm font-medium ${
              active === tab.key ? "text-white" : "text-text-muted"
            }`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
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
    <TouchableOpacity
      onPress={onPress}
      className="flex-row bg-card rounded-lg p-3 mb-3"
      style={{ gap: 12 }}
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          className="w-16 h-24 rounded"
          resizeMode="cover"
        />
      ) : (
        <View className="w-16 h-24 rounded bg-muted items-center justify-center">
          <Text className="text-text-muted text-xs">No poster</Text>
        </View>
      )}
      <View className="flex-1 justify-center">
        <Text className="text-text font-semibold text-base mb-1" numberOfLines={2}>
          {item.show.title}
        </Text>
        <Text className="text-text-muted text-sm mb-1">{getStatusLabel()}</Text>
        {item.show.type === "tv" && item.watchedEpisodes.length > 0 && (
          <Text className="text-text-muted text-xs">
            {t("screens.showDetail.episodesWatched", { count: item.watchedEpisodes.length })}
          </Text>
        )}
        {item.show.type === "tv" && (
          <View className="mt-2">
            <ProgressBar watched={item.watchedEpisodes.length} total={item.show.totalEpisodes ?? 0} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function LibraryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LibraryRoute>();
  const { t } = useI18n();
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const libraryViewMode = useUIStore((state) => state.libraryViewMode);
  const hydrateLibraryViewMode = useUIStore((state) => state.hydrateLibraryViewMode);
  const [activeTab, setActiveTab] = useState<LibraryTab>(route.params?.tab ?? "tv");

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

  const data: LibraryItem[] = libraryData?.pages.flatMap((page) => page.data) ?? [];

  const handleRefresh = () => {
    refetch();
  };

  const handleLoadMore = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  };

  const handleItemPress = (item: LibraryItem) => {
    navigation.navigate("ShowDetail", { tmdbId: item.show.tmdbId, title: item.show.title });
  };

  const handleTabChange = (tab: LibraryTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    hydrateLibraryViewMode();
  }, []);

  const toSearchResultItem = useCallback((item: LibraryItem): SearchResultItem => ({
    tmdbId: item.show.tmdbId,
    type: item.show.type,
    title: item.show.title,
    posterPath: item.show.posterPath ?? undefined,
    source: "tmdb",
  }), []);

  const gridNumColumns = 3;
  const gridGap = 12;
  const gridPadding = 16;
  const gridCardWidth = (windowWidth - gridPadding * 2 - gridGap * (gridNumColumns - 1)) / gridNumColumns;

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Seo title={t("seo.library")} />
      <MainHeader rightElement={<ViewModeToggle />} />

      <LibraryTabs active={activeTab} onChange={handleTabChange} />

      <View className="flex-1 mt-4">
        {isLoading && data.length === 0 ? (
          <View>
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} width="100%" height={80} className="mb-3" borderRadius={8} />
            ))}
          </View>
        ) : isError ? (
          <NetworkError isOffline={!error || !("response" in error)} onRetry={handleRefresh} />
        ) : !isFetchingNextPage && data.length === 0 ? (
          <EmptyState
            icon="film-outline"
            title={t("screens.library.emptyTitle")}
          />
        ) : libraryViewMode === "grid" ? (
          <FlatList
            key="grid-flatlist"
            data={data}
            keyExtractor={(item) => item.id}
            numColumns={gridNumColumns}
            columnWrapperStyle={{ gap: gridGap }}
            renderItem={({ item }) => (
              <View style={{ width: gridCardWidth, marginBottom: gridGap }}>
                <PosterCard
                  show={toSearchResultItem(item)}
                  onPress={() => handleItemPress(item)}
                  watched={item.show.type === "tv" ? item.watchedEpisodes.length : undefined}
                  total={item.show.type === "tv" ? item.show.totalEpisodes : undefined}
                  width={gridCardWidth}
                />
              </View>
            )}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        ) : (
          <FlatList
            key="list-flatlist"
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <LibraryItemCard item={item} onPress={() => handleItemPress(item)} />
            )}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
