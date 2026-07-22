import { log } from "../utils/logger";
import { Linking, Platform } from "react-native";

export interface DeepLinkTarget {
  screen: string;
  params: Record<string, unknown>;
}

export interface CustomUrlTarget {
  url: string;
}

export type PushTarget = DeepLinkTarget | CustomUrlTarget;

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
  chat: { navScreen: "Chat" },
  conversations: { navScreen: "ConversationList" },
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

export function resolvePushTarget(data: Record<string, unknown> | undefined): PushTarget | null {
  if (!data) return null;

  if (data.url && typeof data.url === "string") {
    return { url: data.url };
  }

  if (data.screen) {
    return resolveDeepLink(data);
  }

  return null;
}

export async function handlePushData(
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  const target = resolvePushTarget(data);
  if (!target) return false;

  if ("url" in target) {
    try {
      const supported = await Linking.canOpenURL(target.url);
      if (supported) {
        await Linking.openURL(target.url);
        return true;
      }
      if (Platform.OS === "web") {
        window.open(target.url, "_blank");
        return true;
      }
    } catch (err) {
      log("deepLinkHandler", "failed to open custom URL", { err, url: target.url });
    }
    return false;
  }

  return false;
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

export async function navigateToPushTarget(
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void },
  data: Record<string, unknown> | undefined,
): Promise<boolean> {
  if (!data) return false;

  if (data.url && typeof data.url === "string") {
    return handlePushData(data);
  }

  return navigateToDeepLink(navigation, data);
}
