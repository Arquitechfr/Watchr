import { View, Text, FlatList, RefreshControl, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState, useEffect } from "react";
import { ScreenContainer } from "../components/ScreenContainer";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { getLibrary, LibraryItem } from "../services/library.service";
import { getPosterUrl } from "../services/shows.service";
import { colors } from "../theme/colors";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

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
      </View>
    </TouchableOpacity>
  );
}

export function LibraryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<LibraryTab>("tv");
  const [data, setData] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchLibrary = async (tab: LibraryTab, pageNum = 1, isRefresh = false) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const response = await getLibrary(tab, pageNum, 20);
      if (isRefresh || pageNum === 1) {
        setData(response.data);
      } else {
        setData((prev) => [...prev, ...response.data]);
      }
      setHasMore(pageNum < response.pagination.pages);
      setPage(pageNum);
    } catch (err) {
      setIsError(true);
      setError(err as Error);
      log("LibraryScreen", "fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLibrary(activeTab, 1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchLibrary(activeTab, page + 1, false);
    }
  };

  const handleItemPress = (item: LibraryItem) => {
    navigation.navigate("ShowDetail", { tmdbId: item.show.tmdbId, title: item.show.title });
  };

  const handleTabChange = (tab: LibraryTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setData([]);
      setPage(1);
      setHasMore(true);
      fetchLibrary(tab, 1, true);
    }
  };

  useEffect(() => {
    fetchLibrary(activeTab, 1, true);
  }, []);

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-text mb-4">{t("navigation.library")}</Text>

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
        ) : data.length === 0 ? (
          <EmptyState
            icon="film-outline"
            title={t("screens.library.emptyTitle")}
          />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <LibraryItemCard item={item} onPress={() => handleItemPress(item)} />
            )}
            refreshControl={<RefreshControl refreshing={isLoading && page === 1} onRefresh={handleRefresh} tintColor={colors.primary} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
