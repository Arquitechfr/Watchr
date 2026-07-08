import { useQuery } from "@tanstack/react-query";
import { getLibrary, type LibraryResponse } from "../services/library.service";

export function useLibrary(type: "tv" | "movie" | undefined, page: number = 1, limit: number = 20) {
  return useQuery<LibraryResponse>({
    queryKey: ["tracking", "library", type, page, limit],
    queryFn: () => getLibrary(type, page, limit),
    staleTime: 30_000,
  });
}
