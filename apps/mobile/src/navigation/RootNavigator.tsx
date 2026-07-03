import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ShowDetail: { tmdbId: number; title: string };
  ShowComments: { showId: string; title: string; season?: number; episode?: number };
  EpisodeDetail: { showId: string; tmdbId: number; season: number; episodeNumber: number; title?: string };
  Import: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isHydrated, isAuthenticated, hydrate } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      await hydrate();
      setIsReady(true);
    }
    init();
  }, [hydrate]);

  if (!isReady || !isHydrated) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ShowDetail" component={ShowDetailScreen} />
            <Stack.Screen name="ShowComments" component={ShowCommentsScreen} />
            <Stack.Screen name="EpisodeDetail" component={EpisodeDetailScreen} />
            <Stack.Screen name="Import" component={ImportScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
