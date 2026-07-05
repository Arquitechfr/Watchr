import { View, Text, FlatList, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { NewsCard } from "../components/NewsCard";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useNews, useNewsSources } from "../hooks/useNews";
import { useNewsRealtime } from "../hooks/useNewsRealtime";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { NewsSource } from "../services/news.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useState, useEffect } from "react";
import { useI18n } from "../i18n/useI18n";
import { useLocaleStore } from "../store/localeStore";

export function NewsScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const locale = useLocaleStore((state) => state.locale);
  const { data: sources } = useNewsSources();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useNews(selectedSource);

  useEffect(() => {
    setSelectedSource(null);
  }, [locale]);

  useEffect(() => {
    if (sources && sources.length > 0 && selectedSource === null) {
      setSelectedSource(sources[0].id);
    }
  }, [sources, selectedSource]);
  const throttledRefresh = useRefreshRateLimit();

  useNewsRealtime();

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <Text className="text-3xl font-bold text-text mb-4">{t("navigation.news")}</Text>

      {sources && sources.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {sources.map((source: NewsSource) => {
            const isActive = selectedSource === source.id;
            return (
              <TouchableOpacity
                key={source.id}
                onPress={() => setSelectedSource(source.id)}
                activeOpacity={0.8}
                className={`mr-3 px-4 py-2 rounded-full border border-border ${
                  isActive ? "bg-primary" : "bg-surface"
                }`}
              >
                <Text className={`text-sm font-semibold ${isActive ? "text-background" : "text-text"}`}>
                  {source.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {isLoading && (
        <View>
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} width="100%" height={200} className="mb-4" borderRadius={8} />
          ))}
        </View>
      )}

      {isError && (
        <NetworkError isOffline={!error || !("response" in error)} onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && (
        <FlatList
          data={data ?? []}
          keyExtractor={(item, index) => `${item.title}-${index}`}
          renderItem={({ item }) => <NewsCard article={item} />}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 24 }}
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
