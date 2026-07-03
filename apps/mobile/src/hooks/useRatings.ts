import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRatingsForShow,
  upsertRating,
  deleteRating,
  UpsertRatingInput,
  RatingsForShow,
} from "../services/ratings.service";
import { log } from "../utils/logger";
import { useAuthStore } from "../store/authStore";

const RATINGS_QUERY_KEY = "ratings";

export function useRatingsForShow(showId: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  return useQuery({
    queryKey: [RATINGS_QUERY_KEY, showId],
    queryFn: () => listRatingsForShow(showId),
    enabled: isHydrated && Boolean(showId),
  });
}

export function useUpsertRating(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<UpsertRatingInput, "showId">) => upsertRating({ ...input, showId }),
    onMutate: async (input) => {
      log("useRatings", "upsert mutate", { showId, value: input.value, episodeRef: input.episodeRef });

      await queryClient.cancelQueries({ queryKey: [RATINGS_QUERY_KEY, showId] });
      const previousRatings = queryClient.getQueryData<RatingsForShow>([RATINGS_QUERY_KEY, showId]);

      queryClient.setQueryData<RatingsForShow>([RATINGS_QUERY_KEY, showId], (old: RatingsForShow | undefined) => {
        if (!old) return old;

        if (input.episodeRef) {
          const { season, episode } = input.episodeRef;
          const existingIndex = old.episodes.findIndex(
            (e: { season: number; episode: number; value: number }) => e.season === season && e.episode === episode,
          );
          const newEpisode = { season, episode, value: input.value };
          const nextEpisodes =
            existingIndex >= 0
              ? old.episodes.map((e: { season: number; episode: number; value: number }, i: number) =>
                  i === existingIndex ? newEpisode : e,
                )
              : [...old.episodes, newEpisode];
          return { ...old, episodes: nextEpisodes };
        }

        return { ...old, show: input.value };
      });

      return { previousRatings };
    },
    onError: (err, _input, context) => {
      log("useRatings", "upsert error", { showId, err });
      if (context?.previousRatings) {
        queryClient.setQueryData([RATINGS_QUERY_KEY, showId], context.previousRatings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RATINGS_QUERY_KEY, showId] });
    },
  });
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
