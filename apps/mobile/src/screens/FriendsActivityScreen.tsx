import { View, Text, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { ActivityFeedItemCard } from "../components/ActivityFeedItem";
import { Seo } from "../components/Seo";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { useFriendsActivityFeed } from "../hooks/useSocial";
import type { ActivityFeedItem } from "../services/social.service";

export function FriendsActivityScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { data, isLoading, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFriendsActivityFeed();

  const items: ActivityFeedItem[] = data?.pages.flatMap((p) => p.data) ?? [];

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
      <View className="md:max-w-lg md:mx-auto w-full">
        {isError ? (
          <View className="items-center py-12">
            <Text className="text-text-muted text-center">{t("errors.unknown")}</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-text-muted text-center">{t("screens.social.activityFeedEmpty")}</Text>
          </View>
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
