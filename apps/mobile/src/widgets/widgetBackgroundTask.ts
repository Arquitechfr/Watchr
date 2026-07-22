/* eslint-disable @typescript-eslint/no-require-imports */
import { Platform } from "react-native";

const WIDGET_BACKGROUND_TASK = "widget-background-fetch";

let taskDefined = false;

function defineWidgetBackgroundTask() {
  if (taskDefined) return;
  taskDefined = true;

  const TaskManager = require("expo-task-manager");
  const BackgroundTask = require("expo-background-task");

  TaskManager.defineTask(WIDGET_BACKGROUND_TASK, async () => {
    try {
      const { remoteConfigService } = require("../services/remoteConfig");
      try { await remoteConfigService.init(); } catch { /* ignore — fallback to defaults */ }

      const React = require("react");
      const { requestWidgetUpdate } = require("react-native-android-widget");

      const { useLocaleStore } = require("../store/localeStore");
      const { translate } = require("../i18n/useI18n");
      const locale = useLocaleStore.getState().locale || "en";

      const { fetchWidgetData, getWidgetActiveTab } = require("./widgetDataHelper");
      const {
        fetchStatsWidgetData,
        fetchTodayWidgetData,
        fetchFavoritesWidgetData,
        fetchFriendsWidgetData,
      } = require("./widgetHelpers");

      const { UpNextWidget } = require("./UpNextWidget");
      const { StatsWidget } = require("./StatsWidget");
      const { TodayWidget } = require("./TodayWidget");
      const { FavoritesWidget } = require("./FavoritesWidget");
      const { FriendsActivityWidget } = require("./FriendsActivityWidget");

      const activeTab = await getWidgetActiveTab();
      const data = await fetchWidgetData();
      const episodes = activeTab === "unwatched" ? (data?.unwatched ?? []) : (data?.upcoming ?? []);

      requestWidgetUpdate({
        widgetName: "UpNext",
        renderWidget: () => React.createElement(UpNextWidget, {
          activeTab,
          episodes,
          headerTitle: translate(locale, "widgets.upNext.title") || "UP NEXT",
          tabUnwatchedLabel: translate(locale, "widgets.upNext.tabUnwatched") || "Unwatched",
          tabUpcomingLabel: translate(locale, "widgets.upNext.tabUpcoming") || "Upcoming",
          emptyUnwatchedText: translate(locale, "widgets.upNext.emptyUnwatched") || "All caught up!",
          emptyUpcomingText: translate(locale, "widgets.upNext.emptyUpcoming") || "No upcoming episodes",
          markWatchedLabel: translate(locale, "widgets.upNext.markWatched") || "Watched",
        }),
        widgetNotFound: () => {},
      });

      const statsData = await fetchStatsWidgetData();
      requestWidgetUpdate({
        widgetName: "Stats",
        renderWidget: () => React.createElement(StatsWidget, {
          data: statsData,
          title: translate(locale, "widgets.stats.title") || "STATS",
          episodesLabel: translate(locale, "widgets.stats.episodes") || "Episodes",
          hoursLabel: translate(locale, "widgets.stats.hours") || "Hours",
          streakLabel: translate(locale, "widgets.stats.streak") || "Streak",
          showsLabel: translate(locale, "widgets.stats.shows") || "Shows",
          moviesLabel: translate(locale, "widgets.stats.movies") || "Movies",
          daysLabel: translate(locale, "widgets.stats.days") || "days",
        }),
        widgetNotFound: () => {},
      });

      const todayData = await fetchTodayWidgetData();
      requestWidgetUpdate({
        widgetName: "Today",
        renderWidget: () => React.createElement(TodayWidget, {
          data: todayData,
          title: translate(locale, "widgets.today.title") || "TODAY",
          emptyText: translate(locale, "widgets.today.empty") || "No new episodes today",
        }),
        widgetNotFound: () => {},
      });

      const favoritesData = await fetchFavoritesWidgetData();
      requestWidgetUpdate({
        widgetName: "Favorites",
        renderWidget: () => React.createElement(FavoritesWidget, {
          data: favoritesData,
          title: translate(locale, "widgets.favorites.title") || "FAVORITES",
          emptyText: translate(locale, "widgets.favorites.empty") || "No favorites yet",
        }),
        widgetNotFound: () => {},
      });

      const friendsData = await fetchFriendsWidgetData();
      requestWidgetUpdate({
        widgetName: "FriendsActivity",
        renderWidget: () => React.createElement(FriendsActivityWidget, {
          data: friendsData,
          title: translate(locale, "widgets.friends.title") || "FRIENDS",
          emptyText: translate(locale, "widgets.friends.empty") || "No recent activity",
          ratedLabel: translate(locale, "widgets.friends.rated") || "rated",
          commentedLabel: translate(locale, "widgets.friends.commented") || "commented on",
          addedLabel: translate(locale, "widgets.friends.added") || "added",
        }),
        widgetNotFound: () => {},
      });

      return BackgroundTask.BackgroundTaskResult.NewData;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerWidgetBackgroundTask(): Promise<void> {
  if (Platform.OS === "web") return;

  defineWidgetBackgroundTask();

  const BackgroundTask = require("expo-background-task");
  const TaskManager = require("expo-task-manager");

  const isRegistered = await TaskManager.isTaskRegisteredAsync(WIDGET_BACKGROUND_TASK);
  if (isRegistered) return;

  await BackgroundTask.registerTaskAsync(WIDGET_BACKGROUND_TASK, {
    minimumInterval: 60 * 15,
  });
}

export async function unregisterWidgetBackgroundTask(): Promise<void> {
  if (Platform.OS === "web") return;

  const BackgroundTask = require("expo-background-task");
  try {
    await BackgroundTask.unregisterTaskAsync(WIDGET_BACKGROUND_TASK);
  } catch {
    // ignore — task may not be registered
  }
}
