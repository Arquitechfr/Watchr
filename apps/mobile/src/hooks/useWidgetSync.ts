/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useUnwatchedShows } from "./useUnwatched";
import { useUpcomingEpisodes } from "./useUpcomingEpisodes";
import { useQuickMarkWatched } from "./useTracking";
import { useUserStats } from "./useStats";
import { useFavorites } from "./useFavorites";
import { useFriendsActivityFeed } from "./useSocial";
import { saveWidgetData, formatWidgetDataForStorage, WidgetData } from "../widgets/widgetDataHelper";
import {
  saveStatsWidgetData,
  saveTodayWidgetData,
  saveFavoritesWidgetData,
  saveFriendsWidgetData,
  type WidgetStatsData,
  type WidgetTodayData,
  type WidgetFavoritesData,
  type WidgetFriendsData,
  type WidgetFavoriteItem,
  type WidgetActivityItem,
} from "../widgets/widgetHelpers";
import { log } from "../utils/logger";

export function useWidgetSync() {
  const queryClient = useQueryClient();
  const { data: unwatchedData } = useUnwatchedShows();
  const { data: upcomingData } = useUpcomingEpisodes();
  const { data: statsData } = useUserStats();
  const { data: favoritesData } = useFavorites(undefined);
  const { data: friendsActivityData } = useFriendsActivityFeed();
  const quickMarkWatched = useQuickMarkWatched();
  const lastSyncRef = useRef<string>("");
  const lastStatsSyncRef = useRef<string>("");
  const lastFavoritesSyncRef = useRef<string>("");
  const lastFriendsSyncRef = useRef<string>("");

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
              headerTitle: translate(locale, "widgets.upNext.title") || "UP NEXT",
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

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!statsData) return;

    const stats: WidgetStatsData = {
      episodesWatched: statsData.episodesWatched ?? 0,
      hoursWatched: statsData.hoursWatched ?? 0,
      watchStreak: statsData.watchStreak ?? 0,
      tvCount: (statsData as { tvCount?: number }).tvCount ?? 0,
      movieCount: (statsData as { movieCount?: number }).movieCount ?? 0,
    };
    const serialized = JSON.stringify(stats);
    if (serialized === lastStatsSyncRef.current) return;
    lastStatsSyncRef.current = serialized;

    saveStatsWidgetData(stats).then(() => {
      try {
        const { requestWidgetUpdate } = require("react-native-android-widget");
        const { StatsWidget } = require("../widgets/StatsWidget");
        const { useLocaleStore } = require("../store/localeStore");
        const { translate } = require("../i18n/useI18n");
        const locale = useLocaleStore.getState().locale || "en";
        requestWidgetUpdate({
          widgetName: "Stats",
          renderWidget: () => React.createElement(StatsWidget, {
            data: stats,
            title: translate(locale, "widgets.stats.title") || "STATS",
            episodesLabel: translate(locale, "widgets.stats.episodes") || "Episodes",
            hoursLabel: translate(locale, "widgets.stats.hours") || "Hours",
            streakLabel: translate(locale, "widgets.stats.streak") || "Streak",
            showsLabel: translate(locale, "widgets.stats.shows") || "Shows",
            moviesLabel: translate(locale, "widgets.stats.movies") || "Movies",
            daysLabel: translate(locale, "widgets.stats.days") || "days",
          }),
          widgetNotFound: () => { log("useWidgetSync", "Stats widget not found"); },
        });
      } catch (e) {
        log("useWidgetSync", "Stats widget update error", { error: e });
      }
    });
  }, [statsData]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!upcomingData) return;

    const todayEpisodes = (upcomingData.today ?? []).map((ep: { showId: string; tmdbId: number; title: string; posterPath?: string; season: number; episode: number; name?: string; airDate?: string }) => ({
      showId: ep.showId, tmdbId: ep.tmdbId, title: ep.title,
      posterUrl: ep.posterPath ? `${require("../services/remoteConfig").remoteConfigService.getConfig().backend_url}/api/images/poster/w200${ep.posterPath}` : undefined,
      season: ep.season, episode: ep.episode, name: ep.name, airDate: ep.airDate,
    }));
    const todayData: WidgetTodayData = { episodes: todayEpisodes.slice(0, 5) };
    const serialized = JSON.stringify(todayData);
    if (serialized === lastSyncRef.current) return;

    saveTodayWidgetData(todayData).then(() => {
      try {
        const { requestWidgetUpdate } = require("react-native-android-widget");
        const { TodayWidget } = require("../widgets/TodayWidget");
        const { useLocaleStore } = require("../store/localeStore");
        const { translate } = require("../i18n/useI18n");
        const locale = useLocaleStore.getState().locale || "en";
        requestWidgetUpdate({
          widgetName: "Today",
          renderWidget: () => React.createElement(TodayWidget, {
            data: todayData,
            title: translate(locale, "widgets.today.title") || "TODAY",
            emptyText: translate(locale, "widgets.today.empty") || "No new episodes today",
          }),
          widgetNotFound: () => { log("useWidgetSync", "Today widget not found"); },
        });
      } catch (e) {
        log("useWidgetSync", "Today widget update error", { error: e });
      }
    });
  }, [upcomingData]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const pages = favoritesData?.pages ?? [];
    const items: WidgetFavoriteItem[] = [];
    for (const page of pages) {
      for (const item of page.data) {
        items.push({
          showId: item.showId, tmdbId: item.tmdbId, title: item.title,
          posterUrl: item.posterPath ? `${require("../services/remoteConfig").remoteConfigService.getConfig().backend_url}/api/images/poster/w200${item.posterPath}` : undefined,
          type: item.type,
        });
      }
    }
    if (items.length === 0) return;
    const favData: WidgetFavoritesData = { favorites: items.slice(0, 10) };
    const serialized = JSON.stringify(favData);
    if (serialized === lastFavoritesSyncRef.current) return;
    lastFavoritesSyncRef.current = serialized;

    saveFavoritesWidgetData(favData).then(() => {
      try {
        const { requestWidgetUpdate } = require("react-native-android-widget");
        const { FavoritesWidget } = require("../widgets/FavoritesWidget");
        const { useLocaleStore } = require("../store/localeStore");
        const { translate } = require("../i18n/useI18n");
        const locale = useLocaleStore.getState().locale || "en";
        requestWidgetUpdate({
          widgetName: "Favorites",
          renderWidget: () => React.createElement(FavoritesWidget, {
            data: favData,
            title: translate(locale, "widgets.favorites.title") || "FAVORITES",
            emptyText: translate(locale, "widgets.favorites.empty") || "No favorites yet",
          }),
          widgetNotFound: () => { log("useWidgetSync", "Favorites widget not found"); },
        });
      } catch (e) {
        log("useWidgetSync", "Favorites widget update error", { error: e });
      }
    });
  }, [favoritesData]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const pages = friendsActivityData?.pages ?? [];
    const items: WidgetActivityItem[] = [];
    for (const page of pages) {
      for (const item of page.data) {
        items.push({
          username: item.user?.username ?? "",
          avatarUrl: item.user?.avatarUrl,
          type: item.type,
          showTitle: item.show?.title ?? "",
          tmdbId: item.show?.tmdbId ?? 0,
          posterUrl: item.show?.posterPath ? `${require("../services/remoteConfig").remoteConfigService.getConfig().backend_url}/api/images/poster/w200${item.show.posterPath}` : undefined,
          ratingValue: item.rating?.value,
          commentContent: item.comment?.content,
          createdAt: item.createdAt,
        });
      }
    }
    if (items.length === 0) return;
    const friendsData: WidgetFriendsData = { activities: items.slice(0, 5) };
    const serialized = JSON.stringify(friendsData);
    if (serialized === lastFriendsSyncRef.current) return;
    lastFriendsSyncRef.current = serialized;

    saveFriendsWidgetData(friendsData).then(() => {
      try {
        const { requestWidgetUpdate } = require("react-native-android-widget");
        const { FriendsActivityWidget } = require("../widgets/FriendsActivityWidget");
        const { useLocaleStore } = require("../store/localeStore");
        const { translate } = require("../i18n/useI18n");
        const locale = useLocaleStore.getState().locale || "en";
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
          widgetNotFound: () => { log("useWidgetSync", "FriendsActivity widget not found"); },
        });
      } catch (e) {
        log("useWidgetSync", "FriendsActivity widget update error", { error: e });
      }
    });
  }, [friendsActivityData]);
}
