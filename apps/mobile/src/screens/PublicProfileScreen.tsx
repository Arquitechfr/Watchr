import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import { ScreenContainer } from "../components/ScreenContainer";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { Avatar } from "../components/Avatar";
import { FollowButton } from "../components/FollowButton";
import { Seo } from "../components/Seo";
import { useI18n } from "../i18n/useI18n";
import { useThemeColors } from "../theme/useThemeColors";
import { usePublicProfile } from "../hooks/useSocial";

export function PublicProfileScreen() {
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const route = useRoute();
  const username = (route.params as { username: string })?.username;

  const { data: profile, isLoading, isError } = usePublicProfile(username);

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (isError || !profile) {
    return (
      <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
        <SubScreenHeader title={username ?? ""} />
        <View className="items-center py-12">
          <Text className="text-text-muted text-center">{t("screens.social.userNotFound")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const memberSinceFormatted = profile.createdAt
    ? format(new Date(profile.createdAt), "MMMM yyyy", { locale: dateFnsLocale })
    : "";

  return (
    <ScreenContainer className="px-4 pt-4" edges={["top", "left", "right"]} fullWidth>
      <Seo title={profile.username} />
      <SubScreenHeader title={profile.username} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        <View className="items-center mb-6">
          <Avatar url={profile.avatarUrl} size={80} />
          <Text className="text-text text-lg font-bold mt-3">{profile.username}</Text>
          {memberSinceFormatted && (
            <Text className="text-text-muted text-xs mt-1">
              {t("screens.profile.memberSince", { date: memberSinceFormatted })}
            </Text>
          )}
        </View>

        <View className="flex-row justify-center gap-6 mb-6">
          <View className="items-center">
            <Text className="text-text font-bold text-lg">{profile.followers}</Text>
            <Text className="text-text-muted text-xs">{t("screens.social.followers")}</Text>
          </View>
          <View className="items-center">
            <Text className="text-text font-bold text-lg">{profile.following}</Text>
            <Text className="text-text-muted text-xs">{t("screens.social.following")}</Text>
          </View>
        </View>

        <View className="items-center mb-6">
          <FollowButton userId={profile.id} />
        </View>

        {profile.activityVisibility === "private" ? (
          <View
            className="rounded-lg p-4 items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-text-muted text-sm text-center">
              {t("screens.social.privateProfile")}
            </Text>
          </View>
        ) : (
          <View
            className="rounded-lg p-4 items-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-text-muted text-sm text-center">
              {t("screens.social.publicProfileActivity")}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
