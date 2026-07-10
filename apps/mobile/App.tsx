import "./global.css";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { Snackbar } from "./src/components/Snackbar";
import { CustomAlert } from "./src/components/CustomAlert";
import { SplashScreen } from "./src/components/SplashScreen";
import { TrafficNoticeBanner } from "./src/components/TrafficNoticeBanner";
import { MaintenanceScreen } from "./src/screens/MaintenanceScreen";
import { useAppBootstrap } from "./src/hooks/useAppBootstrap";
import { useLocaleInvalidation } from "./src/hooks/useLocaleInvalidation";
import { useRemoteConfig } from "./src/hooks/useRemoteConfig";
import { ReactNode } from "react";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { useTheme } from "./src/theme/useTheme";
import { Platform } from 'react-native';
import { HelmetProvider } from "react-helmet-async";

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

function LocaleInvalidationGate({ children }: { children: ReactNode }) {
  const { isRefetching } = useLocaleInvalidation();
  return (
    <>
      {children}
      {isRefetching && (
        <View style={{ position: "absolute", top: 50, left: 0, right: 0, alignItems: "center", zIndex: 999 }}>
          <ActivityIndicator size="small" />
        </View>
      )}
    </>
  );
}

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
                <MaintenanceScreen />
                <SplashScreen visible={!isReady} />
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
        <LocaleInvalidationGate>
        <SafeAreaProvider>
          <ThemeProvider>
            <StatusBarContent />
            <View style={{ flex: 1, position: "relative" }}>
              {isReady && <RootNavigator />}
              {isReady && <TrafficNoticeBanner />}
              <Snackbar />
              <CustomAlert />
            </View>
            <SplashScreen visible={!isReady} />
          </ThemeProvider>
        </SafeAreaProvider>
        </LocaleInvalidationGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
    </HelmetProvider>
  );
};

export default Sentry.wrap(AppInner);
