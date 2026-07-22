import { useState, useMemo } from "react";
import { View, Text, ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, ScrollView } from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { ActivityFeedItemCard } from "../components/ActivityFeedItem";
import { EmptyState } from "../components/EmptyState";
import { Seo } from "../components/Seo";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { useFriendsActivityFeed } from "../hooks/useSocial";
import type { ActivityFeedItem, ActivityFeedItemType } from "../services/social.service";

const FILTER_TYPES: (ActivityFeedItemType | "all")[] = ["all", "rating", "watchlist_add", "comment"];

export function FriendsActivityScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [activeFilter, setActiveFilter] = useState<ActivityFeedItemType | "all">("all");

  const types = activeFilter === "all" ? undefined : [activeFilter];
  const { data, isLoading, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFriendsActivityFeed(types);

  const items: ActivityFeedItem[] = data?.pages.flatMap((p) => p.data) ?? [];

  const filters = useMemo(
    () =>
      FILTER_TYPES.map((f) => ({
        key: f,
        label: t(`screens.social.filter_${f}`),
      })),
    [t],
  );

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("screens.social.friendsActivity")} />
      <SubScreenHeader title={t("screens.social.friendsActivity")} />
      <View className="md:max-w-lg md:mx-auto w-full flex-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center" }}
          className="py-2"
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              className="rounded-full px-4 py-1.5 mr-2"
              style={{
                backgroundColor: activeFilter === f.key ? colors.primary : colors.surface,
              }}
            >
              <Text
                style={{
                  color: activeFilter === f.key ? colors.background : colors.textMuted,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t("errors.unknown")}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={t("screens.social.activityFeedEmpty")}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, index) => `${item.type}-${item.user.id}-${index}`}
            renderItem={({ item }) => <ActivityFeedItemCard item={item} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator size="small" color={colors.primary} className="py-4" />
              ) : null
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}
