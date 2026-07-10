import { Text, TouchableOpacity, ActivityIndicator, View, ScrollView, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getItem as secureGetItem } from "../utils/secureStorage";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { ScreenContainer } from "../components/ScreenContainer";
import { MainHeader } from "../components/MainHeader";
import { ProfileMenuButton } from "../components/ProfileMenuButton";
import { Avatar } from "../components/Avatar";
import { StatCard } from "../components/Profile/StatCard";
import { StreakBadge } from "../components/Profile/StreakBadge";
import { GenreBreakdown } from "../components/Profile/GenreBreakdown";
import { FavoriteCarousel } from "../components/Profile/FavoriteCarousel";
import { RecentActivity } from "../components/Profile/RecentActivity";
import { Skeleton } from "../components/Skeleton";
import { useErrorMessage } from "../services/api";
import { logout, getMe } from "../services/auth.service";
import { log } from "../utils/logger";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeColors } from "../theme/useThemeColors";
import { useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { useUserStats } from "../hooks/useStats";
import { useFavorites } from "../hooks/useFavorites";
import { useAvatarUpload } from "../hooks/useAvatarUpload";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { logout: clearAuth } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const { t, dateFnsLocale } = useI18n();
  const colors = useThemeColors();
  const getErrorMessage = useErrorMessage();
  const [isLoading, setIsLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;
  const { pickAvatar, isUploading: isAvatarUploading } = useAvatarUpload();

  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const tvFavoritesQuery = useFavorites("tv");
  const movieFavoritesQuery = useFavorites("movie");

  const tvFavorites = tvFavoritesQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const movieFavorites = movieFavoritesQuery.data?.pages.flatMap((p) => p.data) ?? [];

  async function handleLogout() {
    log("Logout", "start");
    setIsLoading(true);
    try {
      const refreshToken = await secureGetItem("refreshToken");
      if (refreshToken) {
        log("Logout", "calling api");
        await logout(refreshToken);
      } else {
        log("Logout", "no refresh token");
      }
    } catch (err) {
      log("Logout", "api error", err);
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      log("Logout", "clearing auth");
      await clearAuth();
      setIsLoading(false);
      log("Logout", "navigate to auth");
      navigation.navigate("Auth");
    }
  }

  const memberSinceDate = me?.createdAt ? new Date(me.createdAt) : null;
  const memberSinceFormatted = memberSinceDate
    ? format(memberSinceDate, "MMMM yyyy", { locale: dateFnsLocale })
    : "";

  const lastLoginDate = me?.lastLoginAt ? new Date(me.lastLoginAt) : null;
  const lastLoginFormatted = lastLoginDate
    ? format(lastLoginDate, "d MMM yyyy 'at' HH:mm", { locale: dateFnsLocale })
    : "";

  return (
    <ScreenContainer className="px-4 pt-6" edges={["top", "left", "right"]}>
      <View style={Platform.OS === "web" ? { maxWidth: 800, alignSelf: "center", width: "100%", flex: 1 } : undefined}>
      <MainHeader rightElement={<ProfileMenuButton />} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickAvatar} disabled={isAvatarUploading || meLoading} activeOpacity={0.8}>
            <View className="relative">
              <Avatar url={me?.avatarUrl} size={80} />
              <View
                className="absolute bottom-0 right-0 items-center justify-center rounded-full"
                style={{ width: 28, height: 28, backgroundColor: colors.primary }}
              >
                {isAvatarUploading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Ionicons name="camera" size={16} color={colors.background} />
                )}
              </View>
            </View>
          </TouchableOpacity>
          {meLoading ? (
            <View className="items-center mt-3">
              <Skeleton width={120} height={18} className="mb-2" />
              <Skeleton width={180} height={14} />
            </View>
          ) : (
            <>
              <Text className="text-text text-lg font-bold mt-3">{me?.username ?? "..."}</Text>
              <Text className="text-text-muted text-sm">{me?.email}</Text>
              {memberSinceFormatted && (
                <Text className="text-text-muted text-xs mt-1">
                  {t("screens.profile.memberSince", { date: memberSinceFormatted })}
                </Text>
              )}
              {lastLoginFormatted && (
                <Text className="text-text-muted text-xs mt-0.5">
                  {t("screens.profile.lastLogin", { date: lastLoginFormatted })}
                </Text>
              )}
            </>
          )}
        </View>

        {statsLoading ? (
          <View className="mb-6">
            <Skeleton width={140} height={20} className="mb-3" />
            <View className="flex-row gap-3 mb-3">
              <Skeleton width={"48%"} height={80} borderRadius={12} />
              <Skeleton width={"48%"} height={80} borderRadius={12} />
            </View>
            <View className="flex-row gap-3 mb-3">
              <Skeleton width={"48%"} height={80} borderRadius={12} />
              <Skeleton width={"48%"} height={80} borderRadius={12} />
            </View>
          </View>
        ) : stats && (
          <View className="mb-8">
            <Text className="text-text font-semibold text-base mb-3">{t("screens.profile.statsTitle")}</Text>
            <View className="flex-row flex-wrap gap-3 mb-3">
              <View className="w-[48%] md:w-[31%]">
                <StatCard icon="tv-outline" value={stats.tvCount} label={t("screens.profile.statsShowsFollowed")} />
              </View>
              <View className="w-[48%] md:w-[31%]">
                <StatCard icon="film-outline" value={stats.movieCount} label={t("screens.profile.statsMoviesFollowed")} />
              </View>
              <View className="w-[48%] md:w-[31%]">
                <StatCard icon="play-circle-outline" value={stats.episodesWatched} label={t("screens.profile.statsEpisodesWatched")} />
              </View>
              <View className="w-[48%] md:w-[31%]">
                <StatCard icon="time-outline" value={`${stats.hoursWatched}h`} label={t("screens.profile.statsHoursWatched")} />
              </View>
              <View className="w-[48%] md:w-[31%]">
                <StatCard icon="chatbubble-outline" value={stats.commentsCount} label={t("screens.profile.statsComments")} />
              </View>
              <View className="w-[48%] md:w-[31%]">
                <StatCard icon="heart-outline" value={stats.reactionsCount + stats.likesCount} label={t("screens.profile.statsReactions")} />
              </View>
            </View>
          </View>
        )}

        {stats && (
          <View className="mb-6">
            <StreakBadge streak={stats.watchStreak} />
          </View>
        )}

        {stats && stats.genreBreakdown.length > 0 && (
          <View className="mb-6">
            <GenreBreakdown genres={stats.genreBreakdown} />
          </View>
        )}

        <View className="mb-8" style={isDesktopWeb ? { flexDirection: "row", gap: 16 } : undefined}>
          <View style={isDesktopWeb ? { flex: 1 } : undefined} className="mb-8">
            <FavoriteCarousel items={tvFavorites} type="tv" onRefetch={tvFavoritesQuery.refetch} />
          </View>
          <View style={isDesktopWeb ? { flex: 1 } : undefined} className="mb-8">
            <FavoriteCarousel items={movieFavorites} type="movie" onRefetch={movieFavoritesQuery.refetch} />
          </View>
        </View>

        {stats && (
          <View className="mb-6">
            <RecentActivity items={stats.recentActivity} />
          </View>
        )}

        <TouchableOpacity
          className="py-4 rounded-lg items-center mt-4"
          style={{ backgroundColor: colors.danger }}
          onPress={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text className="font-semibold" style={{ color: "#fff" }}>{t("screens.profile.logout")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </View>
    </ScreenContainer>
  );
}
