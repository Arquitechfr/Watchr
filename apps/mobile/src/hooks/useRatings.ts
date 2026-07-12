import { useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRatingsForShow,
  upsertRating,
  deleteRating,
  UpsertRatingInput,
  RatingsForShow,
  UpsertRatingResponse,
} from "../services/ratings.service";
import { log } from "../utils/logger";
import { useAuthStore } from "../store/authStore";

const RATINGS_QUERY_KEY = "ratings";
const RATING_DEBOUNCE_MS = 500;

export function useRatingsForShow(showId: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [RATINGS_QUERY_KEY, showId],
    queryFn: () => listRatingsForShow(showId),
    enabled: isHydrated && Boolean(showId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpsertRating(showId: string) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInputRef = useRef<Omit<UpsertRatingInput, "showId"> | null>(null);

  const mutation = useMutation<UpsertRatingResponse, Error, Omit<UpsertRatingInput, "showId">, { previousRatings: RatingsForShow | undefined }>({
    mutationFn: (input: Omit<UpsertRatingInput, "showId">) => upsertRating({ ...input, showId }),
    onMutate: async (input) => {
      log("useRatings", "upsert mutate", { showId, value: input.value, episodeRef: input.episodeRef });

      await queryClient.cancelQueries({ queryKey: [RATINGS_QUERY_KEY, showId] });
      const previousRatings = queryClient.getQueryData<RatingsForShow>([RATINGS_QUERY_KEY, showId]);

      queryClient.setQueryData<RatingsForShow>([RATINGS_QUERY_KEY, showId], (old: RatingsForShow | undefined) => {
        if (!old) return old;

        if (input.episodeRef) {
          const { season, episode } = input.episodeRef;
          const existingIndex = old.user.episodes.findIndex(
            (e: { season: number; episode: number; value: number }) => e.season === season && e.episode === episode,
          );
          const newEpisode = { season, episode, value: input.value };
          const nextEpisodes =
            existingIndex >= 0
              ? old.user.episodes.map((e: { season: number; episode: number; value: number }, i: number) =>
                  i === existingIndex ? newEpisode : e,
                )
              : [...old.user.episodes, newEpisode];
          return { ...old, user: { ...old.user, episodes: nextEpisodes } };
        }

        return { ...old, user: { ...old.user, show: input.value } };
      });

      return { previousRatings };
    },
    onError: (err, _input, context) => {
      log("useRatings", "upsert error", { showId, err });
      if (context?.previousRatings) {
        queryClient.setQueryData([RATINGS_QUERY_KEY, showId], context.previousRatings);
      }
    },
    onSuccess: (data) => {
      log("useRatings", "upsert success", { showId, communityShow: data.community.show });
      queryClient.setQueryData<RatingsForShow>([RATINGS_QUERY_KEY, showId], (old: RatingsForShow | undefined) => {
        if (!old) return old;
        return { ...old, community: data.community };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RATINGS_QUERY_KEY, showId] });
    },
  });

  const debouncedMutate = useCallback(
    (input: Omit<UpsertRatingInput, "showId">, options?: Parameters<typeof mutation.mutate>[1]) => {
      pendingInputRef.current = input;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const pending = pendingInputRef.current;
        if (pending) {
          pendingInputRef.current = null;
          mutation.mutate(pending, options);
        }
      }, RATING_DEBOUNCE_MS);
    },
    [mutation],
  );

  return {
    ...mutation,
    mutate: debouncedMutate,
  };
}

export function useDeleteRating(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRating(id),
    onMutate: (id) => {
      log("useRatings", "delete mutate", { showId, id });
    },
    onSuccess: () => {
      log("useRatings", "delete success", { showId });
      queryClient.invalidateQueries({ queryKey: [RATINGS_QUERY_KEY, showId] });
    },
    onError: (err) => {
      log("useRatings", "delete error", { showId, err });
    },
  });
}
