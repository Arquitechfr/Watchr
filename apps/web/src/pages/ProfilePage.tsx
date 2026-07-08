import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Avatar } from "../components/Avatar";
import { StatCard } from "../components/Profile/StatCard";
import { StreakBadge } from "../components/Profile/StreakBadge";
import { GenreBreakdown } from "../components/Profile/GenreBreakdown";
import { FavoriteCarousel } from "../components/Profile/FavoriteCarousel";
import { RecentActivity } from "../components/Profile/RecentActivity";
import { Skeleton } from "../components/Skeleton";
import { ProfileMenuButton } from "../components/ProfileMenuButton";
import { useUserStats } from "../hooks/useStats";
import { useFavorites } from "../hooks/useFavorites";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { getMe, logout } from "../services/auth.service";
import { useErrorMessage } from "../services/api";
import { useI18n } from "../i18n/useI18n";
import { useState } from "react";
import { format } from "date-fns";

export function ProfilePage() {
  const { t, dateFnsLocale } = useI18n();
  const navigate = useNavigate();
  const { logout: clearAuth } = useAuthStore();
  const showSnackbar = useUIStore((state) => state.showSnackbar);
  const getErrorMessage = useErrorMessage();
  const refreshToken = localStorage.getItem("refreshToken");

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: stats } = useUserStats();
  const tvFavoritesQuery = useFavorites("tv");
  const movieFavoritesQuery = useFavorites("movie");

  const tvFavorites = tvFavoritesQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const movieFavorites = movieFavoritesQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    } finally {
      await clearAuth();
      setIsLoading(false);
      navigate("/login");
    }
  }

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-text font-bold text-2xl">{t("navigation.profile")}</h1>
        <ProfileMenuButton />
      </div>

      {stats ? (
        <>
          <div className="flex flex-col items-center mb-6">
            <Avatar url={me?.avatarUrl} username={me?.username ?? "User"} size={80} />
            <p className="text-text text-lg font-bold mt-3">{me?.username ?? "..."}</p>
            <p className="text-text-muted text-sm">{me?.email}</p>
            {me?.createdAt && (
              <p className="text-text-muted text-xs mt-1">
                {t("screens.profile.memberSince", { date: format(new Date(me.createdAt), "MMMM yyyy", { locale: dateFnsLocale }) })}
              </p>
            )}
          </div>

          <div className="mb-6">
            <p className="text-text font-semibold text-base mb-3">{t("screens.profile.statsTitle")}</p>
            <div className="flex flex-wrap gap-3 mb-3">
              <StatCard icon="tv-outline" value={stats.tvCount} label={t("screens.profile.statsShowsFollowed")} />
              <StatCard icon="film-outline" value={stats.movieCount} label={t("screens.profile.statsMoviesFollowed")} />
            </div>
            <div className="flex flex-wrap gap-3 mb-3">
              <StatCard icon="play-circle-outline" value={stats.episodesWatched} label={t("screens.profile.statsEpisodesWatched")} />
              <StatCard icon="time-outline" value={`${stats.hoursWatched}h`} label={t("screens.profile.statsHoursWatched")} />
            </div>
            <div className="flex flex-wrap gap-3">
              <StatCard icon="chatbubble-outline" value={stats.commentsCount} label={t("screens.profile.statsComments")} />
              <StatCard icon="heart-outline" value={stats.reactionsCount + stats.likesCount} label={t("screens.profile.statsReactions")} />
            </div>
          </div>

          {stats && (
            <div className="mb-6">
              <StreakBadge streak={stats.watchStreak} />
            </div>
          )}

          {stats && stats.genreBreakdown.length > 0 && (
            <div className="mb-6">
              <GenreBreakdown genres={stats.genreBreakdown} />
            </div>
          )}

          <div className="mb-6">
            <FavoriteCarousel items={tvFavorites} type="tv" onRefetch={tvFavoritesQuery.refetch} />
          </div>

          <div className="mb-6">
            <FavoriteCarousel items={movieFavorites} type="movie" onRefetch={movieFavoritesQuery.refetch} />
          </div>

          {stats && (
            <div className="mb-6">
              <RecentActivity items={stats.recentActivity} />
            </div>
          )}
        </>
      ) : (
        <p className="text-text-muted text-center py-8">{t("errors.unknown")}</p>
      )}

      <button
        className="w-full py-4 rounded-lg items-center mt-4 bg-danger text-white font-semibold hover:bg-danger/90 transition-colors"
        onClick={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? t("common.loading") : t("screens.profile.logout")}
      </button>
    </PageWrapper>
  );
}
