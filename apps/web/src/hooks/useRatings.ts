import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertRating, deleteRating, type UpsertRatingInput } from "../services/ratings.service";

export function useUpsertRating(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<UpsertRatingInput, "showId">) =>
      upsertRating({ ...input, showId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ratings", showId] });
    },
  });
}

export function useDeleteRating(showId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRating(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ratings", showId] });
    },
  });
}
