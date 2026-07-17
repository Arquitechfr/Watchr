import { useEffect } from "react";
import "./src/utils/atPolyfill";
import "./global.css";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { View, AppState } from "react-native";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { Snackbar } from "./src/components/Snackbar";
import { CustomAlert } from "./src/components/CustomAlert";
import { SplashScreen } from "./src/components/SplashScreen";
import { TrafficNoticeBanner } from "./src/components/TrafficNoticeBanner";
import { MaintenanceScreen } from "./src/screens/MaintenanceScreen";
import { useAppBootstrap } from "./src/hooks/useAppBootstrap";
import { useRemoteConfig } from "./src/hooks/useRemoteConfig";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { useTheme } from "./src/theme/useTheme";
import { Platform } from 'react-native';
import { HelmetProvider } from "react-helmet-async";
import { PostHogProvider } from "posthog-react-native";

import { errorTracker } from "./src/services/errorTracker";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

if (Platform.OS !== 'web') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

errorTracker.init();

function StatusBarContent() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: Platform.OS === "web",
      staleTime: 30_000,
    },
  },
});

const AppInner = () => {
  const { isReady } = useAppBootstrap(queryClient);
  const config = useRemoteConfig();

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = AppState.addEventListener("change", (status) => {
      focusManager.setFocused(status === "active");
    });
    return () => subscription.remove();
  }, []);

  if (isReady && config.maintenance_enabled) {
    return (
      <HelmetProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <ThemeProvider>
                <StatusBarContent />
                <KeyboardProvider>
                  <PostHogProvider
                    apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
                    options={{
                      host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
                      enableSessionReplay: true,
                      sessionReplayConfig: {
                        maskAllTextInputs: true,
                        maskAllImages: true,
                        captureLog: true,
                        captureNetworkTelemetry: true,
                      },
                    }}
                    autocapture={{ captureScreens: false }}
                  >
                    <ErrorBoundary>
                      <MaintenanceScreen />
                      <SplashScreen visible={!isReady} />
                    </ErrorBoundary>
                  </PostHogProvider>
                </KeyboardProvider>
              </ThemeProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <StatusBarContent />
            <KeyboardProvider>
              <PostHogProvider
                apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
                options={{
                  host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
                  enableSessionReplay: true,
                  sessionReplayConfig: {
                    maskAllTextInputs: true,
                    maskAllImages: true,
                    captureLog: true,
                    captureNetworkTelemetry: true,
                  },
                }}
                autocapture={{ captureScreens: false }}
              >
                <ErrorBoundary>
                  <View style={{ flex: 1, position: "relative" }}>
                    {isReady && <RootNavigator />}
                    {isReady && <TrafficNoticeBanner />}
                    <Snackbar />
                    <CustomAlert />
                  </View>
                  <SplashScreen visible={!isReady} />
                </ErrorBoundary>
              </PostHogProvider>
            </KeyboardProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
    </HelmetProvider>
  );
};

export default AppInner;
