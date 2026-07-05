import { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useShowSearch } from "../hooks/useShowSearch";
import { useDiscoverSections } from "../hooks/useDiscover";
import { useQuickAddToWatchlist, useTrackedTmdbIds } from "../hooks/useTracking";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { ShowCard } from "../components/ShowCard";
import { PosterCard } from "../components/PosterCard";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { ShowCardSkeleton, Skeleton } from "../components/Skeleton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useThemeColors } from "../theme/useThemeColors";
import { RootStackParamList } from "../navigation/RootNavigator";
import { SearchResultItem, DiscoverSection } from "../services/shows.service";
import { useUIStore } from "../store/uiStore";
import { log } from "../utils/logger";
import { useI18n } from "../i18n/useI18n";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShowDetail">;

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showSnackbar } = useUIStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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

  function renderDiscoverSection(section: DiscoverSection) {
    return (
      <View key={section.id} className="mb-6">
        <SectionHeader title={section.title} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
          {section.items.map((item, index) => (
            <PosterCard
              key={`${section.id}-${item.tmdbId ?? index}`}
              show={item}
              onPress={() => handleShowPress(item)}
              onAdd={() => handleQuickAdd(item)}
              isAdding={quickAdd.isPending}
              isAdded={item.tmdbId ? trackedTmdbIds.has(item.tmdbId) : false}
            />
          ))}
        </ScrollView>
      </View>
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
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
        <Text className="text-2xl font-bold text-text mb-4">{t("navigation.search")}</Text>
        <TextInput
          className="bg-surface text-text px-4 py-3 rounded-lg mb-4 border border-border"
          placeholder={t("screens.search.placeholder")}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />

        {!isSearching && isDiscoverError && (
          <NetworkError
            isOffline={!discoverError || !("response" in discoverError)}
            onRetry={() => throttledRefreshDiscover(refetchDiscover)}
          />
        )}

        {!isSearching && !isDiscoverError && isDiscoverLoading && renderDiscoverSkeleton()}

        {!isSearching && !isDiscoverError && !isDiscoverLoading && discoverData && (
          <ScrollView
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
            {discoverData.sections.map(renderDiscoverSection)}
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
            isOffline={!error || !("response" in error)}
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
            data={allResults}
            keyExtractor={(item, index) => `${item.title}-${index}`}
            renderItem={({ item }) => (
              <ShowCard show={item} onPress={() => handleShowPress(item)} />
            )}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </ScreenContainer>
    </TouchableWithoutFeedback>
  );
}


