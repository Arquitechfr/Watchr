import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { UpNextWidget, UpNextWidgetProps } from './UpNextWidget';
import { StatsWidget, StatsWidgetProps } from './StatsWidget';
import { TodayWidget, TodayWidgetProps } from './TodayWidget';
import { FavoritesWidget, FavoritesWidgetProps } from './FavoritesWidget';
import { FriendsActivityWidget, FriendsActivityWidgetProps } from './FriendsActivityWidget';
import { useLocaleStore } from '../store/localeStore';
import { translate } from '../i18n/useI18n';
import type { SupportedLocale } from '../i18n/translations';
import {
  fetchWidgetData,
  getWidgetActiveTab,
  setWidgetActiveTab,
  markEpisodeWatched,
  WidgetTab,
} from './widgetDataHelper';
import {
  fetchStatsWidgetData,
  fetchTodayWidgetData,
  fetchFavoritesWidgetData,
  fetchFriendsWidgetData,
} from './widgetHelpers';
import { remoteConfigService } from '../services/remoteConfig';

const nameToWidget: Record<string, React.FC<any>> = {
  UpNext: UpNextWidget,
  Stats: StatsWidget,
  Today: TodayWidget,
  Favorites: FavoritesWidget,
  FriendsActivity: FriendsActivityWidget,
};

function getLocale(): SupportedLocale {
  try {
    const locale = useLocaleStore.getState().locale || 'en';
    return locale as SupportedLocale;
  } catch {
    return 'en';
  }
}

function getUpNextI18nProps() {
  const locale = getLocale();
  try {
    return {
      headerTitle: translate(locale, 'widgets.upNext.title') || 'UP NEXT',
      tabUnwatchedLabel: translate(locale, 'widgets.upNext.tabUnwatched') || 'Unwatched',
      tabUpcomingLabel: translate(locale, 'widgets.upNext.tabUpcoming') || 'Upcoming',
      emptyUnwatchedText: translate(locale, 'widgets.upNext.emptyUnwatched') || 'All caught up!',
      emptyUpcomingText: translate(locale, 'widgets.upNext.emptyUpcoming') || 'No upcoming episodes',
      markWatchedLabel: translate(locale, 'widgets.upNext.markWatched') || 'Watched',
    };
  } catch {
    return {
      headerTitle: 'UP NEXT', tabUnwatchedLabel: 'Unwatched', tabUpcomingLabel: 'Upcoming',
      emptyUnwatchedText: 'All caught up!', emptyUpcomingText: 'No upcoming episodes', markWatchedLabel: 'Watched',
    };
  }
}

function getStatsI18nProps(): Pick<StatsWidgetProps, 'title' | 'episodesLabel' | 'hoursLabel' | 'streakLabel' | 'showsLabel' | 'moviesLabel' | 'daysLabel'> {
  const locale = getLocale();
  try {
    return {
      title: translate(locale, 'widgets.stats.title') || 'STATS',
      episodesLabel: translate(locale, 'widgets.stats.episodes') || 'Episodes',
      hoursLabel: translate(locale, 'widgets.stats.hours') || 'Hours',
      streakLabel: translate(locale, 'widgets.stats.streak') || 'Streak',
      showsLabel: translate(locale, 'widgets.stats.shows') || 'Shows',
      moviesLabel: translate(locale, 'widgets.stats.movies') || 'Movies',
      daysLabel: translate(locale, 'widgets.stats.days') || 'days',
    };
  } catch {
    return {
      title: 'STATS', episodesLabel: 'Episodes', hoursLabel: 'Hours',
      streakLabel: 'Streak', showsLabel: 'Shows', moviesLabel: 'Movies', daysLabel: 'days',
    };
  }
}

function getTodayI18nProps(): Pick<TodayWidgetProps, 'title' | 'emptyText'> {
  const locale = getLocale();
  try {
    return {
      title: translate(locale, 'widgets.today.title') || 'TODAY',
      emptyText: translate(locale, 'widgets.today.empty') || 'No new episodes today',
    };
  } catch {
    return { title: 'TODAY', emptyText: 'No new episodes today' };
  }
}

