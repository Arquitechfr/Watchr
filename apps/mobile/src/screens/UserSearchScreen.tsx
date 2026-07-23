import { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { Avatar } from "../components/Avatar";
import { Seo } from "../components/Seo";
import { EmptyState } from "../components/EmptyState";
import { SearchBar } from "../components/SearchBar";
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

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={t("screens.social.findFriends")} />
      <SubScreenHeader title={t("screens.social.findFriends")} />
      <View className="md:max-w-lg md:mx-auto w-full flex-1">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t("screens.social.searchUsersPlaceholder")}
          onClose={() => setQuery("")}
          minChars={2}
          minCharsTip={t("screens.social.minCharsTip")}
        />

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
