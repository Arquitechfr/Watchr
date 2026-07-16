import { useEffect, useRef, useState } from "react";
import { Linking, Platform, useWindowDimensions, View } from "react-native";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkError } from "../components/NetworkError";
import { ScreenContainer } from "../components/ScreenContainer";
import { DesktopSidebar } from "../components/DesktopSidebar";
import { useAuthStore } from "../store/authStore";
import { useRemoteConfig } from "../hooks/useRemoteConfig";
import { AuthStack } from "./AuthStack";
import { AuthDisabledScreen } from "../screens/AuthDisabledScreen";
import { MainTabs, MainTabsParamList } from "./MainTabs";
import { OnboardingStack } from "./OnboardingStack";
import { ShowDetailScreen } from "../screens/ShowDetailScreen";
import { ShowCommentsScreen } from "../screens/ShowCommentsScreen";
import { CommentThreadScreen } from "../screens/CommentThreadScreen";
import { EpisodeDetailScreen } from "../screens/EpisodeDetailScreen";
import { ImportScreen } from "../screens/ImportScreen";
import { ImportReviewScreen } from "../screens/ImportReviewScreen";
import { ExportScreen } from "../screens/ExportScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { ProfileLanguageScreen } from "../screens/profile/ProfileLanguageScreen";
import { ProfileNotificationsScreen } from "../screens/profile/ProfileNotificationsScreen";
import { ProfileAboutScreen } from "../screens/profile/ProfileAboutScreen";
import { ProfileAppearanceScreen } from "../screens/profile/ProfileAppearanceScreen";
import { ProfileDataScreen } from "../screens/profile/ProfileDataScreen";
import { ProfileContactScreen } from "../screens/profile/ProfileContactScreen";
import { PublicProfileScreen } from "../screens/PublicProfileScreen";
import { FriendsActivityScreen } from "../screens/FriendsActivityScreen";
import { UserSearchScreen } from "../screens/UserSearchScreen";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useThemeSync } from "../hooks/useThemeSync";
import { log } from "../utils/logger";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { MagicLinkScreen } from "../screens/auth/MagicLinkScreen";
import { NewsArticleDetailScreen } from "../screens/NewsArticleDetailScreen";
import { getMe, Me, completeOnboarding } from "../services/auth.service";

