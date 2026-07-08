import { useNavigate } from "react-router-dom";
import { Settings, LogOut, Tv, Film, MessageSquare, ThumbsUp, Clock } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Avatar } from "../components/Avatar";
import { StatCard } from "../components/Profile/StatCard";
import { StreakBadge } from "../components/Profile/StreakBadge";
import { GenreBreakdown } from "../components/Profile/GenreBreakdown";
import { FavoriteCarousel } from "../components/Profile/FavoriteCarousel";
import { RecentActivity } from "../components/Profile/RecentActivity";
import { SectionHeader } from "../components/SectionHeader";
import { Skeleton } from "../components/Skeleton";
import { CustomAlert } from "../components/CustomAlert";
import { useStats } from "../hooks/useStats";
import { useFavorites } from "../hooks/useFavorites";
import { useAuthStore } from "../store/authStore";
import { useI18n } from "../i18n/useI18n";
import { useState } from "react";
import { format } from "date-fns";

export function ProfilePage() {
  const { t, dateFnsLocale } = useI18n();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const { data: stats, isLoading } = useStats();
  const { data: favoritesData } = useFavorites(undefined, 1, 20);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-text font-bold text-2xl">{t("navigation.profile")}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/profile/settings")}
            className="p-2 text-text-muted hover:text-text transition-colors"
          >
            <Settings size={22} />
          </button>
          <button
            onClick={() => setShowLogoutAlert(true)}
            className="p-2 text-text-muted hover:text-danger transition-colors"
          >
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      ) : stats ? (
        <>
          <div className="flex items-center gap-4 mb-6">
            <Avatar username={stats?.recentActivity?.[0]?.showTitle ?? "User"} size={64} />
            <div>
              <p className="text-text font-bold text-lg">{t("screens.profile.welcome")}</p>
              <p className="text-text-muted text-sm">
                {t("screens.profile.memberSince")}: {format(new Date(stats.memberSince), "MMMM yyyy", { locale: dateFnsLocale })}
              </p>
              <div className="mt-2">
                <StreakBadge streak={stats.watchStreak} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <StatCard label={t("screens.profile.statsTvShows")} value={stats.tvCount} icon={<Tv size={20} />} />
            <StatCard label={t("screens.profile.statsMovies")} value={stats.movieCount} icon={<Film size={20} />} />
            <StatCard label={t("screens.profile.statsEpisodes")} value={stats.episodesWatched} icon={<Clock size={20} />} />
            <StatCard label={t("screens.profile.statsHours")} value={stats.hoursWatched} icon={<Clock size={20} />} />
            <StatCard label={t("screens.profile.statsComments")} value={stats.commentsCount} icon={<MessageSquare size={20} />} />
            <StatCard label={t("screens.profile.statsReactions")} value={stats.reactionsCount} icon={<ThumbsUp size={20} />} />
          </div>

          {stats.genreBreakdown.length > 0 && (
            <div className="mb-6">
              <SectionHeader title={t("screens.profile.genreBreakdown")} />
              <GenreBreakdown genres={stats.genreBreakdown} />
            </div>
          )}

          {favoritesData && favoritesData.data.length > 0 && (
            <div className="mb-6">
              <SectionHeader title={t("screens.profile.favorites")} />
              <FavoriteCarousel favorites={favoritesData.data} />
            </div>
          )}

          {stats.recentActivity.length > 0 && (
            <div className="mb-6">
              <SectionHeader title={t("screens.profile.recentActivity")} />
              <RecentActivity activities={stats.recentActivity} />
            </div>
          )}
        </>
      ) : (
        <p className="text-text-muted text-center py-8">{t("errors.unknown")}</p>
      )}

      <CustomAlert
        open={showLogoutAlert}
        title={t("screens.profile.logout")}
        message={t("screens.profile.logoutConfirm")}
        confirmLabel={t("screens.profile.logout")}
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutAlert(false)}
      />
    </PageWrapper>
  );
}
