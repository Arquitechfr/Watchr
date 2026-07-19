import { View, Text, FlatList, RefreshControl, TouchableOpacity, Platform } from "react-native";
import { useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useScrollToTop } from "@react-navigation/native";
import { ScreenContainer } from "../components/ScreenContainer";
import { MainHeader } from "../components/MainHeader";
import { InAppNotificationBanner } from "../components/InAppNotificationBanner";
import { NewsCard } from "../components/NewsCard";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useNews, useFilteredNews } from "../hooks/useNews";
import { useNewsRealtime } from "../hooks/useNewsRealtime";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useThemeColors } from "../theme/useThemeColors";
import { getNetworkErrorVariant } from "../services/api";
import { useRef, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { Seo } from "../components/Seo";

export function NewsScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [showFiltered, setShowFiltered] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  useScrollToTop(flatListRef);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= 768;

  const { data, isLoading, isError, error, refetch } = useNews(null);
  const { data: filteredData, isLoading: filteredLoading, isError: filteredError, refetch: refetchFiltered } = useFilteredNews(showFiltered);
  const throttledRefresh = useRefreshRateLimit();

  useNewsRealtime();

  const displayData = showFiltered ? filteredData : data;
  const displayLoading = showFiltered ? filteredLoading : isLoading;
  const displayError = showFiltered ? filteredError : isError;
  const displayRefetch = showFiltered ? refetchFiltered : refetch;

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("seo.news")} />
      <MainHeader />
      <InAppNotificationBanner />

      <TouchableOpacity
        onPress={() => setShowFiltered((prev) => !prev)}
        activeOpacity={0.7}
        className="flex-row items-center justify-between mb-4 rounded-lg p-3"
        style={{ backgroundColor: colors.surface }}
      >
        <View className="flex-row items-center">
          <Ionicons name={showFiltered ? "filter-circle" : "filter-outline"} size={20} color={colors.primary} />
          <Text className="text-text font-medium ml-2">{t("screens.news.filteredToggle")}</Text>
        </View>
        <View className="flex-row items-center">
          {showFiltered && (
            <View className="bg-primary/20 rounded-full px-2 py-0.5 mr-2">
              <Text className="text-primary text-xs font-semibold">{t("screens.news.filteredActive")}</Text>
            </View>
          )}
          <Ionicons name={showFiltered ? "toggle" : "toggle-outline"} size={24} color={showFiltered ? colors.primary : colors.textMuted} />
        </View>
      </TouchableOpacity>

      {displayLoading && (
        <View style={isDesktopWeb ? { flexDirection: "row", flexWrap: "wrap", gap: 16 } : undefined}>
          {[...Array(4)].map((_, index) => (
            <Skeleton
              key={index}
              width={isDesktopWeb ? "48%" : "100%"}
              height={200}
              className="mb-4"
              borderRadius={8}
            />
          ))}
        </View>
      )}

      {displayError && (
        <NetworkError variant={getNetworkErrorVariant(error)} onRetry={() => displayRefetch()} />
      )}

      {!displayLoading && !displayError && (
        <FlatList
          key={isDesktopWeb ? "grid" : "list"}
          ref={flatListRef}
          data={displayData ?? []}
          keyExtractor={(item, index) => `${item.title}-${index}`}
          numColumns={isDesktopWeb ? 2 : 1}
          columnWrapperStyle={isDesktopWeb ? { gap: 16 } : undefined}
          renderItem={({ item }) => <NewsCard article={item} compact={isDesktopWeb} />}
          refreshControl={<RefreshControl refreshing={displayLoading} onRefresh={() => throttledRefresh(displayRefetch)} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 24, gap: isDesktopWeb ? 16 : 0 }}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              title={t("screens.news.empty")}
              subtitle={t("screens.news.emptySubtitle")}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}
