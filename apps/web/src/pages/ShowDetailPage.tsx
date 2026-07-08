import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MessageSquare, Calendar, Clock, Tv } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { DetailHeader } from "../components/DetailHeader";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { RatingCard } from "../components/RatingCard";
import { EpisodeGrid } from "../components/EpisodeGrid";
import { TrackingActionModal } from "../components/TrackingActionModal";
import { FixedTrackingButton } from "../components/FixedTrackingButton";
import { ProgressBar } from "../components/ProgressBar";
import { getPosterUrl, getBackdropUrl } from "../services/shows.service";
import type { Genre, Season } from "../services/shows.service";
import { useShowDetails } from "../hooks/useShowDetails";
import { useSeasonDetails } from "../hooks/useSeasonDetails";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useRatingsForShow } from "../hooks/useRatingsForShow";
import { useCommentCount } from "../hooks/useCommentCount";
import { useUpsertTracking, useToggleEpisode, useMarkUpTo, useMarkAllAired, useDeleteTracking, useUnmarkSeason, useToggleDropped } from "../hooks/useTracking";
import { useUpsertRating } from "../hooks/useRatings";
import { useShowDetailsRealtime } from "../hooks/useShowDetailsRealtime";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";

export function ShowDetailPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { showSnackbar } = useUIStore();
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);

  const tmdbIdNum = Number(tmdbId);
  const { data: show, isLoading, isError, refetch } = useShowDetails(tmdbIdNum);
  const { data: tracking } = useTrackingEntry(show?.id ?? "");
  const { data: ratings } = useRatingsForShow(show?.id ?? "");
  const { data: commentCount } = useCommentCount(show?.id ?? "");

  const seasonToFetch = selectedSeason ?? show?.seasons?.[0]?.seasonNumber ?? 1;
  const { data: seasonDetails } = useSeasonDetails(tmdbIdNum, seasonToFetch);

  useShowDetailsRealtime(show?.id ?? "", tmdbIdNum);

  const upsertTracking = useUpsertTracking(show?.id ?? "", tmdbIdNum);
  const toggleEpisode = useToggleEpisode(show?.id ?? "", tmdbIdNum);
  const markUpTo = useMarkUpTo(show?.id ?? "", tmdbIdNum);
  const markAllAired = useMarkAllAired(show?.id ?? "", tmdbIdNum);
  const deleteTracking = useDeleteTracking(show?.id ?? "", tmdbIdNum);
  const unmarkSeason = useUnmarkSeason(show?.id ?? "", tmdbIdNum);
  const toggleDropped = useToggleDropped(show?.id ?? "", tmdbIdNum);
  const upsertRating = useUpsertRating(show?.id ?? "");

  if (isLoading) {
    return (
      <PageWrapper>
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-32 w-full" />
      </PageWrapper>
    );
  }

  if (isError || !show) {
    return (
      <PageWrapper>
        <NetworkError onRetry={refetch} />
      </PageWrapper>
    );
  }

  const watchedEpisodes = new Set<string>(
    tracking?.watchedEpisodes.map((e: { season: number; episode: number }) => `S${e.season}E${e.episode}`) ?? [],
  );

  function handleToggleEpisode(season: number, episode: number) {
    const isWatched = watchedEpisodes.has(`S${season}E${episode}`);
    toggleEpisode.mutate(
      { season, episode, watched: !isWatched },
      {
        onError: () => showSnackbar(t("errors.unknown"), "error"),
      },
    );
  }

  const posterUrl = getPosterUrl(show.posterPath, 300);
  const backdropUrl = getBackdropUrl(show.posterPath, 780);

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <DetailHeader title={show.title} />

      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden mb-6">
        {backdropUrl && (
          <img src={backdropUrl} alt={show.title} className="w-full h-48 sm:h-64 object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-4">
          {posterUrl && (
            <img src={posterUrl} alt={show.title} className="w-20 h-30 rounded-md object-cover border-2 border-surface" />
          )}
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg">{show.title}</h2>
            <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
              {show.firstAirDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(show.firstAirDate).getFullYear()}
                </span>
              )}
              {show.runtime && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {show.runtime}min
                </span>
              )}
              {show.numberOfSeasons && (
                <span className="flex items-center gap-1">
                  <Tv size={12} />
                  {show.numberOfSeasons} {t("common.seasons")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overview */}
      {show.overview && (
        <p className="text-text-muted text-sm mb-6">{show.overview}</p>
      )}

      {/* Genres */}
      {show.genres && show.genres.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {show.genres.map((g: Genre) => (
            <span key={g.id} className="bg-surface text-text-muted text-xs px-3 py-1 rounded-full">
              {g.name}
            </span>
          ))}
        </div>
      )}

      {/* Tracking */}
      {tracking && (
        <div className="bg-surface rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text font-medium text-sm">{t("screens.showDetail.tracking")}</span>
            <span className="text-text-muted text-xs">{tracking.status.replace(/_/g, " ")}</span>
          </div>
          {show.type === "tv" && tracking.totalEpisodes && (
            <>
              <ProgressBar watched={tracking.watchedCount ?? 0} total={tracking.totalEpisodes} />
              <p className="text-text-muted text-xs mt-1">
                {tracking.watchedCount ?? 0}/{tracking.totalEpisodes} {t("common.episodes")}
              </p>
            </>
          )}
        </div>
      )}

      {/* Seasons & Episodes */}
      {show.type === "tv" && show.seasons.length > 0 && (
        <div className="mb-6">
          <h3 className="text-text font-semibold text-sm mb-3">{t("common.seasons")}</h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3">
            {show.seasons.map((s: Season) => (
              <button
                key={s.seasonNumber}
                onClick={() => setSelectedSeason(s.seasonNumber)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  seasonToFetch === s.seasonNumber
                    ? "bg-primary text-background"
                    : "bg-surface text-text-muted hover:text-text"
                }`}
              >
                {t("common.season")} {s.seasonNumber}
              </button>
            ))}
          </div>
          {seasonDetails && (
            <EpisodeGrid
              episodes={seasonDetails.episodes}
              seasonNumber={seasonDetails.seasonNumber}
              watchedEpisodes={watchedEpisodes}
              onToggle={handleToggleEpisode}
            />
          )}
        </div>
      )}

      {/* Rating */}
      <div className="mb-6">
        <RatingCard
          showId={show.id}
          ratings={ratings}
          onRate={(value) => upsertRating.mutate({ value })}
        />
      </div>

      {/* Comments link */}
      <button
        onClick={() => navigate(`/show/${tmdbId}/comments`)}
        className="flex items-center gap-2 text-primary text-sm font-medium hover:underline"
      >
        <MessageSquare size={18} />
        {t("comments.title")} ({commentCount?.total ?? 0})
      </button>

      {/* Tracking FAB */}
      <FixedTrackingButton
        onClick={() => setTrackingModalOpen(true)}
        label={t("screens.showDetail.tracking")}
      />

      <TrackingActionModal
        open={trackingModalOpen}
        onClose={() => setTrackingModalOpen(false)}
        status={tracking?.status ?? null}
        onStatusChange={(s) => upsertTracking.mutate({ status: s })}
        onMarkUpTo={(s, e) => markUpTo.mutate({ season: s, episode: e, includePrevious: true })}
        onMarkAllAired={(s) => markAllAired.mutate({ season: s })}
        onUnmarkSeason={(s) => unmarkSeason.mutate(s)}
        onDelete={() => {
          deleteTracking.mutate(undefined, {
            onSuccess: () => showSnackbar(t("screens.showDetail.removed"), "success"),
          });
          setTrackingModalOpen(false);
        }}
        onToggleDropped={(d) => toggleDropped.mutate(d)}
        currentSeason={tracking?.currentSeason ?? 1}
        currentEpisode={tracking?.currentEpisode ?? 1}
        isDropped={tracking?.status === "dropped"}
      />
    </PageWrapper>
  );
}
