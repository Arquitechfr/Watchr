import "./global.css";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { Snackbar } from "./src/components/Snackbar";
import { CustomAlert } from "./src/components/CustomAlert";
import { SplashScreen } from "./src/components/SplashScreen";
import { useAppBootstrap } from "./src/hooks/useAppBootstrap";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { useTheme } from "./src/theme/useTheme";
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <StatusBarContent />
            <View style={{ flex: 1, position: "relative" }}>
              {isReady && <RootNavigator />}
              <Snackbar />
              <CustomAlert />
            </View>
            <SplashScreen visible={!isReady} />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(AppInner);
