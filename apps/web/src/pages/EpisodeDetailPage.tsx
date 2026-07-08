import { useParams, useNavigate } from "react-router-dom";
import { MessageSquare, Share2, Calendar, Clock, ChevronLeft, ChevronRight, Tv, CheckCircle, Circle } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { DetailHeader } from "../components/DetailHeader";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { RatingCard } from "../components/RatingCard";
import { CommentItem } from "../components/Comments/CommentItem";
import { CustomAlert } from "../components/CustomAlert";
import { getStillUrl, getProfileUrl } from "../services/shows.service";
import type { Episode, CastMember, Season } from "../services/shows.service";
import type { Comment } from "../services/comments.service";
import { useShowDetails } from "../hooks/useShowDetails";
import { useSeasonDetails } from "../hooks/useSeasonDetails";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useRatingsForShow } from "../hooks/useRatingsForShow";
import { useCommentsForShow } from "../hooks/useCommentsForShow";
import { useToggleEpisode, useMarkUpTo } from "../hooks/useTracking";
import { useUpsertRating } from "../hooks/useRatings";
import { useLikeComment, useUnlikeComment, useDeleteComment, useUpdateComment } from "../hooks/useComments";
import { useRefreshRateLimit } from "../hooks/useRefreshRateLimit";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";

