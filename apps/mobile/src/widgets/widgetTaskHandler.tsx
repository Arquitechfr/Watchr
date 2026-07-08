import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { UpNextWidget, UpNextWidgetProps } from './UpNextWidget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocaleStore } from '../store/localeStore';
import { translate } from '../i18n/useI18n';

const nameToWidget: Record<string, React.FC<any>> = {
  UpNext: UpNextWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName];

  if (!Widget) {
    return;
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      let widgetProps: UpNextWidgetProps = {
        showTitle: undefined,
        episodeTitle: undefined,
        episodeNumber: undefined,
        noEpisodeText: 'No episode',
        titleText: 'UP NEXT',
      };

      try {
        const locale = useLocaleStore.getState().locale || 'en';
        widgetProps.noEpisodeText = translate(locale, 'widgets.upNext.noEpisode') || widgetProps.noEpisodeText;
        widgetProps.titleText = translate(locale, 'widgets.upNext.title') || widgetProps.titleText;
      } catch (e) {
        console.error('Error fetching i18n for widget', e);
      }

      try {
        const upNextData = await AsyncStorage.getItem('upNextData');
        if (upNextData) {
          const parsed = JSON.parse(upNextData);
          widgetProps.showTitle = parsed.showTitle;
          widgetProps.episodeTitle = parsed.episodeTitle;
          widgetProps.episodeNumber = parsed.episodeNumber;
        } else {
          // Fallback or demo state
          widgetProps.showTitle = 'House of the Dragon';
          widgetProps.episodeTitle = 'Son for a Son';
          widgetProps.episodeNumber = 'S02E01';
        }
      } catch (e) {
        console.error('Error reading upNextData for widget', e);
      }

      props.renderWidget(
        <Widget {...widgetProps} />
      );
      break;

    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      break;
  }
}
