import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding, Me } from "../services/auth.service";
import { log } from "../utils/logger";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeOnboarding(),
    onMutate: () => {
      log("useOnboarding", "completeOnboarding mutate");
      queryClient.setQueryData<Me>(["me"], (old: Me | undefined) => {
        if (!old) return old;
        return { ...old, hasCompletedOnboarding: true };
      });
    },
    onSuccess: () => {
      log("useOnboarding", "completeOnboarding success");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err) => {
      log("useOnboarding", "completeOnboarding error", { err });
    },
  });
}