export type RootStackParamList = {
  Auth: undefined;
  Main: { screen?: keyof MainTabsParamList } | undefined;
  Onboarding: undefined;
  ShowDetail: { tmdbId: number; title: string };
  ShowComments: { showId: string; title: string; season?: number; episode?: number };
  CommentThread: { commentId: string; showId: string; title: string; season?: number; episode?: number };
  EpisodeDetail: { showId: string; tmdbId: number; season: number; episodeNumber: number; title?: string };
  Import: undefined;
  ImportReview: { jobId: string };
  Export: undefined;
  Library: { tab?: "tv" | "movie" } | undefined;
  EditProfile: undefined;
  ProfileLanguage: undefined;
  ProfileNotifications: undefined;
  ProfileAbout: undefined;
  ProfileAppearance: undefined;
  ProfileSettings: undefined;
  ProfileData: undefined;
  ProfileContact: undefined;
  PublicProfile: { username: string };
  FriendsActivity: undefined;
  UserSearch: undefined;
  ResetPassword: { token: string };
  MagicLink: { token: string };
  NewsArticleDetail: { link: string; title: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type TabName = "Series" | "Movies" | "Search" | "News" | "Profile";

export function RootNavigator() {
  const { isAuthenticated, userId } = useAuthStore();
  const config = useRemoteConfig();
  const navigationRef = useRef<any>(null);
  const routeNameRef = useRef<string | undefined>(undefined);
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 768;
  const [activeTab, setActiveTab] = useState<TabName>("Series");

  const meQuery = useQuery<Me>({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: isAuthenticated,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.removeQueries({ queryKey: ["me"] });
    }
  }, [isAuthenticated, queryClient]);

  const me = meQuery.data;
  const isMeError = meQuery.isError;

  usePushNotifications(!!me?.hasCompletedOnboarding);
  useThemeSync();

  useEffect(() => {
    if (isAuthenticated && userId) {
      posthog?.identify(userId);
    } else if (!isAuthenticated) {
      posthog?.reset();
    }
  }, [isAuthenticated, userId, posthog]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let subscription: import("expo-notifications").Subscription | undefined;

    (async () => {
      const Notifications = await import("expo-notifications");
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          screen?: string;
          showId?: string;
          tmdbId?: number;
          season?: number;
          episode?: number;
        };
        log("RootNavigator", "push notification tapped", { data });

        if (!data?.screen || !navigationRef.current) return;

        if (data.screen === "comments" && data.showId) {
          navigationRef.current.navigate("ShowComments", {
            showId: data.showId,
            title: "",
            season: data.season,
            episode: data.episode,
          });
        } else if (data.screen === "show" && data.tmdbId) {
          navigationRef.current.navigate("ShowDetail", {
            tmdbId: data.tmdbId,
            title: "",
          });
        }
      });
    })();

    return () => subscription?.remove();
  }, [isAuthenticated]);

  const linking: LinkingOptions<RootStackParamList> = {
    prefixes:
      Platform.OS === "web"
        ? [window.location.origin]
        : ["watchr://", "https://app.watchr.me"],
    config: {
      screens: {
        Auth: "",
        ResetPassword: "reset-password",
        MagicLink: "auth/magic-link",
        ShowDetail: "show",
        ShowComments: "comments",
        EpisodeDetail: "episode",
        Main: {
          path: "main",
          screens: {
            Series: "series",
            Movies: "movies",
            Search: "search",
            News: "news",
            Profile: "profile",
          },
        } as any,
      },
    },
  };

  if (isAuthenticated && isMeError && !me) {
    return (
      <ScreenContainer>
        <NetworkError onRetry={() => meQuery.refetch()} />
      </ScreenContainer>
    );
  }

  const showOnboarding = isAuthenticated && me && !me.hasCompletedOnboarding;
  const showSidebar = isDesktopWeb && isAuthenticated && !showOnboarding;

  function handleTabPress(tab: TabName) {
    setActiveTab(tab);
    navigationRef.current?.navigate("Main", { screen: tab });
  }

  const stackContent = (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            {showOnboarding ? (
              <Stack.Screen name="Onboarding">
                {() => (
                  <OnboardingStack
                    onComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
                      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
                      meQuery.refetch();
                    }}
                    onSkip={() => {
                      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
                      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
                      completeOnboarding("welcome_skip")
                        .then(() => meQuery.refetch())
                        .catch(() => meQuery.refetch());
                    }}
                  />
                )}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Main" component={MainTabs} />
            )}
            <Stack.Screen
              name="ShowDetail"
              component={ShowDetailScreen}
              options={{
                animation: "fade",
                presentation: "card",
              }}
            />
            <Stack.Screen name="ShowComments" component={ShowCommentsScreen} />
            <Stack.Screen name="CommentThread" component={CommentThreadScreen} />
            <Stack.Screen name="EpisodeDetail" component={EpisodeDetailScreen} />
            <Stack.Screen name="Import" component={ImportScreen} />
            <Stack.Screen name="ImportReview" component={ImportReviewScreen} />
            <Stack.Screen name="Export" component={ExportScreen} />
            <Stack.Screen name="Library" component={LibraryScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ProfileLanguage" component={ProfileLanguageScreen} />
            <Stack.Screen name="ProfileNotifications" component={ProfileNotificationsScreen} />
            <Stack.Screen name="ProfileAbout" component={ProfileAboutScreen} />
            <Stack.Screen name="ProfileAppearance" component={ProfileAppearanceScreen} />
            <Stack.Screen name="ProfileData" component={ProfileDataScreen} />
            <Stack.Screen name="ProfileContact" component={ProfileContactScreen} />
            <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
            <Stack.Screen name="FriendsActivity" component={FriendsActivityScreen} />
            <Stack.Screen name="UserSearch" component={UserSearchScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="MagicLink" component={MagicLinkScreen} />
            <Stack.Screen name="NewsArticleDetail" component={NewsArticleDetailScreen} />
          </>
        ) : config.auth_enabled ? (
          <>
            <Stack.Screen name="Auth" component={AuthStack} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="MagicLink" component={MagicLinkScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthDisabledScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="MagicLink" component={MagicLinkScreen} />
          </>
        )}
    </Stack.Navigator>
  );

  return (
    <NavigationContainer
      linking={linking}
      ref={navigationRef as any}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
        if (previousRouteName !== currentRouteName && currentRouteName) {
          posthog?.capture("$screen", { $screen_name: currentRouteName });
        }
        routeNameRef.current = currentRouteName;

        if (isDesktopWeb) {
          const rootState = navigationRef.current?.getRootState();
          if (rootState && rootState.index !== undefined) {
            const currentRoute = rootState.routes[rootState.index];
            if (currentRoute?.name === "Main" && currentRoute.state) {
              const tabState = currentRoute.state as any;
              if (tabState.index !== undefined) {
                const tabName = tabState.routes[tabState.index]?.name as TabName;
                if (tabName) setActiveTab(tabName);
              }
            }
          }
        }
      }}
    >
      {showSidebar ? (
        <View className="flex-1 flex-row bg-background">
          <DesktopSidebar
            activeTab={activeTab}
            onTabPress={handleTabPress}
            onNavigate={(route) => navigationRef.current?.navigate(route)}
          />
          <View className="flex-1 bg-background md:pl-2">{stackContent}</View>
        </View>
      ) : stackContent}
    </NavigationContainer>
  );
}
