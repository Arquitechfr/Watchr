import { useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  useFonts,
  Outfit_100Thin,
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import { useLocaleStore } from "../store/localeStore";
import { useThemeStore } from "../store/themeStore";
import { useAuthStore } from "../store/authStore";
import { getMe } from "../services/auth.service";
import { remoteConfigService } from "../services/remoteConfig";
import { prefetchSeriesData } from "../utils/prefetch";
import { log } from "../utils/logger";
import { registerWidgetBackgroundTask, unregisterWidgetBackgroundTask } from "../widgets/widgetBackgroundTask";
import { getDateFnsLocale } from "../i18n/useI18n";

const BOOTSTRAP_TIMEOUT_MS = 6000;

export function useAppBootstrap(queryClient: QueryClient) {
  const [fontsLoaded] = useFonts({
    Outfit_100Thin,
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });
  const [storesReady, setStoresReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function bootstrap() {
      log("Bootstrap", "start");

      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          log("Bootstrap", "timeout reached");
          resolve();
        }, BOOTSTRAP_TIMEOUT_MS);
      });

      const storesPromise = (async () => {
        await remoteConfigService.init();

        await Promise.allSettled([
          useLocaleStore.getState().hydrate(),
          useThemeStore.getState().hydrate(),
          useAuthStore.getState().hydrate(),
        ]);

        const locale = useLocaleStore.getState().locale;
        await getDateFnsLocale(locale);

        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) {
          try {
            await queryClient.fetchQuery({
              queryKey: ["me"],
              queryFn: getMe,
              staleTime: Infinity,
            });
            log("Bootstrap", "getMe prefetched");
          } catch (error) {
            log("Bootstrap", "getMe prefetch failed — will retry in RootNavigator", error);
            queryClient.removeQueries({ queryKey: ["me"] });
          }

          await prefetchSeriesData(queryClient);
        }

        log("Bootstrap", "stores ready");

        const { isAuthenticated: isAuthed } = useAuthStore.getState();
        if (isAuthed) {
          registerWidgetBackgroundTask().catch((err) =>
            log("Bootstrap", "widget background task register failed", err),
          );
        }
      })();

      await Promise.race([storesPromise, timeoutPromise]);

      if (mounted) setStoresReady(true);
    }

    const unsubAuth = useAuthStore.subscribe((state) => {
      if (state.isAuthenticated) {
        registerWidgetBackgroundTask().catch(() => {});
      } else {
        unregisterWidgetBackgroundTask().catch(() => {});
      }
    });

    bootstrap();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      unsubAuth();
    };
  }, [queryClient]);

  return { isReady: storesReady && fontsLoaded };
}
