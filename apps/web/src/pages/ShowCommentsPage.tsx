import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PageWrapper } from "../components/layout/PageWrapper";
import { DetailHeader } from "../components/DetailHeader";
import { CommentsSection } from "../components/Comments/CommentsSection";
import { NetworkError } from "../components/NetworkError";
import { Skeleton } from "../components/Skeleton";
import { useShowDetails } from "../hooks/useShowDetails";
import { useCommentsForShow } from "../hooks/useCommentsForShow";
import {
  useCreateComment,
  useLikeComment,
  useUnlikeComment,
  useDeleteComment,
  useUpdateComment,
} from "../hooks/useComments";
import { useCommentsRealtime } from "../hooks/useCommentsRealtime";
import type { CommentSort } from "../services/comments.service";
import { useI18n } from "../i18n/useI18n";

export function ShowCommentsPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();

  const seasonParam = searchParams.get("season");
  const episodeParam = searchParams.get("episode");
  const season = seasonParam ? Number(seasonParam) : undefined;
  const episode = episodeParam ? Number(episodeParam) : undefined;

  const [sort, setSort] = useState<CommentSort>("recent");

  const tmdbIdNum = Number(tmdbId);
  const { data: show, isLoading: isLoadingShow } = useShowDetails(tmdbIdNum);

  const query = { season, episode, sort };
  const { data: commentsData, isLoading: isLoadingComments, isError } = useCommentsForShow(
    show?.id ?? "",
    query,
  );

  useCommentsRealtime(show?.id ?? "");

  const createComment = useCreateComment(show?.id ?? "", query);
  const likeComment = useLikeComment(show?.id ?? "", query);
  const unlikeComment = useUnlikeComment(show?.id ?? "", query);
  const deleteComment = useDeleteComment(show?.id ?? "", query);
  const updateComment = useUpdateComment(show?.id ?? "", query);

  if (isLoadingShow) {
    return (
      <PageWrapper>
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-16 w-full" />
      </PageWrapper>
    );
  }

  if (!show) {
    return (
      <PageWrapper>
        <NetworkError />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="max-w-3xl">
      <DetailHeader title={`${t("comments.title")} - ${show.title}`} />

      {isLoadingComments ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError ? (
        <NetworkError />
      ) : (
        <CommentsSection
          comments={commentsData?.comments ?? []}
          sort={sort}
          onSortChange={setSort}
          onLike={(id) => likeComment.mutate(id)}
          onUnlike={(id) => unlikeComment.mutate(id)}
          onDelete={(id) => deleteComment.mutate(id)}
          onEdit={(id, content) => updateComment.mutate({ id, content })}
          onSubmit={(input) => createComment.mutate({ ...input, episodeRef: season && episode ? { season, episode } : undefined })}
        />
      )}
    </PageWrapper>
  );
}
