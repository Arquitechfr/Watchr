import { View, Text, FlatList, RefreshControl, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../components/ScreenContainer";
import { MainHeader } from "../components/MainHeader";
import { NewsCard } from "../components/NewsCard";
import { EmptyState } from "../components/EmptyState";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useNews, useNewsSources } from "../hooks/useNews";
import { useNewsRealtime } from "../hooks/useNewsRealtime";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { NewsSource } from "../services/news.service";
import { useThemeColors } from "../theme/useThemeColors";
import { useState, useEffect, useMemo } from "react";
import { useI18n } from "../i18n/useI18n";
import { useLocaleStore } from "../store/localeStore";

export function NewsScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const locale = useLocaleStore((state) => state.locale);
  const { data: sources } = useNewsSources();
  const [manualSource, setManualSource] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= 768;

  const defaultSourceId = useMemo(() => {
    if (!sources || sources.length === 0) return null;
    return sources[0].id;
  }, [sources]);

  const selectedSource = manualSource;

  useEffect(() => {
    setManualSource(null);
  }, [locale]);

  const { data, isLoading, isError, error, refetch, isFetching } = useNews(selectedSource);
  const throttledRefresh = useRefreshRateLimit();

  useNewsRealtime();

  function renderSourceChip(source: NewsSource) {
    const isActive = manualSource === null ? source.id === defaultSourceId : manualSource === source.id;
    return (
      <TouchableOpacity
        key={source.id}
        onPress={() => setManualSource(source.id)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 20,
          marginRight: 10,
          backgroundColor: isActive ? colors.primary : colors.surface,
          borderWidth: 1,
          borderColor: isActive ? colors.primary : colors.border,
          ...(Platform.OS === "web"
            ? { transition: "all 0.15s ease" }
            : {
                shadowColor: isActive ? colors.primary : "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isActive ? 0.3 : 0.08,
                shadowRadius: 4,
                elevation: isActive ? 3 : 1,
              }),
        }}
      >
        <Ionicons
          name="newspaper"
          size={14}
          color={isActive ? colors.background : colors.textMuted}
          style={{ marginRight: 6 }}
        />
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: isActive ? colors.background : colors.text,
            textAlign: "center",
          }}
        >
          {source.name}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]}>
      <MainHeader />

      {sources && sources.length > 0 && Platform.OS !== "web" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ paddingRight: 16, paddingVertical: 2 }}
        >
          {sources.map(renderSourceChip)}
        </ScrollView>
      )}

      {isLoading && (
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

      {isError && (
        <NetworkError isOffline={!error || !("response" in error)} onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && (
        <FlatList
          key={isDesktopWeb ? "grid" : "list"}
          data={data ?? []}
          keyExtractor={(item, index) => `${item.title}-${index}`}
          numColumns={isDesktopWeb ? 2 : 1}
          columnWrapperStyle={isDesktopWeb ? { gap: 16 } : undefined}
          renderItem={({ item }) => <NewsCard article={item} compact={isDesktopWeb} />}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => throttledRefresh(refetch)} tintColor={colors.primary} />}
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
