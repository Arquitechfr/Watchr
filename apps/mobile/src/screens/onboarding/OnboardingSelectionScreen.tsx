import { useState, useCallback, useMemo } from "react";
import { View, Text, TextInput, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "../../components/ScreenContainer";
import { NetworkError } from "../../components/NetworkError";
import { EmptyState } from "../../components/EmptyState";
import { OnboardingPosterTile } from "./OnboardingPosterTile";
import { OnboardingSkipButton } from "./OnboardingSkipButton";
import { useI18n } from "../../i18n/useI18n";
import { useThemeColors } from "../../theme/useThemeColors";
import { useDiscoverSections } from "../../hooks/useDiscover";
import { useShowSearch } from "../../hooks/useShowSearch";
import { useOnboardingStore } from "../../store/onboardingStore";
import { SearchResultItem } from "../../services/shows.service";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingSelection: undefined;
  OnboardingConfirmation: undefined;
};

interface OnboardingSelectionScreenProps {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, "OnboardingSelection">;
  onSkip: () => void;
}

export function OnboardingSelectionScreen({ navigation, onSkip }: OnboardingSelectionScreenProps) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: discoverData, isLoading: discoverLoading, isError: discoverError, refetch: refetchDiscover } = useDiscoverSections();
  const searchResult = useShowSearch(searchQuery);

  const { selectedItems, toggleItem, isSelected } = useOnboardingStore();

  const isSearching = searchQuery.trim().length > 0;

  const items = useMemo<SearchResultItem[]>(() => {
    if (isSearching && searchResult.data) {
      return searchResult.data.results;
    }
    if (discoverData?.sections) {
      return discoverData.sections.flatMap((s: { items: SearchResultItem[] }) => s.items);
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
        />
      )}

      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-4 pt-2"
        style={{ backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <OnboardingSkipButton onPress={onSkip} />
        <TouchableOpacity
          className="bg-primary px-6 py-3 rounded-lg"
          onPress={() => navigation.navigate("OnboardingConfirmation")}
          activeOpacity={0.8}
        >
          <Text className="text-background font-semibold">
            {t("screens.onboarding.selectionContinue")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
