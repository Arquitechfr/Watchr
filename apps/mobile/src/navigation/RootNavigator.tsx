import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { NetworkError } from "../components/NetworkError";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuthStore } from "../store/authStore";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
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
import { ProfileSettingsScreen } from "../screens/profile/ProfileSettingsScreen";
import { ProfileDataScreen } from "../screens/profile/ProfileDataScreen";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useThemeSync } from "../hooks/useThemeSync";
import { log } from "../utils/logger";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";
import { NewsArticleDetailScreen } from "../screens/NewsArticleDetailScreen";
import { getMe, Me, completeOnboarding } from "../services/auth.service";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
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
  ResetPassword: { token: string };
  NewsArticleDetail: { link: string; title: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated } = useAuthStore();
  const navigationRef = useRef<any>(null);

  const meQuery = useQuery<Me>({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: isAuthenticated,
    staleTime: Infinity,
  });

  const me = meQuery.data;
  const isMeError = meQuery.isError;

  usePushNotifications();
  useThemeSync();

  useEffect(() => {
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
    prefixes: ["watchr://"],
    config: {
      screens: {
        Auth: "",
        ResetPassword: "reset-password",
        ShowDetail: "show",
        ShowComments: "comments",
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

  return (
    <NavigationContainer linking={linking} ref={navigationRef as any}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            {showOnboarding ? (
              <Stack.Screen name="Onboarding">
                {() => (
                  <OnboardingStack
                    onComplete={() => {
                      meQuery.refetch();
                    }}
                    onSkip={() => {
                      completeOnboarding()
                        .then(() => meQuery.refetch())
                        .catch(() => meQuery.refetch());
                    }}
                  />
                )}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Main" component={MainTabs} />
            )}
            <Stack.Screen name="ShowDetail" component={ShowDetailScreen} />
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
            <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
            <Stack.Screen name="ProfileData" component={ProfileDataScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="NewsArticleDetail" component={NewsArticleDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
