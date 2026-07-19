import { log } from "../utils/logger";

export interface DeepLinkTarget {
  screen: string;
  params: Record<string, unknown>;
}

const SCREEN_MAP: Record<string, { navScreen: string; paramMap?: Record<string, string> }> = {
  home: { navScreen: "Main", paramMap: {} },
  movies: { navScreen: "Main", paramMap: { screen: "Movies" } },
  search: { navScreen: "Main", paramMap: { screen: "Search" } },
  news: { navScreen: "Main", paramMap: { screen: "News" } },
  profile: { navScreen: "Main", paramMap: { screen: "Profile" } },
  show: { navScreen: "ShowDetail" },
  comments: { navScreen: "ShowComments" },
  episode: { navScreen: "EpisodeDetail" },
  import: { navScreen: "Import" },
  export: { navScreen: "Export" },
  library: { navScreen: "Library" },
  editProfile: { navScreen: "EditProfile" },
  profileLanguage: { navScreen: "ProfileLanguage" },
  profileNotifications: { navScreen: "ProfileNotifications" },
  profileAbout: { navScreen: "ProfileAbout" },
  profileAppearance: { navScreen: "ProfileAppearance" },
  profileData: { navScreen: "ProfileData" },
  profileContact: { navScreen: "ProfileContact" },
  profileApiKeys: { navScreen: "ProfileApiKeys" },
  publicProfile: { navScreen: "PublicProfile" },
  friendsActivity: { navScreen: "FriendsActivity" },
  userSearch: { navScreen: "UserSearch" },
  newsArticle: { navScreen: "NewsArticleDetail" },
};

export function resolveDeepLink(data: Record<string, unknown> | undefined): DeepLinkTarget | null {
  if (!data?.screen) return null;

  const screen = String(data.screen);
  const mapping = SCREEN_MAP[screen];
  if (!mapping) {
    log("deepLinkHandler", "unknown deep link screen", { screen });
    return null;
  }

  const params: Record<string, unknown> = {};

  if (mapping.paramMap) {
    for (const [key, value] of Object.entries(mapping.paramMap)) {
      params[key] = value;
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === "screen") continue;
    params[key] = value;
  }

  return { screen: mapping.navScreen, params };
}

export function navigateToDeepLink(
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void },
  data: Record<string, unknown> | undefined,
): boolean {
  const target = resolveDeepLink(data);
  if (!target) return false;

  try {
    navigation.navigate(target.screen, target.params);
    return true;
  } catch (err) {
    log("deepLinkHandler", "navigation failed", { err, target });
    return false;
  }
}
