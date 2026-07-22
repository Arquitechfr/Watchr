import { useState, useCallback, useMemo } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { Avatar } from "../components/Avatar";
import { Seo } from "../components/Seo";
import { EmptyState } from "../components/EmptyState";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { useSearchUsers, useFollowing } from "../hooks/useSocial";
import { useAuthStore } from "../store/authStore";
import type { FollowUserItem } from "../services/social.service";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function UserSearchScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const currentUserId = useAuthStore((s) => s.userId);
  const [query, setQuery] = useState("");

  const { data: searchData, isLoading: searchLoading } = useSearchUsers(query);
  const { data: followingData, isLoading: followingLoading } = useFollowing(
    query.length < 2 ? currentUserId : null,
  );

  const handleUserPress = useCallback(
    (username: string) => {
      navigation.navigate("PublicProfile", { username });
    },
    [navigation],
  );

  const isSearching = query.length >= 2;
  const searchResults = searchData?.data ?? [];
  const followingList = useMemo(
    () => followingData?.pages.flatMap((p) => p.data) ?? [],
    [followingData],
  );
  const results = isSearching ? searchResults : followingList;
  const isLoading = isSearching ? searchLoading : followingLoading;
  const showMinCharsHint = query.length > 0 && query.length < 2;

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("screens.social.findFriends")} />
      <SubScreenHeader title={t("screens.social.findFriends")} />
      <View className="md:max-w-lg md:mx-auto w-full flex-1">
        <View
          className="flex-row items-center rounded-lg px-4 py-3 mb-4"
          style={{ backgroundColor: colors.surface }}
        >
          <TextInput
            className="flex-1 text-text text-base"
            placeholder={t("screens.social.searchUsersPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {showMinCharsHint && (
          <Text className="text-text-muted text-xs mb-3">{t("screens.social.minCharsTip")}</Text>
        )}

        {isLoading && query.length >= 2 && (
          <ActivityIndicator size="small" color={colors.primary} className="py-4" />
        )}

        {query.length >= 2 && !isLoading && results.length === 0 && (
          <EmptyState
            icon="search-outline"
            title={t("screens.social.noResults")}
          />
        )}

        {!isSearching && followingList.length === 0 && !followingLoading && (
          <EmptyState
            icon="people-outline"
            title={t("screens.social.noFollowingYet")}
          />
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item }: { item: FollowUserItem }) => (
            <TouchableOpacity
              className="flex-row items-center rounded-lg p-3 mb-2"
              style={{ backgroundColor: colors.surface }}
              onPress={() => handleUserPress(item.username)}
              activeOpacity={0.7}
            >
              <Avatar url={item.avatarUrl} size={40} />
              <Text className="text-text text-base ml-3 flex-1">{item.username}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </ScreenContainer>
  );
}
