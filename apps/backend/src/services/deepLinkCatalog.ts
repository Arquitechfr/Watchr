export interface DeepLinkParamDef {
  name: string;
  type: "string" | "number";
  required: boolean;
  description?: string;
}

export interface DeepLinkScreenDef {
  screen: string;
  label: string;
  params: DeepLinkParamDef[];
}

export const DEEP_LINK_SCREENS: DeepLinkScreenDef[] = [
  { screen: "home", label: "Home (Series)", params: [] },
  { screen: "movies", label: "Movies", params: [] },
  { screen: "search", label: "Search", params: [] },
  { screen: "news", label: "News", params: [] },
  { screen: "profile", label: "Profile", params: [] },
  {
    screen: "show",
    label: "Show Detail",
    params: [
      { name: "tmdbId", type: "number", required: true, description: "TMDB ID of the show" },
    ],
  },
  {
    screen: "comments",
    label: "Comments",
    params: [
      { name: "showId", type: "string", required: true, description: "Internal show ID" },
      { name: "season", type: "number", required: false },
      { name: "episode", type: "number", required: false },
    ],
  },
  {
    screen: "episode",
    label: "Episode Detail",
    params: [
      { name: "showId", type: "string", required: true },
      { name: "tmdbId", type: "number", required: true },
      { name: "season", type: "number", required: true },
      { name: "episodeNumber", type: "number", required: true },
    ],
  },
  { screen: "import", label: "Import", params: [] },
  { screen: "export", label: "Export", params: [] },
  {
    screen: "library",
    label: "Library",
    params: [
      { name: "tab", type: "string", required: false, description: "'tv' or 'movie'" },
    ],
  },
  { screen: "editProfile", label: "Edit Profile", params: [] },
  { screen: "profileLanguage", label: "Profile Language", params: [] },
  { screen: "profileNotifications", label: "Profile Notifications", params: [] },
  { screen: "profileAbout", label: "Profile About", params: [] },
  { screen: "profileAppearance", label: "Profile Appearance", params: [] },
  { screen: "profileData", label: "Profile Data", params: [] },
  { screen: "profileContact", label: "Profile Contact", params: [] },
  { screen: "profileApiKeys", label: "Profile API Keys", params: [] },
  {
    screen: "publicProfile",
    label: "Public Profile",
    params: [
      { name: "username", type: "string", required: true },
    ],
  },
  { screen: "friendsActivity", label: "Friends Activity", params: [] },
  { screen: "userSearch", label: "User Search", params: [] },
  {
    screen: "newsArticle",
    label: "News Article",
    params: [
      { name: "link", type: "string", required: true },
      { name: "title", type: "string", required: true },
    ],
  },
];

const SCREEN_PATHS: Record<string, string> = {
  home: "",
  movies: "movies",
  search: "search",
  news: "news",
  profile: "profile",
  show: "show",
  comments: "comments",
  episode: "episode",
  import: "import",
  export: "export",
  library: "library",
  editProfile: "edit-profile",
  profileLanguage: "profile/language",
  profileNotifications: "profile/notifications",
  profileAbout: "profile/about",
  profileAppearance: "profile/appearance",
  profileData: "profile/data",
  profileContact: "profile/contact",
  profileApiKeys: "profile/api-keys",
  publicProfile: "u",
  friendsActivity: "friends",
  userSearch: "search-users",
  newsArticle: "news-article",
};

export function buildDeepLinkUrl(
  screen: string,
  params?: Record<string, unknown>,
  webBaseUrl?: string,
): string {
  const path = SCREEN_PATHS[screen] ?? "";
  const base = webBaseUrl ?? "https://app.watchr.me";

  if (!params || Object.keys(params).length === 0) {
    return path ? `${base}/${path}` : base;
  }

  if (screen === "publicProfile") {
    return `${base}/u/${encodeURIComponent(String(params.username))}`;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  return path ? `${base}/${path}${qs ? `?${qs}` : ""}` : `${base}${qs ? `?${qs}` : ""}`;
}

export function buildPushData(
  screen?: string,
  params?: Record<string, unknown>,
  customUrl?: string,
): Record<string, unknown> | undefined {
  if (!screen && !customUrl) return undefined;
  if (!screen && customUrl) return { url: customUrl };
  const data: Record<string, unknown> = { screen };
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        data[key] = value;
      }
    }
  }
  return data;
}

export function buildCtaUrl(
  customUrl?: string,
  deepLinkScreen?: string,
  deepLinkParams?: Record<string, unknown>,
): string | undefined {
  if (customUrl) return customUrl;
  if (deepLinkScreen) return buildDeepLinkUrl(deepLinkScreen, deepLinkParams);
  return undefined;
}
