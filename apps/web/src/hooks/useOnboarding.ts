import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding, type Me } from "../services/auth.service";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeOnboarding(),
    onMutate: () => {
      queryClient.setQueryData<Me>(["me"], (old: Me | undefined) => {
        if (!old) return old;
        return { ...old, hasCompletedOnboarding: true };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err) => {
      console.error("useCompleteOnboarding error", err);
    },
  });
}
