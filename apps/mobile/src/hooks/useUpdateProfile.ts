import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../services/auth.service";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: { bio?: string; favoriteGenres?: string[] }) => updateProfile(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
