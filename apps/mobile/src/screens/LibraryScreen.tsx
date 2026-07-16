import { View, Text, FlatList, RefreshControl, TouchableOpacity, Image, useWindowDimensions, Platform, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { MainHeader } from "../components/MainHeader";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { PosterCard } from "../components/PosterCard";
import { ProgressBar } from "../components/ProgressBar";
import { SegmentedControl } from "../components/SegmentedControl";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { LibraryItem } from "../services/library.service";
import { useLibrary } from "../hooks/useLibrary";
import { getPosterUrl, SearchResultItem } from "../services/shows.service";
import { WatchStatus } from "../services/tracking.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useI18n } from "../i18n/useI18n";
import { useUIStore } from "../store/uiStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { Seo } from "../components/Seo";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;
type LibraryRoute = RouteProp<RootStackParamList, "Library">;

type LibraryTab = "tv" | "movie";
type StatusFilter = "all" | WatchStatus;
type SortMode = "recent" | "title" | "progress";

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const {
    data: libraryData,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLibrary(activeTab, statusFilter === "all" ? undefined : statusFilter);

  const rawData: LibraryItem[] = libraryData?.pages.flatMap((page) => page.data) ?? [];

  const data = useMemo(() => {
    let filtered = rawData;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => item.show.title.toLowerCase().includes(q));
    }
    const sorted = [...filtered];
    switch (sortMode) {
      case "title":
        sorted.sort((a, b) => a.show.title.localeCompare(b.show.title));
        break;
      case "progress":
        sorted.sort((a, b) => {
          const aProgress = a.show.totalEpisodes ? a.watchedEpisodes.length / a.show.totalEpisodes : 0;
          const bProgress = b.show.totalEpisodes ? b.watchedEpisodes.length / b.show.totalEpisodes : 0;
          return bProgress - aProgress;
        });
        break;
      case "recent":
      default:
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }
    return sorted;
  }, [rawData, searchQuery, sortMode]);

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

  const isDesktopWeb = Platform.OS === "web" && windowWidth >= 768;
  const gridNumColumns = isDesktopWeb ? 5 : 3;
  const gridGap = 12;
  const gridPadding = 16;
  const gridCardWidth = (windowWidth - gridPadding * 2 - gridGap * (gridNumColumns - 1)) / gridNumColumns;

  const statusOptions: { key: StatusFilter; label: string }[] = [
    { key: "all", label: t("screens.library.filterAll") },
    { key: "watching", label: t("screens.showDetail.inProgress") },
    { key: "completed", label: t("screens.showDetail.completed") },
    { key: "plan_to_watch", label: t("screens.showDetail.planToWatch") },
    { key: "dropped", label: t("screens.showDetail.dropped") },
  ];

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: "recent", label: t("screens.library.sortRecent") },
    { key: "title", label: t("screens.library.sortTitle") },
    { key: "progress", label: t("screens.library.sortProgress") },
  ];

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.library")} />
      <MainHeader rightElement={<ViewModeToggle />} />

      <SegmentedControl
        options={[
          { key: "tv", label: t("navigation.series") },
          { key: "movie", label: t("navigation.movies") },
        ]}
        active={activeTab}
        onChange={(key) => handleTabChange(key as LibraryTab)}
      />

      {/* Search + Filter toggle row */}
      <View className="flex-row items-center mt-3 mb-2">
        <View className="flex-1 flex-row items-center bg-surface rounded-lg px-3 py-2 border border-border mr-2">
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            className="flex-1 text-text ml-2 text-sm"
            placeholder={t("screens.library.searchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="ml-1 p-0.5">
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          className="flex-row items-center bg-surface rounded-lg px-3 py-2 border border-border"
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={18} color={showFilters ? colors.primary : colors.text} />
          <Text className="text-text ml-1.5 text-sm font-medium">{t("screens.library.filters")}</Text>
        </TouchableOpacity>
      </View>

      {/* Expandable filters */}
      {showFilters && (
        <View className="mb-3">
          <Text className="text-text-muted text-xs uppercase tracking-wider mb-2 mt-2">{t("screens.library.filterByStatus")}</Text>
          <SegmentedControl
            options={statusOptions}
            active={statusFilter}
            onChange={(key) => setStatusFilter(key as StatusFilter)}
          />
          <Text className="text-text-muted text-xs uppercase tracking-wider mb-2 mt-3">{t("screens.library.sortBy")}</Text>
          <SegmentedControl
            options={sortOptions}
            active={sortMode}
            onChange={(key) => setSortMode(key as SortMode)}
          />
        </View>
      )}

      <View className="flex-1 mt-2">
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
            title={searchQuery || statusFilter !== "all" ? t("screens.library.noResults") : t("screens.library.emptyTitle")}
            subtitle={searchQuery || statusFilter !== "all" ? t("screens.library.noResultsSubtitle") : t("screens.library.emptySubtitle")}
            actionLabel={searchQuery || statusFilter !== "all" ? undefined : t("screens.library.addBtn")}
            onAction={searchQuery || statusFilter !== "all" ? undefined : () => navigation.navigate("Main", { screen: "Search" })}
          />
        ) : libraryViewMode === "grid" ? (
          <FlatList
            key={`grid-flatlist-${gridNumColumns}`}
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
