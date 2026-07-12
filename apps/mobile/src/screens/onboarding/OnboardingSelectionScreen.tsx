import { useState, useCallback, useMemo } from "react";
import { View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../../components/ScreenContainer";
import { NetworkError } from "../../components/NetworkError";
import { EmptyState } from "../../components/EmptyState";
import { OnboardingPosterTile } from "./OnboardingPosterTile";
import { OnboardingSkipButton } from "./OnboardingSkipButton";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useOnboardingDiscover } from "../../hooks/useOnboardingDiscover";
import { useShowSearch } from "../../hooks/useShowSearch";
import { useOnboardingStore } from "../../store/onboardingStore";
import { useOnboardingSuggestions } from "../../hooks/useOnboardingSuggestions";
import { useAddToWatchlistBatch } from "../../hooks/useTracking";
import { useCompleteOnboarding } from "../../hooks/useOnboarding";
import { SearchResultItem, OnboardingSuggestion } from "../../services/shows.service";

interface OnboardingSelectionScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingSelectionScreen({ onComplete, onSkip }: OnboardingSelectionScreenProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: discoverData,
    isLoading: discoverLoading,
    isError: discoverError,
    refetch: refetchDiscover,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOnboardingDiscover();
  const searchResult = useShowSearch(searchQuery);

  const { selectedItems, toggleItem, isSelected, reset } = useOnboardingStore();
  const { data: aiSuggestionsData, isLoading: aiSuggestionsLoading } = useOnboardingSuggestions({ type: "both" });
  const batchMutation = useAddToWatchlistBatch();
  const completeOnboardingMutation = useCompleteOnboarding();

  const isFinishing = batchMutation.isPending || completeOnboardingMutation.isPending;
  const hasFinishError = batchMutation.isError || completeOnboardingMutation.isError;

  const handleFinish = useCallback(() => {
    if (selectedItems.length === 0) {
      completeOnboardingMutation.mutate(undefined, {
        onSuccess: () => {
          reset();
          onComplete();
        },
        onError: () => {},
      });
      return;
    }

    batchMutation.mutate(
      selectedItems.map((item) => ({ tmdbId: item.tmdbId, type: item.type })),
      {
        onSuccess: () => {
          completeOnboardingMutation.mutate(undefined, {
            onSuccess: () => {
              reset();
              onComplete();
            },
            onError: () => {},
          });
        },
        onError: () => {},
      },
    );
  }, [selectedItems, batchMutation, completeOnboardingMutation, reset, onComplete]);

  const handleRetry = useCallback(() => {
    batchMutation.reset();
    completeOnboardingMutation.reset();
    handleFinish();
  }, [batchMutation, completeOnboardingMutation, handleFinish]);

  const isSearching = searchQuery.trim().length > 0;

  const items = useMemo<SearchResultItem[]>(() => {
    if (isSearching && searchResult.data) {
      return searchResult.data.results;
    }
    if (discoverData?.pages) {
      return discoverData.pages.flatMap((p) => p.items);
    }
    return [];
  }, [isSearching, searchResult.data, discoverData]);

  const isLoading = isSearching ? searchResult.isLoading : discoverLoading;
  const isError = isSearching ? searchResult.isError : discoverError;
  const refetch = isSearching ? () => searchResult.refetch() : refetchDiscover;

  const handleToggle = useCallback(
    (item: SearchResultItem) => {
      if (item.tmdbId !== undefined) {
        toggleItem({
          tmdbId: item.tmdbId,
          type: item.type,
          title: item.title,
          posterPath: item.posterPath,
        });
      }
    },
    [toggleItem],
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResultItem }) => {
      if (item.tmdbId === undefined) return null;
      return (
        <OnboardingPosterTile
          show={item}
          selected={isSelected(item.tmdbId)}
          onToggle={() => handleToggle(item)}
        />
      );
    },
    [isSelected, handleToggle],
  );

  if (hasFinishError) {
    return (
      <ScreenContainer>
        <NetworkError
          message={t("screens.onboarding.batchError")}
          onRetry={handleRetry}
        />
      </ScreenContainer>
    );
  }

  if (isFinishing) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-text-muted mt-4">{t("common.loading")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <NetworkError onRetry={refetch} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-text text-2xl font-bold mb-1">
          {t("screens.onboarding.selectionTitle")}
        </Text>
        <Text className="text-text-muted text-sm mb-4">
          {t("screens.onboarding.selectionSubtitle")}
        </Text>

        <View
          className="flex-row items-center rounded-lg px-3 py-2 mb-3"
          style={{ backgroundColor: colors.surfaceLight }}
        >
          <TextInput
            className="flex-1 text-text"
            placeholder={t("screens.onboarding.selectionSearchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>

        {selectedItems.length > 0 && (
          <Text className="text-primary text-sm font-medium mb-2">
            {t("screens.onboarding.selectedCount", { count: selectedItems.length })}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState icon="search-outline" title={t("screens.onboarding.selectionNoResults")} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => item.tmdbId?.toString() ?? `item-${index}`}
          renderItem={renderItem}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: "flex-start", gap: 8, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (!isSearching && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            !isSearching && isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-text-muted text-xs mt-2">{t("screens.onboarding.loadingMore")}</Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            !isSearching && aiSuggestionsData && aiSuggestionsData.suggestions.length > 0 ? (
              <View className="px-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <Text className="text-text font-semibold text-base">{t("screens.onboarding.aiPicksTitle")}</Text>
                  {aiSuggestionsData.source === "ai" && (
                    <View className="bg-primary/20 rounded px-1.5 py-0.5 ml-2">
                      <Text className="text-primary text-[10px] font-bold">AI</Text>
                    </View>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                  {aiSuggestionsData.suggestions.map((item: OnboardingSuggestion) => {
                    const isAiSelected = isSelected(item.tmdbId);
                    return (
                      <TouchableOpacity
                        key={`ai-${item.tmdbId}-${item.type}`}
                        onPress={() => toggleItem({ tmdbId: item.tmdbId, type: item.type, title: item.title, posterPath: item.posterPath })}
                        activeOpacity={0.7}
                        style={{ width: 120 }}
                      >
                        {item.posterPath ? (
                          <Image
                            source={{ uri: `https://image.tmdb.org/t/p/w200${item.posterPath}` }}
                            className="w-full h-[180px] rounded-lg mb-1"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-[180px] rounded-lg bg-surface-light items-center justify-center mb-1">
                            <Text className="text-text-muted text-xs">{t("common.noImage")}</Text>
                          </View>
                        )}
                        <Text className="text-text text-xs font-medium" numberOfLines={2}>{item.title}</Text>
                        {isAiSelected && (
                          <View className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary items-center justify-center">
                            <Text className="text-background text-xs font-bold">✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <Text className="text-text-muted text-xs mt-2 mb-3">{t("screens.onboarding.aiPicksSubtitle")}</Text>
                <Text className="text-text font-semibold text-base mb-2">{t("screens.onboarding.browseAll")}</Text>
              </View>
            ) : !isSearching && aiSuggestionsLoading ? (
              <View className="px-4 mb-4">
                <Text className="text-text font-semibold text-base mb-3">{t("screens.onboarding.aiPicksTitle")}</Text>
                <View className="flex-row">
                  {[...Array(3)].map((_, i) => (
                    <View key={i} className="w-[120px] h-[180px] rounded-lg bg-surface-light mr-2" />
                  ))}
                </View>
              </View>
            ) : null
          }
        />
      )}

      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-4 pt-2"
        style={{ backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <OnboardingSkipButton onPress={onSkip} />
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-lg"
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text className="text-background font-semibold">
            {t("screens.onboarding.confirmationFinish")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
