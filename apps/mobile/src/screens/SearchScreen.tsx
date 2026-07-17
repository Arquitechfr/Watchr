import { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useScrollToTop } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShowSearch } from "../hooks/useShowSearch";
import { useDiscoverSections } from "../hooks/useDiscover";
import { useQuickAddToWatchlist, useTrackedTmdbIds } from "../hooks/useTracking";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { ShowCard } from "../components/ShowCard";
import { DiscoverSectionRow } from "../components/DiscoverSectionRow";
import { RecommendationsRow } from "../components/RecommendationsRow";
import { MoodPicker } from "../components/MoodPicker";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { ShowCardSkeleton, Skeleton } from "../components/Skeleton";
import { ScreenContainer } from "../components/ScreenContainer";
import { MainHeader } from "../components/MainHeader";
import { SearchBar } from "../components/SearchBar";
import { useThemeColors } from "../theme/useThemeColors";
import { RootStackParamList } from "../navigation/RootNavigator";
import { SearchResultItem, DiscoverSection, MoodRecommendation } from "../services/shows.service";
import { getNetworkErrorVariant } from "../services/api";
import { useUIStore } from "../store/uiStore";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";
import { useMoodRecommendations } from "../hooks/useMoodRecommendations";
import { useRecommendations } from "../hooks/useAIShows";
import { useSemanticSearch } from "../hooks/useSemanticSearch";
import { Seo } from "../components/Seo";
import { RecentSearches } from "../components/RecentSearches";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView | FlatList>(null);
  useScrollToTop(scrollRef as React.RefObject<ScrollView | FlatList | null>);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useShowSearch(debouncedQuery);
  const {
    data: discoverData,
    isLoading: isDiscoverLoading,
    isError: isDiscoverError,
    error: discoverError,
    refetch: refetchDiscover,
  } = useDiscoverSections();
  const quickAdd = useQuickAddToWatchlist();
  const { data: trackedTmdbIdsData } = useTrackedTmdbIds();
  const trackedTmdbIds = new Set(trackedTmdbIdsData ?? []);
  const throttledRefresh = useRefreshRateLimit();
  const throttledRefreshDiscover = useRefreshRateLimit();
  const { data: moodData, isLoading: moodLoading } = useMoodRecommendations(selectedMood);
  const { data: recommendationsData } = useRecommendations();
  const [useSemantic, setUseSemantic] = useState(false);
  const semanticSearch = useSemanticSearch(useSemantic ? debouncedQuery : "");
  const { history: searchHistory, addEntry: addSearchEntry, clearHistory: clearSearchHistory, removeEntry: removeSearchEntry } = useSearchHistory();

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed) {
        log("Search", "debounced query", { query: trimmed });
      }
      setDebouncedQuery(trimmed);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      addSearchEntry(debouncedQuery);
    }
  }, [debouncedQuery, addSearchEntry]);

  function handleHistorySelect(entry: string) {
    setQuery(entry);
  }

  const allResults = data ? data.results : [];
  const hasResults = allResults.length > 0;
  const showEmpty = !isLoading && !isError && debouncedQuery.length > 0 && !hasResults;
  const isSearching = debouncedQuery.length > 0;

  function handleShowPress(show: SearchResultItem) {
    if (!show.tmdbId) return;
    log("Search", "show selected", { tmdbId: show.tmdbId, title: show.title });
    navigation.navigate("ShowDetail", { tmdbId: show.tmdbId, title: show.title });
  }

  function handleQuickAdd(show: SearchResultItem) {
    if (!show.tmdbId) return;
    quickAdd.mutate(
      { tmdbId: show.tmdbId, type: show.type },
      {
        onSuccess: () => showSnackbar(t("screens.showDetail.addToList"), "success"),
        onError: () => showSnackbar(t("screens.showDetail.addToList"), "error"),
      },
    );
  }

  function renderDiscoverSkeleton() {
    return (
      <View className="mt-2">
        {[...Array(4)].map((_, index) => (
          <View key={index} className="mb-6">
            <Skeleton width="60%" height={24} borderRadius={4} className="mb-3" />
            <View className="flex-row">
              {[...Array(3)].map((_, cardIndex) => (
                <Skeleton key={cardIndex} width={128} height={192} borderRadius={8} className="mr-3" />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
        <Seo title={t("seo.search")} />
        <MainHeader />
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t("screens.search.placeholder")}
          onClose={() => setQuery("")}
          minChars={1}
          autoFocus={false}
        />

        {!isSearching && searchHistory.length > 0 && (
          <RecentSearches
            history={searchHistory}
            onSelect={handleHistorySelect}
            onRemove={removeSearchEntry}
            onClear={clearSearchHistory}
          />
        )}

        {!isSearching && isDiscoverError && (
          <NetworkError
            variant={getNetworkErrorVariant(discoverError)}
            onRetry={() => throttledRefreshDiscover(refetchDiscover)}
          />
        )}

        {!isSearching && !isDiscoverError && isDiscoverLoading && renderDiscoverSkeleton()}

        {!isSearching && !isDiscoverError && !isDiscoverLoading && discoverData && (
          <ScrollView
            ref={scrollRef as React.RefObject<ScrollView>}
            className="flex-1 -mx-4 px-4"
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={isDiscoverLoading}
                onRefresh={() => throttledRefreshDiscover(refetchDiscover)}
                tintColor={colors.primary}
              />
            }
          >
            <RecommendationsRow
              recommendations={recommendationsData?.recommendations ?? []}
              onShowPress={handleShowPress}
              onQuickAdd={handleQuickAdd}
              isAdding={quickAdd.isPending}
              isTracked={(tmdbId) => trackedTmdbIds.has(tmdbId)}
            />
            <View className="mb-4">
              <MoodPicker selectedMood={selectedMood} onSelectMood={setSelectedMood} />
            </View>

            {selectedMood && moodData && moodData.recommendations.length > 0 && (
              <View className="mb-6">
                <Text className="text-text font-semibold text-base mb-3">
                  {t("screens.search.moodResults")}
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {moodData.recommendations.map((item: MoodRecommendation) => (
                    <View key={`${item.tmdbId}-${item.type}`} className="w-[48%] md:w-[31%]">
                      <ShowCard
                        show={{
                          tmdbId: item.tmdbId,
                          type: item.type,
                          title: item.title,
                          posterPath: item.posterPath,
                          overview: item.overview,
                          source: "tmdb",
                        }}
                        onPress={() => handleShowPress({
                          tmdbId: item.tmdbId,
                          type: item.type,
                          title: item.title,
                          posterPath: item.posterPath,
                          overview: item.overview,
                          source: "tmdb",
                        })}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedMood && moodLoading && (
              <View className="mb-6">
                <Skeleton width="40%" height={20} className="mb-3" />
                <View className="flex-row">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} width={128} height={192} borderRadius={8} className="mr-3" />
                  ))}
                </View>
              </View>
            )}
            {discoverData.sections.map((section: DiscoverSection) => (
              <DiscoverSectionRow
                key={section.id}
                section={section}
                onShowPress={handleShowPress}
                onQuickAdd={handleQuickAdd}
                isAdding={quickAdd.isPending}
                isTracked={(tmdbId) => trackedTmdbIds.has(tmdbId)}
              />
            ))}
          </ScrollView>
        )}

        {isSearching && isLoading && (
          <View className="mt-2">
            {[...Array(4)].map((_, index) => (
              <ShowCardSkeleton key={index} />
            ))}
          </View>
        )}

        {isSearching && isError && (
          <NetworkError
            variant={getNetworkErrorVariant(error)}
            onRetry={() => refetch()}
          />
        )}

        {isSearching && showEmpty && (
          <EmptyState
            icon="search-outline"
            title={t("errors.notFound")}
            subtitle={`${t("errors.notFound")} "${debouncedQuery}".`}
          />
        )}

        {isSearching && !isLoading && !isError && (
          <FlatList
            ref={scrollRef as React.RefObject<FlatList>}
            data={useSemantic && semanticSearch.data ? semanticSearch.data.results : allResults}
            keyExtractor={(item, index) => `${item.title}-${index}`}
            renderItem={({ item }) => (
              <ShowCard show={item} onPress={() => handleShowPress(item)} />
            )}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListHeaderComponent={
              debouncedQuery.length > 10 ? (
                <TouchableOpacity
                  onPress={() => setUseSemantic(!useSemantic)}
                  className={`flex-row items-center px-3 py-2 rounded-lg mb-3 ${useSemantic ? "bg-primary/20" : "bg-surface"}`}
                >
                  <Ionicons name="sparkles" size={16} color={useSemantic ? colors.primary : colors.textMuted} />
                  <Text className={`ml-2 text-sm ${useSemantic ? "text-primary" : "text-text-muted"}`}>
                    {t("screens.search.semanticSearch")}
                  </Text>
                  {useSemantic && semanticSearch.data?.source === "ai" && (
                    <View className="bg-primary/20 rounded px-1.5 py-0.5 ml-2">
                      <Text className="text-primary text-[10px] font-bold">AI</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </ScreenContainer>
    </TouchableWithoutFeedback>
  );
}


