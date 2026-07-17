import { useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "../components/ScreenContainer";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { Avatar } from "../components/Avatar";
import { CoverBanner } from "../components/Profile/CoverBanner";
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
  const [showOriginalBio, setShowOriginalBio] = useState(false);

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
        <View style={{ marginHorizontal: -16, marginBottom: 8 }}>
          <CoverBanner url={profile.bannerUrl} />
        </View>
        <View className="items-center mb-6" style={{ marginTop: -40 }}>
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

        <BioSection
          bio={profile.bio}
          translatedBio={profile.translatedBio}
          isBioTranslated={profile.isBioTranslated}
          showOriginal={showOriginalBio}
          onToggleOriginal={() => setShowOriginalBio((v) => !v)}
          favoriteGenres={profile.favoriteGenres}
          colors={colors}
          t={t}
        />

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

interface BioSectionProps {
  bio?: string;
  translatedBio?: string;
  isBioTranslated?: boolean;
  showOriginal: boolean;
  onToggleOriginal: () => void;
  favoriteGenres?: string[];
  colors: ReturnType<typeof useThemeColors>;
  t: ReturnType<typeof useI18n>["t"];
}

function BioSection({
  bio,
  translatedBio,
  isBioTranslated,
  showOriginal,
  onToggleOriginal,
  favoriteGenres,
  colors,
  t,
}: BioSectionProps) {
  const hasBio = bio && bio.trim().length > 0;
  const hasGenres = favoriteGenres && favoriteGenres.length > 0;

  if (!hasBio && !hasGenres) return null;

  const displayBio = isBioTranslated && !showOriginal && translatedBio ? translatedBio : bio;

  return (
    <View className="mb-6">
      {(hasBio || hasGenres) && (
        <Text className="text-text font-semibold text-base mb-3">
          {t("screens.profile.aboutMe")}
        </Text>
      )}
      {hasBio && (
        <View className="bg-surface rounded-lg p-4 mb-3">
          <Text className="text-text text-sm leading-relaxed">{displayBio}</Text>
          {isBioTranslated && (
            <TouchableOpacity
              onPress={onToggleOriginal}
              className="mt-2 flex-row items-center"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name="language-outline" size={11} color={colors.primary} />
              <Text className="text-primary text-xs ml-0.5">
                {showOriginal ? t("screens.profile.showTranslation") : t("screens.profile.translated")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {hasGenres && (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {favoriteGenres!.map((genre) => (
            <View
              key={genre}
              className="flex-row items-center rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.primary + "15" }}
            >
              <Ionicons name="pricetag" size={12} color={colors.primary} />
              <Text className="text-primary text-xs font-medium ml-1.5">{genre}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
