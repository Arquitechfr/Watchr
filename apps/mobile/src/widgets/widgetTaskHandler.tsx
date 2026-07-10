import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { UpNextWidget, UpNextWidgetProps } from './UpNextWidget';
import { useLocaleStore } from '../store/localeStore';
import { translate } from '../i18n/useI18n';
import {
  fetchWidgetData,
  getWidgetActiveTab,
  setWidgetActiveTab,
  markEpisodeWatched,
  WidgetTab,
  WidgetData,
} from './widgetDataHelper';

const nameToWidget: Record<string, React.FC<any>> = {
  UpNext: UpNextWidget,
};

function getI18nProps(): Pick<UpNextWidgetProps, 'tabUnwatchedLabel' | 'tabUpcomingLabel' | 'emptyUnwatchedText' | 'emptyUpcomingText' | 'markWatchedLabel'> {
  try {
    const locale = useLocaleStore.getState().locale || 'en';
    return {
      tabUnwatchedLabel: translate(locale, 'widgets.upNext.tabUnwatched') || 'Unwatched',
      tabUpcomingLabel: translate(locale, 'widgets.upNext.tabUpcoming') || 'Upcoming',
      emptyUnwatchedText: translate(locale, 'widgets.upNext.emptyUnwatched') || 'All caught up!',
      emptyUpcomingText: translate(locale, 'widgets.upNext.emptyUpcoming') || 'No upcoming episodes',
      markWatchedLabel: translate(locale, 'widgets.upNext.markWatched') || 'Watched',
    };
  } catch {
    return {
      tabUnwatchedLabel: 'Unwatched',
      tabUpcomingLabel: 'Upcoming',
      emptyUnwatchedText: 'All caught up!',
      emptyUpcomingText: 'No upcoming episodes',
      markWatchedLabel: 'Watched',
    };
  }
}

async function renderWidgetWithData(
  props: WidgetTaskHandlerProps,
  Widget: React.FC<any>,
  activeTab: WidgetTab,
  data?: WidgetData,
): Promise<void> {
  const i18nProps = getI18nProps();
  const episodes = activeTab === 'unwatched' ? (data?.unwatched ?? []) : (data?.upcoming ?? []);

  const widgetProps: UpNextWidgetProps = {
    activeTab,
    episodes,
    ...i18nProps,
  };

  props.renderWidget(<Widget {...widgetProps} />);
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName];

  if (!Widget) {
    return;
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const activeTab = await getWidgetActiveTab();
      const data = await fetchWidgetData();
      await renderWidgetWithData(props, Widget, activeTab, data);
      break;
    }

    case 'WIDGET_CLICK': {
      const clickAction = props.clickAction;
      const clickActionData = props.clickActionData as Record<string, unknown> | undefined;

      if (clickAction === 'SWITCH_TAB') {
        const newTab = (clickActionData?.tab as WidgetTab) ?? 'unwatched';
        await setWidgetActiveTab(newTab);
        const data = await fetchWidgetData();
        await renderWidgetWithData(props, Widget, newTab, data);
      } else if (clickAction === 'MARK_WATCHED') {
        const showId = clickActionData?.showId as string;
        const season = clickActionData?.season as number;
        const episode = clickActionData?.episode as number;

        if (showId && season != null && episode != null) {
          await markEpisodeWatched(showId, season, episode);
          const activeTab = await getWidgetActiveTab();
          const data = await fetchWidgetData();
          await renderWidgetWithData(props, Widget, activeTab, data);
        }
      }
      break;
    }

    case 'WIDGET_DELETED':
    default:
      break;
  }
}