function getFavoritesI18nProps(): Pick<FavoritesWidgetProps, 'title' | 'emptyText'> {
  const locale = getLocale();
  try {
    return {
      title: translate(locale, 'widgets.favorites.title') || 'FAVORITES',
      emptyText: translate(locale, 'widgets.favorites.empty') || 'No favorites yet',
    };
  } catch {
    return { title: 'FAVORITES', emptyText: 'No favorites yet' };
  }
}

function getFriendsI18nProps(): Pick<FriendsActivityWidgetProps, 'title' | 'emptyText' | 'ratedLabel' | 'commentedLabel' | 'addedLabel'> {
  const locale = getLocale();
  try {
    return {
      title: translate(locale, 'widgets.friends.title') || 'FRIENDS',
      emptyText: translate(locale, 'widgets.friends.empty') || 'No recent activity',
      ratedLabel: translate(locale, 'widgets.friends.rated') || 'rated',
      commentedLabel: translate(locale, 'widgets.friends.commented') || 'commented on',
      addedLabel: translate(locale, 'widgets.friends.added') || 'added',
    };
  } catch {
    return {
      title: 'FRIENDS', emptyText: 'No recent activity',
      ratedLabel: 'rated', commentedLabel: 'commented on', addedLabel: 'added',
    };
  }
}

async function renderUpNextWidget(props: WidgetTaskHandlerProps, Widget: React.FC<any>) {
  const activeTab = await getWidgetActiveTab();
  const data = await fetchWidgetData();
  const i18nProps = getUpNextI18nProps();
  const episodes = activeTab === 'unwatched' ? (data?.unwatched ?? []) : (data?.upcoming ?? []);
  props.renderWidget(<Widget activeTab={activeTab} episodes={episodes} {...i18nProps} />);
}

async function renderStatsWidget(props: WidgetTaskHandlerProps, Widget: React.FC<any>) {
  const data = await fetchStatsWidgetData();
  props.renderWidget(<Widget data={data} {...getStatsI18nProps()} />);
}

async function renderTodayWidget(props: WidgetTaskHandlerProps, Widget: React.FC<any>) {
  const data = await fetchTodayWidgetData();
  props.renderWidget(<Widget data={data} {...getTodayI18nProps()} />);
}

async function renderFavoritesWidget(props: WidgetTaskHandlerProps, Widget: React.FC<any>) {
  const data = await fetchFavoritesWidgetData();
  props.renderWidget(<Widget data={data} {...getFavoritesI18nProps()} />);
}

async function renderFriendsWidget(props: WidgetTaskHandlerProps, Widget: React.FC<any>) {
  const data = await fetchFriendsWidgetData();
  props.renderWidget(<Widget data={data} {...getFriendsI18nProps()} />);
}

const widgetRenderers: Record<string, (props: WidgetTaskHandlerProps, Widget: React.FC<any>) => Promise<void>> = {
  UpNext: renderUpNextWidget,
  Stats: renderStatsWidget,
  Today: renderTodayWidget,
  Favorites: renderFavoritesWidget,
  FriendsActivity: renderFriendsWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName];
  const renderer = widgetRenderers[widgetInfo.widgetName];

  if (!Widget || !renderer) {
    return;
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      try { await remoteConfigService.init(); } catch { /* ignore — fallback to defaults */ }
      await renderer(props, Widget);
      break;
    }

    case 'WIDGET_CLICK': {
      const clickAction = props.clickAction;
      const clickActionData = props.clickActionData as Record<string, unknown> | undefined;

      if (clickAction === 'SWITCH_TAB') {
        const newTab = (clickActionData?.tab as WidgetTab) ?? 'unwatched';
        await setWidgetActiveTab(newTab);
        try { await remoteConfigService.init(); } catch { /* ignore */ }
        await renderer(props, Widget);
      } else if (clickAction === 'MARK_WATCHED') {
        const showId = clickActionData?.showId as string;
        const season = clickActionData?.season as number;
        const episode = clickActionData?.episode as number;

        if (showId && season != null && episode != null) {
          await markEpisodeWatched(showId, season, episode);
          try { await remoteConfigService.init(); } catch { /* ignore */ }
          await renderer(props, Widget);
        }
      }
      break;
    }

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
