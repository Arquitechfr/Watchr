import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MessageSquare, Calendar, Clock, Tv, CheckCircle, Circle, CheckCheck, ChevronRight, Star, User } from "lucide-react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { DetailHeader } from "../components/DetailHeader";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { RatingCard } from "../components/RatingCard";
import { LazyEpisodeGrid } from "../components/LazyEpisodeGrid";
import { TrackingActionModal } from "../components/TrackingActionModal";
import { FixedTrackingButton } from "../components/FixedTrackingButton";
import { ProgressBar } from "../components/ProgressBar";
import { CustomAlert } from "../components/CustomAlert";
import { getPosterUrl, getProfileUrl } from "../services/shows.service";
import type { Genre, Episode, CastMember, CrewMember, Network as ShowNetwork } from "../services/shows.service";
import type { WatchStatus } from "../services/tracking.service";
import { useShowDetails } from "../hooks/useShowDetails";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useRatingsForShow } from "../hooks/useRatingsForShow";
import { useCommentCount } from "../hooks/useCommentCount";
import {
  useUpsertTracking,
  useToggleEpisode,
  useMarkUpTo,
  useMarkAllAired,
  useDeleteTracking,
  useUnmarkSeason,
  useToggleDropped,
} from "../hooks/useTracking";
import { useUpsertRating } from "../hooks/useRatings";
import { useShowDetailsRealtime } from "../hooks/useShowDetailsRealtime";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";

function getStatusLabel(t: ReturnType<typeof useI18n>["t"], status: WatchStatus): string {
  switch (status) {
    case "watching":
      return t("screens.showDetail.inProgress");
    case "completed":
      return t("screens.showDetail.completed");
    case "plan_to_watch":
      return t("screens.showDetail.planToWatch");
    case "dropped":
      return t("screens.showDetail.dropped");
  }
}

function getTmdbStatusLabel(t: ReturnType<typeof useI18n>["t"], status: string): string {
  const key = status.replace(/\s+/g, "").replace(/-/g, "");
  const lowerKey = key.charAt(0).toLowerCase() + key.slice(1);
  const translation = t(`tmdbStatus.${lowerKey}`);
  return translation !== `tmdbStatus.${lowerKey}` ? translation : status;
}

function CastMemberCard({ member }: { member: CastMember }) {
  const { t } = useI18n();
  const profileUrl = getProfileUrl(member.profilePath, 200);
  return (
    <div className="shrink-0 text-center mr-3" style={{ width: 80 }}>
      {profileUrl ? (
        <img
          src={profileUrl}
          alt={member.name ?? ""}
          className="w-20 h-20 rounded-full bg-surface-light mb-2 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-surface-light flex items-center justify-center mb-2">
          <User size={28} className="text-text-muted" />
        </div>
      )}
      <p className="text-text text-xs font-medium text-center line-clamp-2">
        {member.name ?? t("common.unknown")}
      </p>
      {member.character && (
        <p className="text-text-muted text-xs text-center mt-0.5 line-clamp-1">
          {member.character}
        </p>
      )}
    </div>
  );
}

function CrewMemberCard({ member }: { member: CrewMember }) {
  const { t } = useI18n();
  const profileUrl = getProfileUrl(member.profilePath, 200);
  return (
    <div className="shrink-0 text-center mr-3" style={{ width: 80 }}>
      {profileUrl ? (
        <img
          src={profileUrl}
          alt={member.name ?? ""}
          className="w-20 h-20 rounded-full bg-surface-light mb-2 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-surface-light flex items-center justify-center mb-2">
          <User size={28} className="text-text-muted" />
        </div>
      )}
      <p className="text-text text-xs font-medium text-center line-clamp-2">
        {member.name ?? t("common.unknown")}
      </p>
      {member.job && (
        <p className="text-text-muted text-xs text-center mt-0.5 line-clamp-1">
          {member.job}
        </p>
      )}
    </div>
  );
}

