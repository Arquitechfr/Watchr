import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  followUser,
  unfollowUser,
  getFollowStatus,
  getPublicProfile,
  searchUsers,
  listFollowing,
  getFriendsActivityFeed,
  updateActivityVisibility,
  type ActivityFeedResult,
  type PublicProfile,
  type PaginatedResult,
  type FollowUserItem,
} from "../services/social.service";
import { useAuthStore } from "../store/authStore";
import { log } from "../utils/logger";

export function useFollowStatus(userId: string | undefined) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useQuery({
    queryKey: ["social", "status", userId],
    queryFn: () => getFollowStatus(userId!),
    enabled: isHydrated && !!userId,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => followUser(userId),
    onSuccess: (_data, userId) => {
      log("useSocial", "follow success", { userId });
      queryClient.invalidateQueries({ queryKey: ["social", "status", userId] });
      queryClient.invalidateQueries({ queryKey: ["social", "activity"] });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => unfollowUser(userId),
    onSuccess: (_data, userId) => {
      log("useSocial", "unfollow success", { userId });
      queryClient.invalidateQueries({ queryKey: ["social", "status", userId] });
      queryClient.invalidateQueries({ queryKey: ["social", "activity"] });
    },
  });
}

export function usePublicProfile(username: string | undefined) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useQuery<PublicProfile>({
    queryKey: ["social", "profile", username],
    queryFn: () => getPublicProfile(username!),
    enabled: isHydrated && !!username,
  });
}

export function useFriendsActivityFeed(types?: string[]) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useInfiniteQuery<ActivityFeedResult>({
    queryKey: ["social", "activity", types],
    queryFn: ({ pageParam }) => getFriendsActivityFeed((pageParam as number) ?? 1, 20, types),
    initialPageParam: 1,
    enabled: isHydrated,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
  });
}

export function useUpdateActivityVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visibility: "private" | "public") => updateActivityVisibility(visibility),
    onSuccess: () => {
      log("useSocial", "activity visibility updated");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useFollowing(userId: string | null) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useInfiniteQuery<PaginatedResult<FollowUserItem>>({
    queryKey: ["social", "following", userId],
    queryFn: ({ pageParam }) => listFollowing(userId!, (pageParam as number) ?? 1, 20),
    initialPageParam: 1,
    enabled: isHydrated && !!userId,
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
  });
}

export function useSearchUsers(query: string) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return useQuery<PaginatedResult<FollowUserItem>>({
    queryKey: ["social", "search", query],
    queryFn: () => searchUsers(query),
    enabled: isHydrated && query.length >= 2,
  });
}
