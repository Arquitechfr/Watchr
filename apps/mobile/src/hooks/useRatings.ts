import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listRatingsForShow,
  upsertRating,
  deleteRating,
  UpsertRatingInput,
} from "../services/ratings.service";
import { log } from "../utils/logger";

const RATINGS_QUERY_KEY = "ratings";

export function useRatingsForShow(showId: string) {
  return useQuery({
    queryKey: [RATINGS_QUERY_KEY, showId],
    queryFn: () => listRatingsForShow(showId),
    enabled: Boolean(showId),
  });
}

export function useUpsertRating(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<UpsertRatingInput, "showId">) => upsertRating({ ...input, showId }),
    onMutate: (input) => {
      log("useRatings", "upsert mutate", { showId, value: input.value, episodeRef: input.episodeRef });
    },
    onSuccess: () => {
      log("useRatings", "upsert success", { showId });
      queryClient.invalidateQueries({ queryKey: [RATINGS_QUERY_KEY, showId] });
    },
    onError: (err) => {
      log("useRatings", "upsert error", { showId, err });
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
