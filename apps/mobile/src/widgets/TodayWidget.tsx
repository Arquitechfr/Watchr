import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { WidgetTodayData, WidgetEpisode } from './widgetHelpers';

export interface TodayWidgetProps {
  data: WidgetTodayData;
  title: string;
  emptyText: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COLORS: Record<string, any> = {
  bg: '#1A1614',
  surface: '#252019',
  surfaceLight: '#2D2620',
  primary: '#C65D3A',
  text: '#F5F0EB',
  textMuted: '#A89B91',
  border: '#3D352D',
  borderSubtle: '#2D2620',
};

function TodayEpisodeRow({ episode }: { episode: WidgetEpisode }) {
  const episodeLabel = `S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')}`;
  const subtitle = episode.name ? `${episodeLabel} • ${episode.name}` : episodeLabel;
  const deepLink = `watchr://episode?showId=${episode.showId}&tmdbId=${episode.tmdbId}&season=${episode.season}&episodeNumber=${episode.episode}`;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLink }}
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.borderSubtle,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 6,
      }}
    >
      {episode.posterUrl ? (
        <ImageWidget
          image={episode.posterUrl as `https://${string}`}
          imageWidth={40}
          imageHeight={60}
          radius={4}
          style={{
            marginRight: 10,
          }}
        />
      ) : null}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
        }}
      >
        <TextWidget
          text={episode.title}
          style={{
            fontSize: 13,
            color: COLORS.text,
            fontWeight: 'bold',
            marginBottom: 2,
          }}
        />
        <TextWidget
          text={subtitle}
          style={{
            fontSize: 11,
            color: COLORS.textMuted,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

export function TodayWidget(props: TodayWidgetProps) {
  const { data } = props;
  const episodes = data.episodes;

  return (
    <FlexWidget
      style={{
        backgroundColor: COLORS.bg,
        borderRadius: 16,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <TextWidget
          text={props.title}
          style={{
            fontSize: 14,
            color: COLORS.primary,
            fontWeight: 'bold',
            letterSpacing: 1,
          }}
        />
      </FlexWidget>

      {episodes.length > 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'column',
          }}
        >
          {episodes.map((episode, index) => (
            <TodayEpisodeRow key={index} episode={episode} />
          ))}
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            paddingVertical: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="🎬"
            style={{ fontSize: 28, marginBottom: 8 }}
          />
          <TextWidget
            text={props.emptyText}
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
