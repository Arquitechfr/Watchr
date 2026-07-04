import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Linking } from "react-native";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuthStore } from "../store/authStore";
import { colors } from "../theme/colors";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import { ShowDetailScreen } from "../screens/ShowDetailScreen";
import { ShowCommentsScreen } from "../screens/ShowCommentsScreen";
import { EpisodeDetailScreen } from "../screens/EpisodeDetailScreen";
import { ImportScreen } from "../screens/ImportScreen";
import { ExportScreen } from "../screens/ExportScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { ProfileLanguageScreen } from "../screens/profile/ProfileLanguageScreen";
import { ProfileNotificationsScreen } from "../screens/profile/ProfileNotificationsScreen";
import { ProfileAboutScreen } from "../screens/profile/ProfileAboutScreen";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { log } from "../utils/logger";
import { isStandaloneBuild } from "../utils/platform";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ShowDetail: { tmdbId: number; title: string };
  ShowComments: { showId: string; title: string; season?: number; episode?: number };
  EpisodeDetail: { showId: string; tmdbId: number; season: number; episodeNumber: number; title?: string };
  Import: undefined;
  Export: undefined;
  Library: { tab?: "tv" | "movie" } | undefined;
  EditProfile: undefined;
  ProfileLanguage: undefined;
  ProfileNotifications: undefined;
  ProfileAbout: undefined;
  ResetPassword: { token: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isHydrated, isAuthenticated, hydrate } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const navigationRef = useRef<any>(null);

  usePushNotifications();

  useEffect(() => {
    async function init() {
      await hydrate();
      setIsReady(true);
    }
    init();
  }, [hydrate]);

  useEffect(() => {
    if (!isStandaloneBuild()) return;

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

  if (!isReady || !isHydrated) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <NavigationContainer linking={linking} ref={navigationRef as any}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ShowDetail" component={ShowDetailScreen} />
            <Stack.Screen name="ShowComments" component={ShowCommentsScreen} />
            <Stack.Screen name="EpisodeDetail" component={EpisodeDetailScreen} />
            <Stack.Screen name="Import" component={ImportScreen} />
            <Stack.Screen name="Export" component={ExportScreen} />
            <Stack.Screen name="Library" component={LibraryScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ProfileLanguage" component={ProfileLanguageScreen} />
            <Stack.Screen name="ProfileNotifications" component={ProfileNotificationsScreen} />
            <Stack.Screen name="ProfileAbout" component={ProfileAboutScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
