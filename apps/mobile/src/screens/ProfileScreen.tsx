import { Text, TouchableOpacity, ActivityIndicator, View, ScrollView, Platform, useWindowDimensions, Modal } from "react-native";
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
import { AiInsights } from "../components/Profile/AiInsights";
import { Skeleton } from "../components/Skeleton";
import { useErrorMessage } from "../services/api";
import { logout, getMe } from "../services/auth.service";
import { log } from "../utils/logger";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeColors } from "../theme/useThemeColors";
import { useState } from "react";
import { useI18n } from "../i18n/useI18n";
import { useUserStats } from "../hooks/useStats";
import { useYearInReview } from "../hooks/useYearInReview";
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
  const [showYearInReview, setShowYearInReview] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;
  const { pickAvatar, isUploading: isAvatarUploading } = useAvatarUpload();

  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: yearInReview, isLoading: yearInReviewLoading } = useYearInReview();
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

        {stats && stats.aiInsights && stats.aiInsights.length > 0 && (
          <View className="mb-6">
            <AiInsights insights={stats.aiInsights} />
          </View>
        )}

        {yearInReview && (
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => setShowYearInReview(true)}
              activeOpacity={0.7}
              className="rounded-lg p-4 flex-row items-center justify-between"
              style={{ backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.primary }}
            >
              <View className="flex-row items-center flex-1">
                <View className="bg-primary/20 rounded-full w-10 h-10 items-center justify-center mr-3">
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-semibold text-base">{t("screens.profile.yearInReviewTitle")}</Text>
                  <Text className="text-text-muted text-xs mt-0.5">{t("screens.profile.yearInReviewSubtitle", { year: yearInReview.data.year })}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
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

      <Modal visible={showYearInReview} animationType="slide" transparent={false} onRequestClose={() => setShowYearInReview(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 50 }}>
          <View className="flex-row items-center px-4 pb-4 border-b border-border">
            <TouchableOpacity onPress={() => setShowYearInReview(false)} className="mr-3 p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text className="text-text font-bold text-lg flex-1">{t("screens.profile.yearInReviewTitle")}</Text>
          </View>
          <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-12">
            {yearInReviewLoading ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="text-text-muted mt-3">{t("screens.profile.yearInReviewLoading")}</Text>
              </View>
            ) : yearInReview ? (
              <View>
                <View className="bg-primary/15 rounded-lg p-4 mb-6" style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                  <View className="flex-row items-center mb-2">
                    <View className="bg-primary/20 rounded px-1.5 py-0.5 mr-2">
                      <Text className="text-primary text-[10px] font-bold">AI</Text>
                    </View>
                    <Text className="text-text font-semibold text-base">{yearInReview.data.year}</Text>
                  </View>
                  {yearInReview.aiSummary ? (
                    <Text className="text-text leading-relaxed">{yearInReview.aiSummary}</Text>
                  ) : (
                    <Text className="text-text-muted italic">{t("screens.profile.yearInReviewNoSummary")}</Text>
                  )}
                </View>

                {yearInReview.highlights.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-text font-semibold text-base mb-3">{t("screens.profile.yearInReviewHighlights")}</Text>
                    <View className="gap-2">
                      {yearInReview.highlights.map((highlight, index) => (
                        <View key={`highlight-${index}`} className="flex-row items-start bg-surface rounded-lg p-3">
                          <Ionicons name="star" size={16} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
                          <Text className="text-text text-sm flex-1">{highlight}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View className="flex-row flex-wrap gap-3 mb-6">
                  <View className="w-[48%]">
                    <StatCard icon="tv-outline" value={yearInReview.data.totalShows} label={t("screens.profile.statsShowsFollowed")} />
                  </View>
                  <View className="w-[48%]">
                    <StatCard icon="play-circle-outline" value={yearInReview.data.totalEpisodesWatched} label={t("screens.profile.statsEpisodesWatched")} />
                  </View>
                  <View className="w-[48%]">
                    <StatCard icon="chatbubble-outline" value={yearInReview.data.totalComments} label={t("screens.profile.statsComments")} />
                  </View>
                  <View className="w-[48%]">
                    <StatCard icon="star-outline" value={yearInReview.data.totalRatings} label={t("screens.profile.yearInReviewRatings")} />
                  </View>
                </View>

                {yearInReview.data.topShows.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-text font-semibold text-base mb-3">{t("screens.profile.yearInReviewTopShows")}</Text>
                    <View className="gap-2">
                      {yearInReview.data.topShows.map((show, index) => (
                        <View key={`top-show-${index}`} className="flex-row items-center bg-surface rounded-lg p-3">
                          <View className="bg-primary/20 rounded-full w-8 h-8 items-center justify-center mr-3">
                            <Text className="text-primary font-bold text-sm">{index + 1}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-text font-medium">{show.title}</Text>
                            <Text className="text-text-muted text-xs">{show.episodesWatched} {t("screens.showDetail.episodes").toLowerCase()}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View className="bg-surface rounded-lg p-4 mb-6">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.profile.yearInReviewFavGenre")}</Text>
                    <Text className="text-primary font-medium">{yearInReview.data.favoriteGenre}</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-text-muted text-xs uppercase tracking-wider">{t("screens.profile.yearInReviewAvgRating")}</Text>
                    <Text className="text-primary font-medium">{yearInReview.data.averageRating > 0 ? `${yearInReview.data.averageRating}/10` : "—"}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View className="items-center py-12">
                <Text className="text-text-muted">{t("screens.profile.yearInReviewNoData")}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
