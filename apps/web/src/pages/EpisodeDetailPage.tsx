import { useParams, useNavigate } from "react-router-dom";
import { MessageSquare, Share2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { PageWrapper } from "../components/layout/PageWrapper";
import { DetailHeader } from "../components/DetailHeader";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { RatingCard } from "../components/RatingCard";
import { CommentItem } from "../components/Comments/CommentItem";
import { getStillUrl, getProfileUrl } from "../services/shows.service";
import type { Episode, CastMember } from "../services/shows.service";
import type { Comment } from "../services/comments.service";
import { useShowDetails } from "../hooks/useShowDetails";
import { useSeasonDetails } from "../hooks/useSeasonDetails";
import { useTrackingEntry } from "../hooks/useTrackingEntry";
import { useRatingsForShow } from "../hooks/useRatingsForShow";
import { useCommentsForShow } from "../hooks/useCommentsForShow";
import { useToggleEpisode, useMarkUpTo } from "../hooks/useTracking";
import { useUpsertRating } from "../hooks/useRatings";
import { useLikeComment, useUnlikeComment, useDeleteComment, useUpdateComment } from "../hooks/useComments";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useI18n } from "../i18n/useI18n";

export function EpisodeDetailPage() {
  const { tmdbId, season, episode } = useParams<{ tmdbId: string; season: string; episode: string }>();
  const navigate = useNavigate();
  const { t, dateFnsLocale } = useI18n();
  const { showSnackbar } = useUIStore();
  const userId = useAuthStore((s) => s.userId);

  const tmdbIdNum = Number(tmdbId);
  const seasonNum = Number(season);
  const episodeNum = Number(episode);

  const { data: show, isLoading: isLoadingShow, isError: isErrorShow } = useShowDetails(tmdbIdNum);
  const { data: seasonDetails, isLoading: isLoadingSeason } = useSeasonDetails(tmdbIdNum, seasonNum);
  const { data: tracking } = useTrackingEntry(show?.id ?? "");
  const { data: ratings } = useRatingsForShow(show?.id ?? "");
  const { data: commentsData } = useCommentsForShow(show?.id ?? "", {
    season: seasonNum,
    episode: episodeNum,
    sort: "recent",
    limit: 3,
  });

  const toggleEpisode = useToggleEpisode(show?.id ?? "", tmdbIdNum);
  const markUpTo = useMarkUpTo(show?.id ?? "", tmdbIdNum);
  const upsertRating = useUpsertRating(show?.id ?? "");
  const likeComment = useLikeComment(show?.id ?? "");
  const unlikeComment = useUnlikeComment(show?.id ?? "");
  const deleteComment = useDeleteComment(show?.id ?? "");
  const updateComment = useUpdateComment(show?.id ?? "");

  const episodeData = seasonDetails?.episodes.find((e: Episode) => e.episodeNumber === episodeNum);
  const isWatched = tracking?.watchedEpisodes.some(
    (e: { season: number; episode: number }) => e.season === seasonNum && e.episode === episodeNum,
  ) ?? false;

  if (isLoadingShow || isLoadingSeason) {
    return (
      <PageWrapper>
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-32 w-full" />
      </PageWrapper>
    );
  }

  if (isErrorShow || !show || !episodeData) {
    return (
      <PageWrapper>
        <NetworkError />
      </PageWrapper>
    );
  }

  const stillUrl = getStillUrl(episodeData.stillPath, 500);

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: show?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      showSnackbar(t("common.linkCopied"), "success");
    }
  }

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <DetailHeader title={`S${seasonNum}E${episodeNum} - ${episodeData.name ?? ""}`} />

      {stillUrl && (
        <img src={stillUrl} alt={episodeData.name} className="w-full h-48 sm:h-64 rounded-xl object-cover mb-4" />
      )}

      <div className="flex items-center gap-4 text-text-muted text-xs mb-4">
        {episodeData.airDate && (
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {format(new Date(episodeData.airDate), "PP", { locale: dateFnsLocale })}
          </span>
        )}
        {episodeData.runtime && (
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {episodeData.runtime}min
          </span>
        )}
      </div>

      {episodeData.overview && (
        <p className="text-text-muted text-sm mb-6">{episodeData.overview}</p>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => toggleEpisode.mutate({ season: seasonNum, episode: episodeNum, watched: !isWatched })}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isWatched
              ? "bg-success/20 text-success"
              : "bg-primary text-background hover:bg-primary-dark"
          }`}
        >
          {isWatched ? t("common.markedWatched") : t("common.markWatched")}
        </button>
        <button
          onClick={() => markUpTo.mutate({ season: seasonNum, episode: episodeNum, includePrevious: true })}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-surface text-text hover:bg-surface-light transition-colors"
        >
          {t("screens.showDetail.markUpTo")}
        </button>
        <button onClick={handleShare} className="p-2.5 bg-surface text-text-muted rounded-lg hover:text-text">
          <Share2 size={18} />
        </button>
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

      {/* Rating */}
      <div className="mb-6">
        <RatingCard
          showId={show.id}
          ratings={ratings}
          onRate={(value) => upsertRating.mutate({ value, episodeRef: { season: seasonNum, episode: episodeNum } })}
          episodeRef={{ season: seasonNum, episode: episodeNum }}
        />
      </div>

      {/* Comments preview */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/show/${tmdbId}/comments?season=${seasonNum}&episode=${episodeNum}`)}
          className="flex items-center gap-2 text-primary text-sm font-medium hover:underline mb-3"
        >
          <MessageSquare size={18} />
          {t("comments.title")} ({commentsData?.total ?? 0})
        </button>
        {commentsData && commentsData.comments.length > 0 && (
          <div className="space-y-2">
            {commentsData.comments.slice(0, 3).map((comment: Comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onLike={(id) => likeComment.mutate(id)}
                onUnlike={(id) => unlikeComment.mutate(id)}
                onDelete={(id) => deleteComment.mutate(id)}
                onEdit={(id, content) => updateComment.mutate({ id, content })}
                isOwnComment={comment.userId === userId}
              />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
