import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useUnwatchedShows } from "./useUnwatched";
import { useUpcomingEpisodes } from "./useUpcomingEpisodes";
import { useQuickMarkWatched } from "./useTracking";
import { saveWidgetData, formatWidgetDataForStorage, WidgetData } from "../widgets/widgetDataHelper";
import { log } from "../utils/logger";

export function useWidgetSync() {
  const queryClient = useQueryClient();
  const { data: unwatchedData } = useUnwatchedShows();
  const { data: upcomingData } = useUpcomingEpisodes();
  const quickMarkWatched = useQuickMarkWatched();
  const lastSyncRef = useRef<string>("");

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!unwatchedData && !upcomingData) return;

    const shows = unwatchedData?.shows ?? [];
    const upcoming = upcomingData ?? { today: [], thisWeek: [], nextWeek: [], later: [] };

    const widgetData: WidgetData = formatWidgetDataForStorage(shows, upcoming);
    const serialized = JSON.stringify(widgetData);

    if (serialized === lastSyncRef.current) return;
    lastSyncRef.current = serialized;

    saveWidgetData(widgetData).then(() => {
      try {
        const { requestWidgetUpdate } = require("react-native-android-widget");
        const { UpNextWidget } = require("../widgets/UpNextWidget");
        const { useLocaleStore } = require("../store/localeStore");
        const { translate } = require("../i18n/useI18n");
        const { getWidgetActiveTab } = require("../widgets/widgetDataHelper");

        getWidgetActiveTab().then((activeTab: "unwatched" | "upcoming") => {
          const locale = useLocaleStore.getState().locale || "en";
          const episodes = activeTab === "unwatched" ? widgetData.unwatched : widgetData.upcoming;

          requestWidgetUpdate({
            widgetName: "UpNext",
            renderWidget: () => React.createElement(UpNextWidget, {
              activeTab,
              episodes,
              tabUnwatchedLabel: translate(locale, "widgets.upNext.tabUnwatched") || "Unwatched",
              tabUpcomingLabel: translate(locale, "widgets.upNext.tabUpcoming") || "Upcoming",
              emptyUnwatchedText: translate(locale, "widgets.upNext.emptyUnwatched") || "All caught up!",
              emptyUpcomingText: translate(locale, "widgets.upNext.emptyUpcoming") || "No upcoming episodes",
              markWatchedLabel: translate(locale, "widgets.upNext.markWatched") || "Watched",
            }),
            widgetNotFound: () => {
              log("useWidgetSync", "widget not found on home screen");
            },
          });
        });
      } catch (e) {
        log("useWidgetSync", "requestWidgetUpdate error", { error: e });
      }
    });
  }, [unwatchedData, upcomingData, queryClient]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (quickMarkWatched.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["unwatched"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming"] });
    }
  }, [quickMarkWatched.isSuccess, queryClient]);
}