export function ShowDetailPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { showSnackbar, showAlert, alert, hideAlert } = useUIStore();
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);

  const tmdbIdNum = Number(tmdbId);
  const isValidTmdbId = Number.isFinite(tmdbIdNum) && tmdbIdNum > 0;

  const { data: show, isLoading, isError, refetch } = useShowDetails(tmdbIdNum);
  const { data: tracking, refetch: refetchTracking } = useTrackingEntry(show?.id ?? "");
  const { data: ratings, refetch: refetchRatings } = useRatingsForShow(show?.id ?? "");
  const { data: commentCount } = useCommentCount(show?.id ?? "");
  const throttledRefresh = useRefreshRateLimit();

  useShowDetailsRealtime(show?.id ?? "", tmdbIdNum);

  const upsertTracking = useUpsertTracking(show?.id ?? "", tmdbIdNum);
  const toggleEpisode = useToggleEpisode(show?.id ?? "", tmdbIdNum);
  const markUpTo = useMarkUpTo(show?.id ?? "", tmdbIdNum);
  const markAllAired = useMarkAllAired(show?.id ?? "", tmdbIdNum);
  const deleteTracking = useDeleteTracking(show?.id ?? "", tmdbIdNum);
  const unmarkSeason = useUnmarkSeason(show?.id ?? "", tmdbIdNum);
  const toggleDropped = useToggleDropped(show?.id ?? "", tmdbIdNum);
  const upsertRating = useUpsertRating(show?.id ?? "");

  const progress = useMemo(() => {
    if (!show || show.type !== "tv") {
      if (tracking?.status === "completed") return 1;
      return 0;
    }
    if (tracking?.totalEpisodes) {
      return Math.min(1, (tracking.watchedCount ?? 0) / tracking.totalEpisodes);
    }
    return 0;
  }, [show, tracking]);

  const allAiredWatched = useMemo(() => {
    const total = tracking?.totalEpisodes ?? 0;
    const watched = tracking?.watchedCount ?? 0;
    return total > 0 && watched >= total;
  }, [tracking]);

  const isAnyPending =
    upsertTracking.isPending || markUpTo.isPending || markAllAired.isPending || toggleEpisode.isPending || upsertRating.isPending;

  const handleRefresh = () => {
    refetch();
    if (show?.id) {
      refetchTracking();
      refetchRatings();
    }
  };

  const navigateToComments = () => {
    if (!show) return;
    navigate(`/show/${tmdbId}/comments`);
  };

  const handleOpenComments = () => {
    if (!show) return;
    const hasWatched =
      show.type === "movie"
        ? tracking?.status === "completed"
        : (tracking?.watchedCount ?? 0) > 0;
    if (hasWatched) {
      navigateToComments();
      return;
    }
    showAlert({
      title: t("screens.comments.spoilerWarningTitle"),
      message: t("screens.comments.spoilerWarningMessage", { title: show.title }),
      confirmLabel: t("screens.comments.markWatchedAndProceed"),
      cancelLabel: t("common.cancel"),
      variant: "default",
      onConfirm: () => {
        if (show.type === "movie") {
          upsertTracking.mutate(
            { status: "completed" },
            {
              onSuccess: () => {
                hideAlert();
                navigateToComments();
              },
              onError: () => showSnackbar(t("screens.showDetail.updateTrackingError"), "error"),
            },
          );
        } else {
          hideAlert();
          navigateToComments();
        }
      },
      onCancel: () => {
        hideAlert();
        navigateToComments();
      },
    });
  };

  const handleSaveTracking = (payload: {
    currentSeason?: number;
    currentEpisode?: number;
    includePrevious: boolean;
    rating?: number | null;
  }) => {
    if (!show) return;
    upsertTracking.mutate(
      {
        currentSeason: payload.currentSeason,
        currentEpisode: payload.currentEpisode,
      },
      {
        onSuccess: () => {
          if (show.type === "tv" && payload.currentSeason && payload.currentEpisode) {
            markUpTo.mutate(
              {
                season: payload.currentSeason,
                episode: payload.currentEpisode,
                includePrevious: payload.includePrevious,
              },
              {
                onError: () => showSnackbar(t("screens.showDetail.updateProgressError"), "error"),
              },
            );
          }
          if (payload.rating !== undefined && payload.rating !== null) {
            upsertRating.mutate({ value: payload.rating });
          }
          setTrackingModalOpen(false);
        },
        onError: () => showSnackbar(t("screens.showDetail.updateTrackingError"), "error"),
      },
    );
  };

  const handleToggleEpisode = (season: number, episode: number, watched: boolean) => {
    toggleEpisode.mutate({ season, episode, watched });
  };

  const handleMarkAllAired = () => {
    if (!show) return;
    if (allAiredWatched) {
      showSnackbar(t("screens.showDetail.markAllAiredAlreadyUpToDate"), "info");
      return;
    }
    showAlert({
      title: t("screens.showDetail.markAllAiredConfirmTitle"),
      message: t("screens.showDetail.markAllAiredConfirmMessage"),
      confirmLabel: t("common.confirm"),
      cancelLabel: t("common.cancel"),
      variant: "default",
      onConfirm: () => {
        markAllAired.mutate(
          {},
          {
            onSuccess: () => showSnackbar(t("screens.showDetail.markAllAiredSuccess"), "success"),
            onError: () => showSnackbar(t("screens.showDetail.markAllAiredError"), "error"),
          },
        );
      },
      onCancel: () => hideAlert(),
    });
  };

  const handleMarkSeasonAired = (seasonNumber: number) => {
    if (!show) return;
    showAlert({
      title: t("screens.showDetail.markSeasonAiredConfirmTitle", { season: seasonNumber }),
      message: t("screens.showDetail.markSeasonAiredConfirmMessage"),
      confirmLabel: t("common.confirm"),
      cancelLabel: t("common.cancel"),
      variant: "default",
      onConfirm: () => {
        markAllAired.mutate(
          { season: seasonNumber },
          {
            onSuccess: () => showSnackbar(t("screens.showDetail.markAllAiredSuccess"), "success"),
            onError: () => showSnackbar(t("screens.showDetail.markAllAiredError"), "error"),
          },
        );
      },
      onCancel: () => hideAlert(),
    });
  };

  const handleToggleDropped = () => {
    if (!show) return;
    const isDropped = tracking?.status === "dropped";
    if (isDropped) {
      toggleDropped.mutate(false, {
        onSuccess: () => showSnackbar(t("screens.showDetail.undrop"), "success"),
        onError: () => showSnackbar(t("screens.showDetail.statusError"), "error"),
      });
      return;
    }
    showAlert({
      title: t("screens.showDetail.dropConfirmTitle"),
      message: t("screens.showDetail.dropConfirmMessage"),
      confirmLabel: t("common.confirm"),
      cancelLabel: t("common.cancel"),
      variant: "danger",
      onConfirm: () => {
        toggleDropped.mutate(true, {
          onSuccess: () => showSnackbar(t("screens.showDetail.droppedStatus"), "success"),
          onError: () => showSnackbar(t("screens.showDetail.statusError"), "error"),
        });
      },
      onCancel: () => hideAlert(),
    });
  };

  const handleToggleWatched = () => {
    if (!show) return;
    const isWatched = tracking?.status === "completed";
    const nextStatus = isWatched ? "plan_to_watch" : "completed";
    upsertTracking.mutate(
      { status: nextStatus },
      {
        onSuccess: () => {
          showSnackbar(isWatched ? t("screens.showDetail.markUnwatched") : t("screens.showDetail.markWatched"), "success");
        },
        onError: () => showSnackbar(t("screens.showDetail.statusError"), "error"),
      },
    );
  };

  const handleOpenEpisodeDetail = (season: number, episode: Episode) => {
    if (!show) return;
    navigate(`/show/${tmdbId}/episode/${season}/${episode.episodeNumber}`);
  };

  if (!isValidTmdbId) {
    return (
      <PageWrapper>
        <NetworkError onRetry={() => navigate(-1)} />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper>
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-32 w-full" />
      </PageWrapper>
    );
  }

  if (isError || !show) {
    return (
      <PageWrapper>
        <NetworkError onRetry={() => throttledRefresh(refetch)} />
      </PageWrapper>
    );
  }

  const posterUrl = getPosterUrl(show.posterPath, 500);

  return (
    <PageWrapper maxWidth="max-w-4xl">
      <DetailHeader
        title={show.title}
        rightElement={
          show.type === "movie" ? (
            <button
              onClick={handleToggleWatched}
              disabled={upsertTracking.isPending}
              className="p-1"
            >
              {tracking?.status === "completed" ? (
                <CheckCircle size={26} className="text-primary" />
              ) : (
                <Circle size={26} className="text-text" />
              )}
            </button>
          ) : show.type === "tv" ? (
            <button
              onClick={handleMarkAllAired}
              disabled={markAllAired.isPending || toggleEpisode.isPending}
              className="p-1"
              title={t("screens.showDetail.markAllAired")}
            >
              {allAiredWatched ? (
                <CheckCircle size={26} className="text-primary" />
              ) : (
                <CheckCheck size={26} className="text-primary" />
              )}
            </button>
          ) : undefined
        }
      />

      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden mb-6 h-64 sm:h-96 bg-surface-light">
        {posterUrl && (
          <img src={posterUrl} alt={show.title} className="w-full h-full object-cover object-top" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Overview */}
      {show.overview && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.synopsis")}</h3>
          <p className="text-text leading-relaxed">{show.overview}</p>
        </div>
      )}

      {/* Type & Year badges */}
      <div className="flex items-center mb-6">
        <span className="bg-surface rounded-full px-3 py-1 mr-2 text-text text-xs font-medium">
          {show.type === "tv" ? t("common.tv") : t("common.movie")}
        </span>
        {show.firstAirDate && (
          <span className="bg-surface rounded-full px-3 py-1 text-text text-xs font-medium">
            {new Date(show.firstAirDate).getFullYear().toString()}
          </span>
        )}
      </div>

      {/* Ratings */}
      <div className="flex flex-wrap gap-2 mb-6">
        <RatingCard
          value={ratings?.user.show ?? null}
          onChange={(value) => upsertRating.mutate({ value })}
        />
        <RatingCard
          communityData={ratings?.community.show ?? null}
        />
      </div>

      {/* Genres */}
      {show.genres && show.genres.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {show.genres.map((g: Genre) => (
            <span key={g.id} className="bg-surface rounded-full px-3 py-1 text-text text-xs">
              {g.name}
            </span>
          ))}
        </div>
      )}

      {/* Info card */}
      <div className="bg-surface rounded-lg p-4 mb-6">
        <div className="flex flex-wrap justify-between">
          {tracking && (
            <div className="w-1/2 mb-3 pr-2">
              <span className="text-text-muted text-xs uppercase tracking-wider block">{t("screens.showDetail.tracking")}</span>
              <span className="text-text font-medium">{getStatusLabel(t, tracking.status as WatchStatus)}</span>
            </div>
          )}
          {show.status && (
            <div className="w-1/2 mb-3 pr-2">
              <span className="text-text-muted text-xs uppercase tracking-wider block">{t("screens.showDetail.status")}</span>
              <span className="text-text font-medium">{getTmdbStatusLabel(t, show.status)}</span>
            </div>
          )}
          {show.type === "tv" && show.numberOfSeasons !== undefined && (
            <div className="w-1/2 mb-3 pr-2">
              <span className="text-text-muted text-xs uppercase tracking-wider block">{t("screens.showDetail.seasons")}</span>
              <span className="text-text font-medium">{show.numberOfSeasons}</span>
            </div>
          )}
          {show.type === "tv" && show.numberOfEpisodes !== undefined && (
            <div className="w-1/2 mb-3 pr-2">
              <span className="text-text-muted text-xs uppercase tracking-wider block">{t("screens.showDetail.episodes")}</span>
              <span className="text-text font-medium">{show.numberOfEpisodes}</span>
            </div>
          )}
          {show.runtime && (
            <div className="w-1/2 mb-3 pr-2">
              <span className="text-text-muted text-xs uppercase tracking-wider block">{t("screens.showDetail.duration")}</span>
              <span className="text-text font-medium">{show.runtime} {t("common.minutesShort")}</span>
            </div>
          )}
          {show.voteAverage !== undefined && show.voteCount !== undefined && show.voteCount > 0 && (
            <div className="w-1/2 mb-3 pr-2">
              <span className="text-text-muted text-xs uppercase tracking-wider block">{t("screens.showDetail.tmdbRating")}</span>
              <span className="text-text font-medium">{show.voteAverage.toFixed(1)}/10</span>
            </div>
          )}
          {show.networks && show.networks.length > 0 && (
            <div className="w-1/2 mb-3 pr-2">
              <span className="text-text-muted text-xs uppercase tracking-wider block">{t("screens.showDetail.network")}</span>
              <span className="text-text font-medium">{show.networks.map((n: ShowNetwork) => n.name).join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cast */}
      {show.cast && show.cast.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.cast")}</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {show.cast.slice(0, 15).map((member: CastMember, index: number) => (
              <CastMemberCard key={`${member.id}-${index}`} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Crew */}
      {show.crew && show.crew.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text mb-2">
            {show.type === "tv" ? t("screens.showDetail.creators") : t("screens.showDetail.directors")}
          </h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {show.crew.slice(0, 10).map((member: CrewMember, index: number) => (
              <CrewMemberCard key={`${member.id}-${member.job ?? index}`} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* Comments link */}
      {commentCount && commentCount.total > 0 ? (
        <button
          onClick={handleOpenComments}
          className="flex items-center justify-between bg-surface rounded-xl p-4 mb-6 w-full hover:bg-surface-light transition-colors"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mr-3">
              <MessageSquare size={20} className="text-primary" />
            </div>
            <span className="text-text font-semibold">{t("screens.showDetail.comments")}</span>
            <span className="ml-2 bg-primary/20 rounded-full px-2 py-0.5">
              <span className="text-primary text-xs font-semibold">{commentCount.total}</span>
            </span>
          </div>
          <ChevronRight size={20} className="text-text-muted" />
        </button>
      ) : (
        <button
          onClick={handleOpenComments}
          className="py-12 flex flex-col items-center justify-center bg-surface rounded-xl mb-6 w-full hover:bg-surface-light transition-colors"
        >
          <MessageSquare size={40} className="text-text-muted mb-2" />
          <span className="text-text-muted text-center">{t("screens.comments.empty")}</span>
          <span className="text-text-muted text-sm text-center">{t("screens.comments.beFirst")}</span>
        </button>
      )}

      {/* Episodes */}
      {show.type === "tv" && show.seasons.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.episodes")}</h3>
          <LazyEpisodeGrid
            tmdbId={tmdbIdNum}
            seasons={show.seasons}
            watchedEpisodes={tracking?.watchedEpisodes ?? []}
            onToggleEpisode={handleToggleEpisode}
            onPressEpisode={handleOpenEpisodeDetail}
            onMarkSeasonAired={handleMarkSeasonAired}
            isPending={toggleEpisode.isPending || markAllAired.isPending}
          />
        </div>
      )}

      {/* Fixed tracking button */}
      <FixedTrackingButton
        show={show}
        trackingEntry={tracking}
        progress={progress}
        onPress={() => setTrackingModalOpen(true)}
        disabled={isAnyPending || deleteTracking.isPending}
        onToggleWatched={show.type === "movie" ? handleToggleWatched : undefined}
        onToggleDropped={show.type === "tv" ? handleToggleDropped : undefined}
      />

      {/* Tracking modal */}
      <TrackingActionModal
        open={trackingModalOpen}
        onClose={() => setTrackingModalOpen(false)}
        show={show}
        trackingEntry={tracking}
        rating={ratings?.user.show ?? null}
        onSave={handleSaveTracking}
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
        isPending={upsertTracking.isPending || markUpTo.isPending}
      />

      {/* Alert */}
      {alert && (
        <CustomAlert
          open={alert.open}
          title={alert.title}
          message={alert.message}
          confirmLabel={alert.confirmLabel}
          cancelLabel={alert.cancelLabel}
          variant={alert.variant}
          onConfirm={alert.onConfirm}
          onCancel={() => {
            alert.onCancel();
            hideAlert();
          }}
        />
      )}
    </PageWrapper>
  );
}
