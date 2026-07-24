import { api } from "./api";

export interface FollowStatus {
  isFollowing: boolean;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowUserItem {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PublicProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  bannerUrl?: string;
  createdAt: string;
  activityVisibility: "private" | "public";
  isFollowing: boolean;
  isMutualFriend: boolean;
  followers: number;
  following: number;
  bio?: string;
  translatedBio?: string;
  isBioTranslated?: boolean;
  favoriteGenres?: string[];
}

export type ActivityFeedItemType = "rating" | "watchlist_add" | "comment";

export interface ActivityFeedItem {
  type: ActivityFeedItemType;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  show: {
    tmdbId: number;
    title: string;
    posterPath?: string;
    type: "tv" | "movie";
  };
  createdAt: string;
  rating?: { value: number };
  comment?: { content: string; commentId: string };
  watchlistAdd?: { count: number; titles: string[] };
}

export interface ActivityFeedResult {
  data: ActivityFeedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function followUser(userId: string): Promise<FollowStatus> {
  const response = await api.post<FollowStatus>(`/social/follow/${userId}`);
  return response.data;
}

export async function unfollowUser(userId: string): Promise<void> {
  await api.delete(`/social/follow/${userId}`);
}

export async function getFollowStatus(userId: string): Promise<FollowStatus> {
  const response = await api.get<FollowStatus>(`/social/follow/${userId}/status`);
  return response.data;
}

export async function listFollowers(
  userId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResult<FollowUserItem>> {
  const response = await api.get<PaginatedResult<FollowUserItem>>(
    `/social/followers/${userId}`,
    { params: { page, limit } },
  );
  return response.data;
}

export async function listFollowing(
  userId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResult<FollowUserItem>> {
  const response = await api.get<PaginatedResult<FollowUserItem>>(
    `/social/following/${userId}`,
    { params: { page, limit } },
  );
  return response.data;
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const response = await api.get<PublicProfile>(`/social/users/${username}`);
  return response.data;
}

export interface PublicUserStats {
  tvCount: number;
  movieCount: number;
  episodesWatched: number;
  hoursWatched: number;
  commentsCount: number;
  reactionsCount: number;
  likesCount: number;
  genreBreakdown: { id: number; name: string; count: number }[];
  recentActivity: {
    commentId: string;
    content: string;
    showId: string;
    showTitle: string;
    tmdbId: number;
    createdAt: string;
  }[];
}

export async function getPublicUserStats(username: string): Promise<PublicUserStats> {
  const response = await api.get<PublicUserStats>(`/social/users/${username}/stats`);
  return response.data;
}

export async function searchUsers(
  query: string,
  page = 1,
  limit = 10,
): Promise<PaginatedResult<FollowUserItem>> {
  const response = await api.get<PaginatedResult<FollowUserItem>>("/social/search", {
    params: { q: query, page, limit },
  });
  return response.data;
}

export async function getFriendsActivityFeed(
  page = 1,
  limit = 20,
  types?: string[],
): Promise<ActivityFeedResult> {
  const response = await api.get<ActivityFeedResult>("/social/activity", {
    params: { page, limit, types: types?.join(",") },
  });
  return response.data;
}

export async function updateActivityVisibility(
  visibility: "private" | "public",
): Promise<{ activityVisibility: "private" | "public" }> {
  const response = await api.patch<{ activityVisibility: "private" | "public" }>(
    "/social/me/activity-visibility",
    { activityVisibility: visibility },
  );
  return response.data;
}
