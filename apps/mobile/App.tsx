import "./src/utils/atPolyfill";
import "./global.css";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { View } from "react-native";
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

if (Platform.OS !== 'web') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

Sentry.init({
  dsn: "https://bf2e227cd3abf6f8e316e40c13f874dc@o4511684973428736.ingest.de.sentry.io/4511684992893008",
  debug: __DEV__,
});

function StatusBarContent() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  },
});

const AppInner = () => {
  const { isReady } = useAppBootstrap(queryClient);
  const config = useRemoteConfig();

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
                    <MaintenanceScreen />
                    <SplashScreen visible={!isReady} />
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
                <View style={{ flex: 1, position: "relative" }}>
                  {isReady && <RootNavigator />}
                  {isReady && <TrafficNoticeBanner />}
                  <Snackbar />
                  <CustomAlert />
                </View>
                <SplashScreen visible={!isReady} />
              </PostHogProvider>
            </KeyboardProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
    </HelmetProvider>
  );
};

export default Sentry.wrap(AppInner);