export function EpisodeDetailPage() {
  const { tmdbId, season, episode } = useParams<{ tmdbId: string; season: string; episode: string }>();
  const navigate = useNavigate();
  const { t, dateFnsLocale } = useI18n();
  const { showSnackbar, showAlert, alert, hideAlert } = useUIStore();
  const userId = useAuthStore((s) => s.userId);

  const tmdbIdNum = Number(tmdbId);
  const seasonNum = Number(season);
  const episodeNum = Number(episode);

  const { data: show, isLoading: isLoadingShow, isError: isErrorShow, refetch: refetchShow } = useShowDetails(tmdbIdNum);
  const { data: seasonDetails, isLoading: isLoadingSeason, isError: isErrorSeason, refetch: refetchSeason } = useSeasonDetails(tmdbIdNum, seasonNum);
  const { data: tracking, refetch: refetchTracking } = useTrackingEntry(show?.id ?? "");
  const { data: ratings, refetch: refetchRatings } = useRatingsForShow(show?.id ?? "");
  const { data: commentsData, refetch: refetchComments } = useCommentsForShow(show?.id ?? "", {
    season: seasonNum,
    episode: episodeNum,
    sort: "recent",
    limit: 3,
  });
  const throttledRefresh = useRefreshRateLimit();

  const toggleEpisode = useToggleEpisode(show?.id ?? "", tmdbIdNum);
  const markUpTo = useMarkUpTo(show?.id ?? "", tmdbIdNum);
  const upsertRating = useUpsertRating(show?.id ?? "");
  const likeComment = useLikeComment(show?.id ?? "", { season: seasonNum, episode: episodeNum });
  const unlikeComment = useUnlikeComment(show?.id ?? "", { season: seasonNum, episode: episodeNum });
  const deleteComment = useDeleteComment(show?.id ?? "", { season: seasonNum, episode: episodeNum });
  const updateComment = useUpdateComment(show?.id ?? "", { season: seasonNum, episode: episodeNum });

  const episodeData = seasonDetails?.episodes.find((e: Episode) => e.episodeNumber === episodeNum);

  const allEpisodes = useMemo<Array<{ season: number; episode: number }>>(() => {
    if (!show) return [];
    return show.seasons.flatMap((s: Season) =>
      Array.from({ length: s.episodeCount }, (_, i) => i + 1).map((ep: number) => ({ season: s.seasonNumber, episode: ep })),
    );
  }, [show]);

  const currentIndex = useMemo<number>(
    () => allEpisodes.findIndex((e) => e.season === seasonNum && e.episode === episodeNum),
    [allEpisodes, seasonNum, episodeNum],
  );

  const previousEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : undefined;
  const nextEpisode = currentIndex >= 0 && currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : undefined;

  const watchedKeys = useMemo<Set<string>>(
    () =>
      new Set(
        (tracking?.watchedEpisodes ?? []).map((e: { season: number; episode: number }) => `${e.season}-${e.episode}`),
      ),
    [tracking?.watchedEpisodes],
  );

  const isWatched = watchedKeys.has(`${seasonNum}-${episodeNum}`);

  const episodeRating = useMemo(() => {
    const found = ratings?.user.episodes.find((e: { season: number; episode: number; value: number }) => e.season === seasonNum && e.episode === episodeNum);
    return found?.value ?? null;
  }, [ratings, seasonNum, episodeNum]);

  const communityEpisodeRating = useMemo(() => {
    const found = ratings?.community.episodes.find((e: { season: number; episode: number; average: number; count: number }) => e.season === seasonNum && e.episode === episodeNum);
    return found ?? ratings?.community.show ?? null;
  }, [ratings, seasonNum, episodeNum]);

  const previewComments = useMemo<Comment[]>(() => (commentsData?.comments ?? []).slice(0, 3), [commentsData]);

  const handleToggleWatched = () => {
    if (!show || show.type !== "tv") return;
    const nextIsWatched = !isWatched;
    if (!nextIsWatched) {
      toggleEpisode.mutate({ season: seasonNum, episode: episodeNum, watched: false });
      return;
    }

    const previousUnwatched = show.seasons.flatMap((s: Season) => {
      const count = s.episodeCount ?? s.episodes?.length ?? 0;
      const numbers = Array.from({ length: count }, (_, i) => i + 1);
      return numbers
        .filter((ep: number) => {
          if (s.seasonNumber < seasonNum) return true;
          if (s.seasonNumber > seasonNum) return false;
          return ep < episodeNum;
        })
        .map((ep: number) => ({ season: s.seasonNumber, episode: ep }));
    }).filter((ep: { season: number; episode: number }) => !watchedKeys.has(`${ep.season}-${ep.episode}`));

    if (previousUnwatched.length === 0) {
      toggleEpisode.mutate({ season: seasonNum, episode: episodeNum, watched: true });
      return;
    }

    showAlert({
      title: t("screens.episode.markPreviousTitle"),
      message: t("screens.episode.markPreviousMessage", { count: previousUnwatched.length }),
      confirmLabel: t("common.yes"),
      cancelLabel: t("common.no"),
      variant: "default",
      onConfirm: handleMarkPreviousConfirmed,
      onCancel: () => {
        toggleEpisode.mutate({ season: seasonNum, episode: episodeNum, watched: true });
      },
    });
  };

  const handleMarkPreviousConfirmed = () => {
    markUpTo.mutate(
      { season: seasonNum, episode: episodeNum, includePrevious: true },
      {
        onSuccess: () => {
          refetchTracking();
        },
        onError: () => showSnackbar(t("screens.episode.markError"), "error"),
      },
    );
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: show?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      showSnackbar(t("common.linkCopied"), "success");
    }
  };

  const navigateToComments = () => {
    navigate(`/show/${tmdbId}/comments?season=${seasonNum}&episode=${episodeNum}`);
  };

  const handleOpenComments = () => {
    if (isWatched) {
      navigateToComments();
      return;
    }
    showAlert({
      title: t("screens.comments.spoilerWarningTitle"),
      message: t("screens.comments.spoilerWarningMessage", { title: episodeData?.name ?? `S${seasonNum}E${episodeNum}` }),
      confirmLabel: t("screens.comments.markWatchedAndProceed"),
      cancelLabel: t("common.cancel"),
      variant: "default",
      onConfirm: () => {
        toggleEpisode.mutate(
          { season: seasonNum, episode: episodeNum, watched: true },
          {
            onSuccess: () => {
              hideAlert();
              navigateToComments();
            },
            onError: () => showSnackbar(t("screens.episode.markError"), "error"),
          },
        );
      },
      onCancel: () => {
        hideAlert();
        navigateToComments();
      },
    });
  };

  const handleNavigate = (target: { season: number; episode: number }) => {
    navigate(`/show/${tmdbId}/episode/${target.season}/${target.episode}`);
  };

  const handleRatingChange = (value: number) => {
    upsertRating.mutate(
      { value, episodeRef: { season: seasonNum, episode: episodeNum } },
      { onError: () => showSnackbar(t("screens.episode.ratingError"), "error") },
    );
  };

  const refetch = () => {
    throttledRefresh(() => {
      refetchShow();
      refetchSeason();
      refetchTracking();
      refetchRatings();
      refetchComments();
    });
  };

  const isLoading = isLoadingShow || isLoadingSeason;
  const isError = isErrorShow || isErrorSeason;

  if (isLoading || !show || !seasonDetails) {
    const headerTitle = `S${seasonNum}E${episodeNum}`;
    return (
      <PageWrapper>
        <DetailHeader title={headerTitle} onBack={() => navigate(-1)} />
        <div className="space-y-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (isError || !episodeData) {
    const headerTitle = `S${seasonNum}E${episodeNum}`;
    return (
      <PageWrapper>
        <DetailHeader title={headerTitle} onBack={() => navigate(-1)} />
        <NetworkError onRetry={refetch} />
      </PageWrapper>
    );
  }

  const stillUrl = getStillUrl(episodeData.stillPath, 500);
  const headerTitle = episodeData?.name ?? `S${seasonNum}E${episodeNum}`;

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <DetailHeader
        title={headerTitle}
        onBack={() => navigate(-1)}
        rightElement={
          <button
            onClick={handleToggleWatched}
            disabled={toggleEpisode.isPending || markUpTo.isPending}
            className="p-1"
          >
            {isWatched ? (
              <CheckCircle size={26} className="text-primary" />
            ) : (
              <Circle size={26} className="text-text" />
            )}
          </button>
        }
      />

      {stillUrl && (
        <img src={stillUrl} alt={episodeData.name} className="w-full h-48 sm:h-64 rounded-xl object-cover mb-4" />
      )}

      <div className="flex items-center gap-2 mb-1">
        <span className="text-primary font-bold text-base">S{seasonNum}E{episodeNum}</span>
        {isWatched && (
          <span className="ml-3 px-2 py-1 rounded-full bg-primary/20">
            <span className="text-primary text-xs font-semibold">{t("screens.episode.watched")}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-text-muted text-xs mb-4">
        {episodeData.airDate && !Number.isNaN(new Date(episodeData.airDate).getTime()) && (
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {format(new Date(episodeData.airDate), "EEEE d MMMM yyyy", { locale: dateFnsLocale })}
          </span>
        )}
        {episodeData.runtime && (
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {episodeData.runtime} {t("common.minutesShort")}
          </span>
        )}
      </div>

      {episodeData.overview ? (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-text mb-2">{t("screens.showDetail.synopsis")}</h3>
          <p className="text-text leading-relaxed">{episodeData.overview}</p>
        </div>
      ) : (
        <p className="text-text-muted italic mb-6">{t("screens.episode.noOverview")}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={handleShare}
          className="flex items-center px-4 py-3 rounded-lg bg-surface border border-border hover:bg-surface-light transition-colors"
        >
          <Share2 size={18} className="text-primary mr-2" />
          <span className="font-semibold text-text">{t("common.share")}</span>
        </button>

        <button
          onClick={handleOpenComments}
          className="flex items-center px-4 py-3 rounded-lg bg-surface border border-border hover:bg-surface-light transition-colors"
        >
          <MessageSquare size={18} className="text-primary mr-2" />
          <span className="font-semibold text-text">{t("screens.showDetail.comments")}</span>
          {commentsData && commentsData.total > 0 && (
            <span className="ml-2 bg-primary/20 rounded-full px-2 py-0.5">
              <span className="text-primary text-xs font-semibold">{commentsData.total}</span>
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <RatingCard
          showId={show.id}
          ratings={ratings}
          onRate={handleRatingChange}
          episodeRef={{ season: seasonNum, episode: episodeNum }}
        />
      </div>

      {/* Cast */}
      {show.cast && show.cast.length > 0 && (
        <div className="mb-6">
          <h3 className="text-text font-semibold text-sm mb-3">{t("screens.showDetail.cast")}</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {show.cast.slice(0, 10).map((member: CastMember) => (
              <div key={member.id} className="shrink-0 text-center">
                {member.profilePath && (
                  <img
                    src={getProfileUrl(member.profilePath, 150)}
                    alt={member.name}
                    className="w-16 h-16 rounded-full object-cover mb-1"
                    loading="lazy"
                  />
                )}
                <p className="text-text text-xs font-medium truncate w-20">{member.name}</p>
                <p className="text-text-muted text-xs truncate w-20">{member.character}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments preview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <h3 className="text-text font-semibold text-sm">{t("screens.showDetail.comments")}</h3>
            {commentsData && commentsData.total > 0 && (
              <span className="ml-2 bg-primary/20 rounded-full px-2 py-0.5">
                <span className="text-primary text-xs font-semibold">{commentsData.total}</span>
              </span>
            )}
          </div>
          <button onClick={handleOpenComments} className="text-primary text-sm font-semibold hover:underline">
            {t("common.seeAll")}
          </button>
        </div>
        {previewComments.length > 0 ? (
          <div className="space-y-2">
            {previewComments.map((comment: Comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                showId={show.id}
                title={episodeData.name ?? `S${seasonNum}E${episodeNum}`}
                season={seasonNum}
                episode={episodeNum}
                onEdit={(id, content) => updateComment.mutate({ id, content })}
                onDelete={(id) => deleteComment.mutate(id)}
                onLike={(id) => likeComment.mutate(id)}
                onUnlike={(id) => unlikeComment.mutate(id)}
                isOwnComment={comment.userId === userId}
              />
            ))}
          </div>
        ) : (
          <button
            onClick={handleOpenComments}
            className="w-full py-12 flex flex-col items-center justify-center bg-surface rounded-lg hover:bg-surface-light transition-colors"
          >
            <MessageSquare size={40} className="text-text-muted mb-2" />
            <p className="text-text-muted text-sm text-center">{t("screens.comments.empty")}</p>
            <p className="text-text-muted text-xs text-center">{t("screens.comments.beFirst")}</p>
          </button>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 bg-background border-t border-border flex items-center justify-between z-10">
        <button
          onClick={() => previousEpisode && handleNavigate(previousEpisode)}
          disabled={!previousEpisode}
          className={`flex items-center px-4 py-2 rounded-lg ${previousEpisode ? "bg-surface hover:bg-surface-light" : "opacity-30"}`}
        >
          <ChevronLeft size={18} className="text-text" />
          <span className="text-text ml-1 text-sm">{t("common.previous")}</span>
        </button>
        <button
          onClick={() => navigate(`/show/${tmdbId}`)}
          className="flex items-center px-4 py-2 rounded-lg bg-surface hover:bg-surface-light"
        >
          <Tv size={18} className="text-primary mr-1" />
          <span className="text-primary text-sm font-semibold">{t("common.backToSeries")}</span>
        </button>
        <button
          onClick={() => nextEpisode && handleNavigate(nextEpisode)}
          disabled={!nextEpisode}
          className={`flex items-center px-4 py-2 rounded-lg ${nextEpisode ? "bg-surface hover:bg-surface-light" : "opacity-30"}`}
        >
          <span className="text-text mr-1 text-sm">{t("common.next")}</span>
          <ChevronRight size={18} className="text-text" />
        </button>
      </div>

      {/* Alert for marking previous episodes */}
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
