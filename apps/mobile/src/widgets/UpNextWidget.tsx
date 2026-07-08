import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface UpNextWidgetProps {
  showTitle?: string;
  episodeTitle?: string;
  episodeNumber?: string;
  noEpisodeText: string;
  titleText: string;
}

export function UpNextWidget({ showTitle, episodeTitle, episodeNumber, noEpisodeText, titleText }: UpNextWidgetProps) {
  if (!showTitle) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#1E1E1E',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
        }}
      >
        <TextWidget
          text={noEpisodeText}
          style={{ fontSize: 16, color: '#A0A0A0' }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1E1E1E',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
      }}
    >
      <TextWidget
        text={titleText}
        style={{ fontSize: 12, color: '#E50914', fontWeight: 'bold', marginBottom: 4 }}
      />
      <TextWidget
        text={showTitle}
        style={{ fontSize: 18, color: '#FFFFFF', fontWeight: 'bold', marginBottom: 2 }}
        maxLines={1}
        truncate="END"
      />
      <TextWidget
        text={`${episodeNumber} • ${episodeTitle}`}
        style={{ fontSize: 14, color: '#A0A0A0' }}
        maxLines={1}
        truncate="END"
      />
    </FlexWidget>
  );
}
